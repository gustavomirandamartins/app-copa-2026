import {
  getWorldCupMatches,
  getWorldCupStandings,
  isFootballDataConfigured,
} from './client';
import { resolveTeamId, mapStatus } from './mappers';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyScoring } from '@/lib/bolao/scoring-sync';

export interface SyncResult {
  ok: boolean;
  matches?: number;
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
  let matchesUpdated = 0;
  for (const m of matches) {
    const homeId = resolveTeamId(m.homeTeam);
    const awayId = resolveTeamId(m.awayTeam);
    const fields = {
      external_id: m.id,
      match_time_utc: m.utcDate,
      status: mapStatus(m.status),
      home_score: m.score.fullTime.home,
      away_score: m.score.fullTime.away,
    };

    let q = admin.from('matches').update(fields);
    if (homeId && awayId) {
      // Primeiro sync (external_id ainda null) → casa por time;
      // syncs seguintes → casa por external_id. OR cobre os dois casos.
      q = q.or(
        `external_id.eq.${m.id},and(home_team_id.eq.${homeId},away_team_id.eq.${awayId})`,
      );
    } else {
      q = q.eq('external_id', m.id);
    }

    const { error: matchErr } = await q;
    if (matchErr) throw new Error(`update match ${m.id}: ${matchErr.message}`);
    matchesUpdated++;
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
    if (stdErr) throw new Error(`upsert standings: ${stdErr.message}`);
  }

  const { updatedPredictions } = await applyScoring(admin);

  return {
    ok: true,
    matches: matchesUpdated,
    standings: standingRows.length,
    scoredPredictions: updatedPredictions,
    syncedAt: new Date().toISOString(),
  };
}
