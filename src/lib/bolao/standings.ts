import { teams } from '@/data/teams';
import { matches as staticMatches } from '@/data/matches';
import type { GroupId } from '@/lib/types';

export const allGroups: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

/** Ids das partidas da fase de grupos (não confundir com pertencer aos 48 times: mata-mata também é entre eles). */
export const groupStageMatchIds = new Set(
  staticMatches.filter((m) => m.stage === 'group').map((m) => m.id),
);

export type StandingRow = {
  team_id: string;
  position: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

export type FinishedMatch = { home_team_id: string; away_team_id: string; home_score: number; away_score: number };

/** Mini-tabela de confronto direto restrita ao subconjunto de times empatados. */
function headToHead(teamIds: string[], matches: FinishedMatch[]) {
  const set = new Set(teamIds);
  const h2h = new Map(teamIds.map((id) => [id, { pts: 0, gf: 0, ga: 0 }]));
  for (const m of matches) {
    if (!set.has(m.home_team_id) || !set.has(m.away_team_id)) continue;
    const h = h2h.get(m.home_team_id)!;
    const a = h2h.get(m.away_team_id)!;
    h.gf += m.home_score; h.ga += m.away_score;
    a.gf += m.away_score; a.ga += m.home_score;
    if (m.home_score > m.away_score) h.pts += 3;
    else if (m.home_score < m.away_score) a.pts += 3;
    else { h.pts++; a.pts++; }
  }
  return h2h;
}

/**
 * Ordena as linhas de um grupo pelos critérios FIFA. Aplica pts → SG → GP em
 * todos os jogos; para times ainda empatados nos três, aplica confronto direto
 * (pts → SG → GP entre eles).
 */
function rankByFifaCriteria(rows: StandingRow[], matches: FinishedMatch[]): StandingRow[] {
  const tiedOverall = (a: StandingRow, b: StandingRow) =>
    a.points === b.points &&
    a.goal_difference === b.goal_difference &&
    a.goals_for === b.goals_for;

  const sorted = [...rows].sort((a, b) =>
    b.points - a.points ||
    b.goal_difference - a.goal_difference ||
    b.goals_for - a.goals_for ||
    0,
  );

  const result: StandingRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && tiedOverall(sorted[i], sorted[j])) j++;
    const cluster = sorted.slice(i, j);

    if (cluster.length > 1) {
      const h2h = headToHead(cluster.map((r) => r.team_id), matches);
      cluster.sort((a, b) => {
        const ha = h2h.get(a.team_id)!;
        const hb = h2h.get(b.team_id)!;
        return (
          hb.pts - ha.pts ||
          (hb.gf - hb.ga) - (ha.gf - ha.ga) ||
          hb.gf - ha.gf ||
          a.team_id.localeCompare(b.team_id)
        );
      });
    }
    result.push(...cluster);
    i = j;
  }

  return result;
}

/** Calcula a classificação de cada grupo a partir dos jogos finalizados. */
export function computeStandings(finishedMatches: FinishedMatch[]): Map<GroupId, StandingRow[]> {
  const stats = new Map<string, { played: number; won: number; draw: number; lost: number; gf: number; ga: number; pts: number }>();

  const ensure = (id: string) => {
    if (!stats.has(id)) stats.set(id, { played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, pts: 0 });
    return stats.get(id)!;
  };

  for (const m of finishedMatches) {
    const h = ensure(m.home_team_id);
    const a = ensure(m.away_team_id);
    h.played++; a.played++;
    h.gf += m.home_score; h.ga += m.away_score;
    a.gf += m.away_score; a.ga += m.home_score;
    if (m.home_score > m.away_score) { h.won++; h.pts += 3; a.lost++; }
    else if (m.home_score < m.away_score) { a.won++; a.pts += 3; h.lost++; }
    else { h.draw++; h.pts++; a.draw++; a.pts++; }
  }

  const byGroup = new Map<GroupId, StandingRow[]>();
  for (const group of allGroups) {
    const groupTeams = teams.filter((t) => t.group === group);
    const rows: StandingRow[] = groupTeams.map((t, i) => {
      const s = stats.get(t.id) ?? { played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
      return {
        team_id: t.id,
        position: i + 1,
        played: s.played, won: s.won, draw: s.draw, lost: s.lost,
        goals_for: s.gf, goals_against: s.ga, goal_difference: s.gf - s.ga, points: s.pts,
      };
    });

    const ranked = rankByFifaCriteria(rows, finishedMatches);
    ranked.forEach((r, i) => { r.position = i + 1; });
    byGroup.set(group, ranked);
  }

  return byGroup;
}

/**
 * Melhores 8 terceiros colocados que avançam para os 16 avos de final.
 * Critérios (sem dados de fair play/sorteio): pontos → saldo → gols pró → vitórias → menos derrotas.
 */
export function computeQualifiedThirds(
  standingsByGroup: Map<GroupId, StandingRow[]>,
): Array<StandingRow & { groupId: GroupId }> {
  const thirds: Array<StandingRow & { groupId: GroupId }> = [];
  for (const g of allGroups) {
    const rows = standingsByGroup.get(g);
    if (!rows) continue;
    const third = rows.find((r) => r.position === 3);
    if (third && third.played > 0) thirds.push({ ...third, groupId: g });
  }

  thirds.sort((a, b) =>
    b.points - a.points ||
    b.goal_difference - a.goal_difference ||
    b.goals_for - a.goals_for ||
    b.won - a.won ||
    a.lost - b.lost ||
    a.team_id.localeCompare(b.team_id),
  );

  return thirds.slice(0, 8);
}

/** Fase de grupos totalmente decidida: todos os times de todos os grupos já jogaram as 3 rodadas. */
export function isGroupStageComplete(standingsByGroup: Map<GroupId, StandingRow[]>): boolean {
  if (standingsByGroup.size < allGroups.length) return false;
  for (const group of allGroups) {
    const rows = standingsByGroup.get(group);
    if (!rows || rows.some((r) => r.played < 3)) return false;
  }
  return true;
}

/** Ids dos 32 times classificados para os 16 avos (top 2 de cada grupo + 8 melhores terceiros). */
export function computeQualifiedTeamIds(standingsByGroup: Map<GroupId, StandingRow[]>): Set<string> {
  const qualified = new Set<string>();
  for (const group of allGroups) {
    const rows = standingsByGroup.get(group);
    if (!rows) continue;
    for (const row of rows) {
      if (row.position <= 2) qualified.add(row.team_id);
    }
  }
  for (const third of computeQualifiedThirds(standingsByGroup)) {
    qualified.add(third.team_id);
  }
  return qualified;
}
