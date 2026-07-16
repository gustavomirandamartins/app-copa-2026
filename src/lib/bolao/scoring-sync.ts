import type { createAdminClient } from '@/lib/supabase/admin';
import { calculateMatchPoints } from './scoring';
import { calculateExtraPoints } from './extra-scoring';
import {
  EXTRA_COUNTING_MATCH_IDS,
  type ExtraPredictionRow,
  type ExtraResultRow,
} from './extra-bets';
import {
  ROUND_ORDER,
  ROUND_MATCH_IDS,
  roundKeyForMatch,
  roundBonusForPlace,
  type RoundKey,
} from './rounds';
import {
  detectRoundTieGroups,
  applyDraw,
  type DrawRecord,
  type RoundRow as TiebreakRoundRow,
} from './tiebreak';

type Admin = ReturnType<typeof createAdminClient>;

interface PredRow {
  id: string;
  user_id: string;
  match_id: string;
  home_score_guess: number | null;
  away_score_guess: number | null;
  penalty_winner_id: string | null;
  points_earned: number | null;
  base_points: number | null;
}

/**
 * Lê TODOS os palpites paginando de 1000 em 1000. O PostgREST limita cada
 * resposta a 1000 linhas; sem paginar, palpites além disso somem do cálculo
 * (e a pontuação de quem está no fim da tabela fica errada).
 */
async function fetchAllPredictions(admin: Admin): Promise<PredRow[]> {
  const pageSize = 1000;
  const all: PredRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('predictions')
      .select('id, user_id, match_id, home_score_guess, away_score_guess, penalty_winner_id, points_earned, base_points')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`scoring: ler predictions: ${error.message}`);
    const rows = (data ?? []) as PredRow[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

/** Acúmulo de uma rodada para um usuário (pontos + desempates). */
interface RoundStat {
  points: number; // pontos do palpite na rodada (com multiplicador)
  exact: number; // desempate: nº de placares exatos × 5
  diff: number; // desempate: nº de acertos de saldo × 3
}

/**
 * Aplica a pontuação no banco (gancho do sync). Idempotente: recalcula tudo
 * do zero, então rodar de novo não duplica pontos.
 *
 * Etapas:
 *   1. Pontua cada palpite de jogo finalizado (com multiplicador "turbinado").
 *      Guarda base_points (antes do multiplicador) para os desempates.
 *   2. Classifica cada rodada com critérios de desempate (pontos → placar exato
 *      → saldo) e premia em camadas: 1º +50, 2º +30, 3º +20, 4º +10, 5º +5.
 *      O admin fica fora de competição (sem colocação nem bônus).
 *   3. Apura os palpites extras (semis = teste; 3º/final = valendo) em
 *      extra_predictions.points_earned e profiles.extra_points.
 *   4. total_score = palpites + correção manual + bônus de rodada + indicação
 *      + extras (só 3º lugar e final).
 */
export async function applyScoring(admin: Admin): Promise<{ updatedPredictions: number }> {
  // Todas as partidas (precisamos do status de todas para saber se a rodada
  // encerrou, não só das finalizadas).
  const { data: allMatches, error: matchesErr } = await admin
    .from('matches')
    .select('id, status, home_score, away_score, home_penalties, away_penalties, home_team_id, away_team_id');
  if (matchesErr) throw new Error(`scoring: ler matches: ${matchesErr.message}`);

  const statusById = new Map<string, string>();
  const finishedScore = new Map<string, { home: number; away: number; penaltyWinnerId: string | null }>();
  for (const m of allMatches ?? []) {
    statusById.set(m.id, m.status);
    if (m.status === 'finished' && m.home_score != null && m.away_score != null) {
      let penaltyWinnerId: string | null = null;
      if (m.home_score === m.away_score && m.home_penalties != null && m.away_penalties != null) {
        penaltyWinnerId = m.home_penalties > m.away_penalties ? m.home_team_id : m.away_team_id;
      }
      finishedScore.set(m.id, { home: m.home_score, away: m.away_score, penaltyWinnerId });
    }
  }

  // Multiplicadores por jogo (jogos turbinados). Ausente → x1.
  const { data: settings } = await admin
    .from('match_settings')
    .select('match_id, score_multiplier');
  const multiplierByMatch = new Map<string, number>();
  for (const s of settings ?? []) {
    multiplierByMatch.set(s.match_id, s.score_multiplier ?? 1);
  }

  // Todos os palpites (paginado — pode passar de 1000 linhas).
  const preds = await fetchAllPredictions(admin);

  // earned[user] = soma dos pontos dos palpites (jogos finalizados).
  const earnedByUser = new Map<string, number>();
  // roundStats[round][user] = pontos + desempates do usuário naquela rodada.
  const roundStats = new Map<RoundKey, Map<string, RoundStat>>();
  // Usuários que têm palpite em cada rodada (para montar a tabela da rodada).
  const usersWithPick = new Map<RoundKey, Set<string>>();
  for (const k of ROUND_ORDER) {
    roundStats.set(k, new Map());
    usersWithPick.set(k, new Set());
  }

  const affectedUsers = new Set<string>();
  let updatedPredictions = 0;

  for (const p of preds ?? []) {
    affectedUsers.add(p.user_id);
    const finished = finishedScore.get(p.match_id);
    const multiplier = multiplierByMatch.get(p.match_id) ?? 1;
    const baseWithoutPenalty = finished
      ? calculateMatchPoints(
          p.home_score_guess,
          p.away_score_guess,
          finished.home,
          finished.away,
        )
      : 0;
      
    let base = baseWithoutPenalty;
      
    // Bônus de 1 ponto se acertar o vencedor dos pênaltis
    if (
      finished &&
      finished.home === finished.away &&
      p.home_score_guess != null &&
      p.away_score_guess != null &&
      p.home_score_guess === p.away_score_guess &&
      p.penalty_winner_id != null &&
      finished.penaltyWinnerId != null &&
      p.penalty_winner_id === finished.penaltyWinnerId
    ) {
      base += 1;
    }

    const points = base * multiplier;

    // Só grava se mudou (evita writes desnecessários no re-sync).
    if ((p.points_earned ?? 0) !== points || (p.base_points ?? 0) !== base) {
      await admin
        .from('predictions')
        .update({ points_earned: points, base_points: base })
        .eq('id', p.id);
      updatedPredictions += 1;
    }

    earnedByUser.set(p.user_id, (earnedByUser.get(p.user_id) ?? 0) + points);

    const rk = roundKeyForMatch(p.match_id);
    if (rk) {
      usersWithPick.get(rk)!.add(p.user_id);
      const stats = roundStats.get(rk)!;
      const cur = stats.get(p.user_id) ?? { points: 0, exact: 0, diff: 0 };
      cur.points += points;
      // Desempate pelos pontos OBTIDOS em cada categoria (com multiplicador
      // turbinado) — um acerto turbinado pesa mais que vários acertos
      // normais. Mesma regra da Classificação Geral (generalRanking.ts).
      if (baseWithoutPenalty === 5) cur.exact += points; // placar exato
      if (baseWithoutPenalty === 3) cur.diff += points; // vencedor + saldo
      stats.set(p.user_id, cur);
    }
  }

  // ── Palpites extras (semis = teste; 3º lugar e final = valendo) ────────
  // Recalculados do zero como o resto (idempotente). points_earned é gravado
  // para TODOS os jogos habilitados (feedback "você teria feito +N" nas
  // semis), mas só EXTRA_COUNTING_MATCH_IDS entram no total_score — e nunca
  // em base_points/round_scores (não perturbam os desempates).
  const extraByUser = new Map<string, number>();
  {
    const { data: extraResults } = await admin
      .from('match_extra_results')
      .select('*');
    const extraResultByMatch = new Map(
      ((extraResults ?? []) as ExtraResultRow[]).map((r) => [r.match_id, r]),
    );

    const { data: extraPreds } = await admin
      .from('extra_predictions')
      .select('*');

    for (const ep of (extraPreds ?? []) as ExtraPredictionRow[]) {
      affectedUsers.add(ep.user_id);
      const actual = extraResultByMatch.get(ep.match_id);
      const isFinished = statusById.get(ep.match_id) === 'finished';

      let total = 0;
      if (actual && isFinished) {
        const multiplier = multiplierByMatch.get(ep.match_id) ?? 1;
        total = calculateExtraPoints(ep, actual).total * multiplier;
      }

      if ((ep.points_earned ?? 0) !== total) {
        await admin
          .from('extra_predictions')
          .update({ points_earned: total })
          .eq('id', ep.id);
      }

      if (EXTRA_COUNTING_MATCH_IDS.includes(ep.match_id)) {
        extraByUser.set(ep.user_id, (extraByUser.get(ep.user_id) ?? 0) + total);
      }
    }
  }

  // Perfis dos usuários afetados: is_admin (fora de competição), correção
  // manual e bônus de indicação (precisa entrar no total_score, senão o
  // recálculo do sync apagaria os pontos ganhos por indicar amigos).
  const isAdminByUser = new Map<string, boolean>();
  const adjustmentByUser = new Map<string, number>();
  const referralByUser = new Map<string, number>();
  if (affectedUsers.size > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, is_admin, score_adjustment, referral_bonus')
      .in('id', Array.from(affectedUsers));
    for (const pr of profs ?? []) {
      isAdminByUser.set(pr.id, !!pr.is_admin);
      adjustmentByUser.set(pr.id, pr.score_adjustment ?? 0);
      referralByUser.set(pr.id, pr.referral_bonus ?? 0);
    }
  }

  // Rodada encerrada = todas as suas partidas finalizadas.
  const roundComplete = new Map<RoundKey, boolean>();
  for (const rk of ROUND_ORDER) {
    const ids = ROUND_MATCH_IDS[rk];
    roundComplete.set(
      rk,
      ids.length > 0 && ids.every((id) => statusById.get(id) === 'finished'),
    );
  }

  // Sorteios de desempate já registrados pelo admin (Central de controle).
  // Necessário para resolver a colocação REAL de rodadas empatadas no top 5
  // — sem isso, o bônus escalonado abaixo usava um desempate arbitrário por
  // user_id (nunca refletia o sorteio real).
  const { data: drawsData } = await admin
    .from('tiebreak_draws')
    .select('scope, signature, ordering');
  const drawsByKey = new Map<string, DrawRecord>();
  for (const d of (drawsData ?? []) as Array<{ scope: string; signature: string; ordering: string[] }>) {
    drawsByKey.set(`${d.scope}|${d.signature}`, {
      scope: d.scope as DrawRecord['scope'],
      signature: d.signature,
      ordering: d.ordering,
    });
  }

  // Monta round_scores: classifica cada rodada (desempate) e premia em camadas.
  const roundBonusByUser = new Map<string, number>();
  const roundScoreRows: Array<{
    round_key: RoundKey;
    user_id: string;
    points: number;
    exact_pts: number;
    diff_pts: number;
    place: number | null;
    bonus: number;
    complete: boolean;
    is_winner: boolean;
  }> = [];

  for (const rk of ROUND_ORDER) {
    const stats = roundStats.get(rk)!;
    const users = usersWithPick.get(rk)!;
    if (users.size === 0) continue; // rodada sem palpites ainda → ignora.

    // Só registra rodadas que já começaram (ao menos um jogo finalizado);
    // evita criar tabelas de rodadas futuras (tudo zerado).
    const started = ROUND_MATCH_IDS[rk].some((id) => finishedScore.has(id));
    if (!started) continue;

    const complete = roundComplete.get(rk)!;

    // Classifica os NÃO-admins pela ordem de desempate da rodada:
    //   1) pontos · 2) placar exato · 3) saldo · 4) fallback estável (user_id).
    // (Critérios 4–7 — final/semi/etc — valem só na classificação geral.)
    const contenders = Array.from(users)
      .filter((u) => !isAdminByUser.get(u))
      .map((u) => ({ user: u, ...(stats.get(u) ?? { points: 0, exact: 0, diff: 0 }) }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.exact !== a.exact) return b.exact - a.exact;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return a.user < b.user ? -1 : a.user > b.user ? 1 : 0;
      });

    // place (1-based) — ponto de partida antes do desempate por sorteio.
    const placeByUser = new Map<string, number>();
    contenders.forEach((c, i) => placeByUser.set(c.user, i + 1));

    // Empates absolutos no top 5 exigem sorteio (Central de controle). Um
    // grupo sem sorteio válido salvo fica "pending" — todos os membros
    // ficam SEM bônus/coroa até o admin resolver, mesmo com a rodada
    // encerrada. Com sorteio válido, a colocação real de cada membro vem
    // da ordem sorteada (não do fallback alfabético por user_id).
    const tiebreakRows: TiebreakRoundRow[] = contenders.map((c) => ({
      user_id: c.user,
      is_admin: false,
      points: c.points,
      exact_pts: c.exact,
      diff_pts: c.diff,
    }));
    const tieGroups = detectRoundTieGroups(tiebreakRows, rk);
    const pendingTieUsers = new Set<string>();
    for (const group of tieGroups) {
      const draw = drawsByKey.get(`${group.scope}|${group.signature}`);
      const result = applyDraw(group, draw);
      if (result.pending) {
        group.memberIds.forEach((id) => pendingTieUsers.add(id));
      } else {
        result.orderedIds.forEach((id, idx) => placeByUser.set(id, group.topPosition + idx));
      }
    }

    for (const u of users) {
      const stat = stats.get(u) ?? { points: 0, exact: 0, diff: 0 };
      const isAdmin = !!isAdminByUser.get(u);
      const place = isAdmin ? null : placeByUser.get(u) ?? null;
      const tiePending = pendingTieUsers.has(u);
      // Bônus só vale quando a rodada encerra, o usuário pontuou (>0) e não
      // há empate pendente de sorteio na colocação dele.
      const bonus =
        complete && place != null && stat.points > 0 && !tiePending
          ? roundBonusForPlace(place)
          : 0;
      if (bonus > 0) {
        roundBonusByUser.set(u, (roundBonusByUser.get(u) ?? 0) + bonus);
      }
      roundScoreRows.push({
        round_key: rk,
        user_id: u,
        points: stat.points,
        exact_pts: stat.exact,
        diff_pts: stat.diff,
        place,
        bonus,
        complete,
        is_winner: complete && place === 1 && stat.points > 0 && !tiePending,
      });
    }
  }

  // Persiste round_scores: limpa tudo e reinsere (idempotente).
  await admin.from('round_scores').delete().not('round_key', 'is', null);
  if (roundScoreRows.length > 0) {
    const { error: rsErr } = await admin.from('round_scores').insert(roundScoreRows);
    if (rsErr) throw new Error(`scoring: gravar round_scores: ${rsErr.message}`);
  }

  // Atualiza total_score + round_bonus de cada usuário afetado.
  // total_score = palpites + correção manual + bônus de rodada + bônus de indicação.
  for (const userId of affectedUsers) {
    const earned = earnedByUser.get(userId) ?? 0;
    const adjustment = adjustmentByUser.get(userId) ?? 0;
    const bonus = roundBonusByUser.get(userId) ?? 0;
    const referral = referralByUser.get(userId) ?? 0;
    const extra = extraByUser.get(userId) ?? 0;
    await admin
      .from('profiles')
      .update({
        round_bonus: bonus,
        extra_points: extra,
        total_score: earned + adjustment + bonus + referral + extra,
      })
      .eq('id', userId);
  }

  return { updatedPredictions };
}
