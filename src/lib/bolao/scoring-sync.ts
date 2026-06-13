import type { createAdminClient } from '@/lib/supabase/admin';
import { calculateMatchPoints } from './scoring';
import {
  ROUND_ORDER,
  ROUND_MATCH_IDS,
  roundKeyForMatch,
  ROUND_BONUS_POINTS,
  type RoundKey,
} from './rounds';

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Aplica a pontuação no banco (gancho do sync). Idempotente: recalcula tudo
 * do zero, então rodar de novo não duplica pontos.
 *
 * Etapas:
 *   1. Pontua cada palpite de jogo finalizado (com multiplicador "turbinado").
 *   2. Calcula os pontos de cada usuário por rodada (round_scores) e, quando a
 *      rodada encerra, o(s) vencedor(es) — que ganham +50 de bônus. O admin
 *      fica fora de competição (não recebe bônus).
 *   3. total_score = pontos dos palpites + correção manual + bônus de rodada.
 */
export async function applyScoring(admin: Admin): Promise<{ updatedPredictions: number }> {
  // Todas as partidas (precisamos do status de todas para saber se a rodada
  // encerrou, não só das finalizadas).
  const { data: allMatches, error: matchesErr } = await admin
    .from('matches')
    .select('id, status, home_score, away_score');
  if (matchesErr) throw new Error(`scoring: ler matches: ${matchesErr.message}`);

  const statusById = new Map<string, string>();
  const finishedScore = new Map<string, { home: number; away: number }>();
  for (const m of allMatches ?? []) {
    statusById.set(m.id, m.status);
    if (m.status === 'finished' && m.home_score != null && m.away_score != null) {
      finishedScore.set(m.id, { home: m.home_score, away: m.away_score });
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

  // Todos os palpites (uma query só).
  const { data: preds } = await admin
    .from('predictions')
    .select('id, user_id, match_id, home_score_guess, away_score_guess, points_earned');

  // earned[user] = soma dos pontos dos palpites (jogos finalizados).
  const earnedByUser = new Map<string, number>();
  // roundPoints[round][user] = pontos do usuário naquela rodada.
  const roundPoints = new Map<RoundKey, Map<string, number>>();
  // Usuários que têm palpite em cada rodada (para montar a tabela da rodada).
  const usersWithPick = new Map<RoundKey, Set<string>>();
  for (const k of ROUND_ORDER) {
    roundPoints.set(k, new Map());
    usersWithPick.set(k, new Set());
  }

  const affectedUsers = new Set<string>();
  let updatedPredictions = 0;

  for (const p of preds ?? []) {
    affectedUsers.add(p.user_id);
    const finished = finishedScore.get(p.match_id);
    const multiplier = multiplierByMatch.get(p.match_id) ?? 1;
    const points = finished
      ? calculateMatchPoints(
          p.home_score_guess,
          p.away_score_guess,
          finished.home,
          finished.away,
        ) * multiplier
      : 0;

    // Só grava se mudou (evita writes desnecessários no re-sync).
    if ((p.points_earned ?? 0) !== points) {
      await admin.from('predictions').update({ points_earned: points }).eq('id', p.id);
      updatedPredictions += 1;
    }

    earnedByUser.set(p.user_id, (earnedByUser.get(p.user_id) ?? 0) + points);

    const rk = roundKeyForMatch(p.match_id);
    if (rk) {
      usersWithPick.get(rk)!.add(p.user_id);
      const rp = roundPoints.get(rk)!;
      rp.set(p.user_id, (rp.get(p.user_id) ?? 0) + points);
    }
  }

  // Perfis dos usuários afetados: is_admin (fora de competição) + correção manual.
  const isAdminByUser = new Map<string, boolean>();
  const adjustmentByUser = new Map<string, number>();
  if (affectedUsers.size > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, is_admin, score_adjustment')
      .in('id', Array.from(affectedUsers));
    for (const pr of profs ?? []) {
      isAdminByUser.set(pr.id, !!pr.is_admin);
      adjustmentByUser.set(pr.id, pr.score_adjustment ?? 0);
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

  // Monta round_scores e apura vencedores; acumula o bônus por usuário.
  const roundBonusByUser = new Map<string, number>();
  const roundScoreRows: Array<{
    round_key: RoundKey;
    user_id: string;
    points: number;
    complete: boolean;
    is_winner: boolean;
  }> = [];

  for (const rk of ROUND_ORDER) {
    const rp = roundPoints.get(rk)!;
    const users = usersWithPick.get(rk)!;
    if (users.size === 0) continue; // rodada sem palpites ainda → ignora.

    // Só registra rodadas que já começaram (ao menos um jogo finalizado);
    // evita criar tabelas de rodadas futuras (tudo zerado).
    const started = ROUND_MATCH_IDS[rk].some((id) => finishedScore.has(id));
    if (!started) continue;

    const complete = roundComplete.get(rk)!;

    // Vencedor: maior pontuação entre não-admins (e > 0), só se a rodada encerrou.
    let maxPoints = 0;
    if (complete) {
      for (const u of users) {
        if (isAdminByUser.get(u)) continue; // admin fora de competição
        const pts = rp.get(u) ?? 0;
        if (pts > maxPoints) maxPoints = pts;
      }
    }

    for (const u of users) {
      const pts = rp.get(u) ?? 0;
      const isWinner =
        complete && maxPoints > 0 && !isAdminByUser.get(u) && pts === maxPoints;
      if (isWinner) {
        roundBonusByUser.set(u, (roundBonusByUser.get(u) ?? 0) + ROUND_BONUS_POINTS);
      }
      roundScoreRows.push({
        round_key: rk,
        user_id: u,
        points: pts,
        complete,
        is_winner: isWinner,
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
  for (const userId of affectedUsers) {
    const earned = earnedByUser.get(userId) ?? 0;
    const adjustment = adjustmentByUser.get(userId) ?? 0;
    const bonus = roundBonusByUser.get(userId) ?? 0;
    await admin
      .from('profiles')
      .update({ round_bonus: bonus, total_score: earned + adjustment + bonus })
      .eq('id', userId);
  }

  return { updatedPredictions };
}
