import { teams } from '@/data/teams';
import { matches as staticMatches } from '@/data/matches';
import { decide, type MatchRow } from '@/lib/bolao/advancement';
import {
  computeStandings,
  computeQualifiedTeamIds,
  isGroupStageComplete,
  groupStageMatchIds,
} from '@/lib/bolao/standings';

/**
 * Times sem mais chance de título: perderam um mata-mata já decidido, ou a
 * fase de grupos terminou e não ficaram entre os 32 classificados.
 * Não depende das probabilidades da planilha UFMG (que só são zeradas
 * manualmente para os eliminados na fase de grupos, não para o mata-mata).
 */
export function computeEliminatedTeamIds(matchRows: MatchRow[]): Set<string> {
  const byId = new Map(matchRows.map((r) => [r.id, r]));
  const eliminated = new Set<string>();

  for (const sm of staticMatches) {
    if (sm.stage === 'group') continue;
    const row = byId.get(sm.id);
    if (!row) continue;
    const { loser } = decide(row);
    if (loser) eliminated.add(loser);
  }

  const finishedGroupMatches = matchRows
    .filter((r) => groupStageMatchIds.has(r.id))
    .filter(
      (r): r is MatchRow & { home_team_id: string; away_team_id: string; home_score: number; away_score: number } =>
        r.status === 'finished' &&
        r.home_score != null &&
        r.away_score != null &&
        r.home_team_id != null &&
        r.away_team_id != null,
    );

  const standingsByGroup = computeStandings(finishedGroupMatches);
  if (isGroupStageComplete(standingsByGroup)) {
    const qualified = computeQualifiedTeamIds(standingsByGroup);
    for (const t of teams) {
      if (!qualified.has(t.id)) eliminated.add(t.id);
    }
  }

  return eliminated;
}
