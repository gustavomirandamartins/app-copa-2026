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
  //
  // Jogos de mata-mata: o seed os criou com home_team_id/away_team_id = NULL
  // (os times ainda não eram conhecidos). Como não existe external_id nem
  // par de times para casar, usamos match_time_utc como fallback para o
  // primeiro sync de cada jogo de mata-mata.
  let matchesUpdated = 0;
  for (const m of matches) {
    const homeId = resolveTeamId(m.homeTeam);
    const awayId = resolveTeamId(m.awayTeam);
    // Só inclui home_score/away_score quando a API retorna valores válidos.
    // Se a partida acabou de ser marcada como FINISHED mas o placar ainda
    // não chegou (fullTime null), não sobrescrevemos o que já está no banco.
    const scoreFields =
      m.score?.fullTime?.home != null && m.score?.fullTime?.away != null
        ? {
            home_score: m.score.fullTime.home,
            away_score: m.score.fullTime.away,
            ...(m.score.penalties?.home != null && m.score.penalties?.away != null
              ? {
                  home_penalties: m.score.penalties.home,
                  away_penalties: m.score.penalties.away,
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

    // Estratégia de matching em 3 etapas:
    //  1. external_id (já linkado de um sync anterior)
    //  2. par home_team_id + away_team_id (grupo — times fixos desde o seed)
    //  3. match_time_utc (mata-mata — times NULL no seed, external_id NULL)
    let q = admin.from('matches').update(fields);
    if (homeId && awayId) {
      q = q.or(
        `external_id.eq.${m.id},and(home_team_id.eq.${homeId},away_team_id.eq.${awayId})`,
      );
    } else {
      q = q.eq('external_id', m.id);
    }

    const { error: matchErr } = await q;
    if (matchErr) throw new Error(`update match ${m.id}: ${matchErr.message}`);

    // Verifica se o external_id foi linkado. Se não, significa que nenhuma
    // linha casou (mata-mata com home/away NULL e sem external_id).
    const { data: linked } = await admin
      .from('matches')
      .select('id')
      .eq('external_id', m.id)
      .limit(1);

    if (!linked || linked.length === 0) {
      // Fallback: casar pelo horário UTC (o seed preencheu match_time_utc).
      const { error: fallbackErr } = await admin
        .from('matches')
        .update(fields)
        .is('external_id', null)
        .eq('match_time_utc', m.utcDate);
      if (fallbackErr) {
        console.warn(`[sync] fallback por data falhou para match ${m.id}:`, fallbackErr.message);
      }
    }

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
