import {
  getWorldCupMatches,
  getWorldCupStandings,
  isFootballDataConfigured,
} from './client';
import { resolveTeamId, mapStatus, extractScore } from './mappers';
import type { FdMatch } from './types';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyScoring } from '@/lib/bolao/scoring-sync';
import { applyKnockoutAdvancement } from '@/lib/bolao/advancement';

export interface SyncResult {
  ok: boolean;
  matches?: number;
  advanced?: number;
  standings?: number;
  scoredPredictions?: number;
  syncedAt?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

/**
 * Executa o sync completo: partidas + classificação + pontuação.
 * Chamado pelo cron (/api/sync/football) e pelo botão manual no admin.
 */
export async function runFootballSync(): Promise<SyncResult> {
  if (!isFootballDataConfigured() || !isSupabaseConfigured()) {
    return { ok: true, skipped: true, reason: 'FOOTBALL_DATA_TOKEN ou Supabase ausente.' };
  }

  const admin = createAdminClient();
  const [{ matches }, { standings }] = await Promise.all([
    getWorldCupMatches(),
    getWorldCupStandings(),
  ]);

  // UPDATE em vez de upsert: matches já existem no banco (seed com ids
  // como 'gs-001') mas sem external_id ainda. A primeira execução liga o
  // external_id via team pair; as subsequentes usam external_id diretamente.
  //
  // Jogos de mata-mata: o seed os criou com home_team_id/away_team_id = NULL
  // (os times ainda não eram conhecidos). Como não existe external_id nem
  // par de times para casar, usamos match_time_utc como fallback para o
  // primeiro sync de cada jogo de mata-mata.
  // Status atual de cada linha, usado abaixo para blindar contra regressão
  // (ver comentário no bloco do UPDATE). Uma única query em vez de N+1.
  const { data: currentRows } = await admin.from('matches').select('id, status');
  const currentStatusById = new Map((currentRows ?? []).map((r) => [r.id, r.status as string]));

  let matchesUpdated = 0;
  for (const m of matches) {
    const homeId = resolveTeamId(m.homeTeam);
    const awayId = resolveTeamId(m.awayTeam);
    // Só inclui home_score/away_score quando a API retorna valores válidos.
    // Se a partida acabou de ser marcada como FINISHED mas o placar ainda
    // não chegou (fullTime null), não sobrescrevemos o que já está no banco.
    //
    // extractScore() trata o caso dos pênaltis: o placar de campo vem de
    // regularTime+extraTime (e NÃO de fullTime, que já soma o shootout) e o
    // placar de pênaltis é derivado de fullTime − placar de campo.
    const sc = extractScore(m.score);
    const scoreFields =
      sc.home != null && sc.away != null
        ? {
            home_score: sc.home,
            away_score: sc.away,
            ...(sc.homePenalties != null && sc.awayPenalties != null
              ? {
                  home_penalties: sc.homePenalties,
                  away_penalties: sc.awayPenalties,
                }
              : {}),
          }
        : {};

    const fields: Record<string, unknown> = {
      external_id: m.id,
      match_time_utc: m.utcDate,
      status: mapStatus(m.status),
      ...scoreFields,
    };

    // Preenche os team IDs no banco (essencial para mata-mata cujo seed
    // tinha home_team_id/away_team_id NULL).
    if (homeId) fields.home_team_id = homeId;
    if (awayId) fields.away_team_id = awayId;

    // Estratégia de matching em 3 etapas, resolvendo para NO MÁXIMO uma linha
    // ANTES de fazer o UPDATE. Um .or() que casasse 2 linhas ao mesmo tempo
    // (ex.: par de times já usado por um confronto antigo de outra fase) faz
    // o UPDATE tentar gravar o mesmo external_id em ambas, violando
    // "matches_external_id_key" — foi o que causou o erro de duplicate key.
    //  1. external_id (já linkado de um sync anterior)
    //  2. par home_team_id + away_team_id, só entre linhas ainda não linkadas
    //     (grupo — times fixos desde o seed)
    //  3. match_time_utc, só entre linhas ainda não linkadas (mata-mata —
    //     times NULL no seed, external_id NULL)
    let targetId: string | null = null;

    const { data: byExternal } = await admin
      .from('matches')
      .select('id')
      .eq('external_id', m.id)
      .limit(1);
    if (byExternal && byExternal.length > 0) targetId = byExternal[0].id;

    if (!targetId && homeId && awayId) {
      const { data: byTeams } = await admin
        .from('matches')
        .select('id')
        .is('external_id', null)
        .eq('home_team_id', homeId)
        .eq('away_team_id', awayId)
        .limit(1);
      if (byTeams && byTeams.length > 0) targetId = byTeams[0].id;
    }

    if (!targetId) {
      const { data: byDate } = await admin
        .from('matches')
        .select('id')
        .is('external_id', null)
        .eq('match_time_utc', m.utcDate)
        .limit(1);
      if (byDate && byDate.length > 0) targetId = byDate[0].id;
    }

    if (targetId) {
      // Blindagem: um resultado já 'finished' no banco nunca regride para
      // outro status. decide()/applyScoring tratam 'finished' como decisão
      // definitiva (propagam vencedor, pontuam palpites); uma leitura
      // inconsistente da API (glitch pontual — já observado num sync
      // anterior) não pode desfazer isso. Placar/times ainda são
      // atualizados normalmente, só o status fica protegido.
      if (currentStatusById.get(targetId) === 'finished' && fields.status !== 'finished') {
        delete fields.status;
      }
      const { error: matchErr } = await admin.from('matches').update(fields).eq('id', targetId);
      if (matchErr) throw new Error(`update match ${m.id}: ${matchErr.message}`);
      matchesUpdated++;
    } else {
      console.warn(`[sync] nenhuma linha encontrada para match ${m.id} (sem external_id, par de times ou data correspondente).`);
    }
  }

  // Propaga as seleções classificadas para a próxima fase do mata-mata assim
  // que um confronto é decidido (não esperamos a API ligar a próxima partida).
  // CRÍTICO: a pontuação (applyScoring, mais abaixo) NÃO pode ser bloqueada por
  // uma falha aqui. Se a propagação falhar, registramos e seguimos — senão os
  // participantes ficam sem pontos (jogo fica "finalizado" e não pontua).
  let advanced = 0;
  try {
    ({ advanced } = await applyKnockoutAdvancement(admin));
  } catch (err) {
    console.error('[sync] applyKnockoutAdvancement falhou (seguindo p/ scoring):',
      err instanceof Error ? err.message : err);
  }

  const standingRows = standings
    .filter((s) => s.type === 'TOTAL')
    .flatMap((s) =>
      s.table
        .map((row) => {
          const teamId = resolveTeamId(row.team);
          if (!teamId) return null;
          return {
            group_letter: (s.group ?? '').replace(/^group[_ ]?/i, '').trim(),
            team_id: teamId,
            position: row.position,
            played: row.playedGames,
            won: row.won,
            draw: row.draw,
            lost: row.lost,
            goals_for: row.goalsFor,
            goals_against: row.goalsAgainst,
            goal_difference: row.goalDifference,
            points: row.points,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
    );

  if (standingRows.length > 0) {
    const { error: stdErr } = await admin
      .from('standings')
      .upsert(standingRows, { onConflict: 'group_letter,team_id' });
    // Não bloqueia o scoring: registra e segue.
    if (stdErr) console.error('[sync] upsert standings falhou (seguindo p/ scoring):', stdErr.message);
  }

  // Passo CRÍTICO — roda sempre, independente das etapas acima.
  const { updatedPredictions } = await applyScoring(admin);

  return {
    ok: true,
    matches: matchesUpdated,
    advanced,
    standings: standingRows.length,
    scoredPredictions: updatedPredictions,
    syncedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Polling ao vivo — a football-data.org não tem teto diário (só 10 req/min,
// ver README), então não precisa de contador de cota. Mesmo assim, só sonda
// quando há um jogo nosso na janela "potencialmente ao vivo" (evita ficar
// martelando a API o dia inteiro à toa) e só roda o scoring completo (caro,
// varre todos os palpites) quando algo realmente mudou.
// ─────────────────────────────────────────────────────────────────────────────

type Admin = ReturnType<typeof createAdminClient>;

interface CurrentRow {
  id: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
  external_id: number | null;
}

/** Mesma estratégia de 3 passos de runFootballSync(), mas lendo a linha atual
 *  inteira (não só o id) pra permitir comparar antes de gravar. */
async function resolveTargetRow(admin: Admin, m: FdMatch, homeId: string | null, awayId: string | null): Promise<CurrentRow | null> {
  const cols = 'id, status, home_score, away_score, home_penalties, away_penalties, home_team_id, away_team_id, external_id';

  const { data: byExternal } = await admin
    .from('matches').select(cols).eq('external_id', m.id).limit(1);
  if (byExternal && byExternal.length > 0) return byExternal[0] as CurrentRow;

  if (homeId && awayId) {
    const { data: byTeams } = await admin
      .from('matches').select(cols)
      .is('external_id', null).eq('home_team_id', homeId).eq('away_team_id', awayId).limit(1);
    if (byTeams && byTeams.length > 0) return byTeams[0] as CurrentRow;
  }

  const { data: byDate } = await admin
    .from('matches').select(cols)
    .is('external_id', null).eq('match_time_utc', m.utcDate).limit(1);
  if (byDate && byDate.length > 0) return byDate[0] as CurrentRow;

  return null;
}

function buildLiveFields(m: FdMatch, current: CurrentRow, homeId: string | null, awayId: string | null) {
  const sc = extractScore(m.score);
  // Blindagem: nunca regride um status 'finished' já gravado — mesmo motivo
  // do guard em runFootballSync (ver comentário lá). O poll ao vivo roda a
  // cada 1-5min sem supervisão, então é o caminho mais exposto a uma leitura
  // inconsistente da API desfazer um resultado decidido.
  const status = current.status === 'finished' ? 'finished' : mapStatus(m.status);

  const fields: Record<string, unknown> = {
    external_id: m.id,
    match_time_utc: m.utcDate,
    status,
  };
  if (sc.home != null && sc.away != null) {
    fields.home_score = sc.home;
    fields.away_score = sc.away;
    if (sc.homePenalties != null && sc.awayPenalties != null) {
      fields.home_penalties = sc.homePenalties;
      fields.away_penalties = sc.awayPenalties;
    }
  }
  if (homeId) fields.home_team_id = homeId;
  if (awayId) fields.away_team_id = awayId;

  const changed =
    current.external_id !== m.id ||
    current.status !== status ||
    (sc.home != null && current.home_score !== sc.home) ||
    (sc.away != null && current.away_score !== sc.away) ||
    (sc.homePenalties != null && current.home_penalties !== sc.homePenalties) ||
    (sc.awayPenalties != null && current.away_penalties !== sc.awayPenalties) ||
    (homeId != null && current.home_team_id !== homeId) ||
    (awayId != null && current.away_team_id !== awayId);

  return { fields, changed };
}

/** Janela ao redor do kickoff em que consideramos um jogo "potencialmente ao vivo". */
const LIVE_WINDOW_BEFORE_MS = 15 * 60 * 1000; // 15min antes do horário previsto
const LIVE_WINDOW_AFTER_MS = 3 * 60 * 60 * 1000; // até 3h depois (tempo normal + prorrogação + pênaltis + margem)

async function hasMatchInLiveWindow(admin: Admin): Promise<boolean> {
  const now = Date.now();
  const from = new Date(now - LIVE_WINDOW_AFTER_MS).toISOString();
  const to = new Date(now + LIVE_WINDOW_BEFORE_MS).toISOString();
  const { data } = await admin
    .from('matches')
    .select('id')
    .in('status', ['scheduled', 'live'])
    .gte('match_time_utc', from)
    .lte('match_time_utc', to)
    .limit(1);
  return Boolean(data && data.length > 0);
}

/**
 * Polling ao vivo: chamado com frequência (1-5min, via pg_cron/pg_net do
 * Supabase — Vercel Hobby só permite Cron 1x/dia). Só busca a API quando há
 * jogo na janela ao vivo; só grava as partidas que realmente mudaram; só
 * roda applyKnockoutAdvancement/applyScoring quando algo mudou.
 */
export async function runLivePoll(): Promise<SyncResult> {
  if (!isFootballDataConfigured() || !isSupabaseConfigured()) {
    return { ok: true, skipped: true, reason: 'FOOTBALL_DATA_TOKEN ou Supabase ausente.' };
  }

  const admin = createAdminClient();

  if (!(await hasMatchInLiveWindow(admin))) {
    return { ok: true, skipped: true, reason: 'Nenhum jogo na janela ao vivo agora.' };
  }

  const { matches } = await getWorldCupMatches();

  let matchesUpdated = 0;
  let anyChanged = false;

  for (const m of matches) {
    const homeId = resolveTeamId(m.homeTeam);
    const awayId = resolveTeamId(m.awayTeam);
    const current = await resolveTargetRow(admin, m, homeId, awayId);
    if (!current) continue;

    const { fields, changed } = buildLiveFields(m, current, homeId, awayId);
    if (!changed) continue;

    const { error } = await admin.from('matches').update(fields).eq('id', current.id);
    if (error) throw new Error(`update match ${m.id}: ${error.message}`);
    matchesUpdated++;
    anyChanged = true;
  }

  let advanced = 0;
  let scoredPredictions = 0;
  if (anyChanged) {
    try {
      ({ advanced } = await applyKnockoutAdvancement(admin));
    } catch (err) {
      console.error('[live-poll] applyKnockoutAdvancement falhou (seguindo p/ scoring):',
        err instanceof Error ? err.message : err);
    }
    ({ updatedPredictions: scoredPredictions } = await applyScoring(admin));
  }

  return {
    ok: true,
    matches: matchesUpdated,
    advanced,
    scoredPredictions,
    syncedAt: new Date().toISOString(),
  };
}
