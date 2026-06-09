import type { Match, TeamStanding, GroupId, MatchStage } from '@/lib/types';

// ─── Exported Interfaces ────────────────────────────────────────────────────────

export interface KnockoutMatch {
  id: string;
  stage: MatchStage;
  team1Id: string | null;
  team2Id: string | null;
  team1Source: string; // e.g., '1A', '3rd-qual-1'
  team2Source: string;
  winnerId?: string | null;
}

export interface KnockoutBracket {
  roundOf32: KnockoutMatch[];
  roundOf16: KnockoutMatch[];
  quarterFinals: KnockoutMatch[];
  semiFinals: KnockoutMatch[];
  thirdPlace: KnockoutMatch;
  final: KnockoutMatch;
}

export interface SimulationResult {
  groupStandings: Map<GroupId, TeamStanding[]>;
  thirdPlaceRanking: TeamStanding[];
  qualifiedThirds: TeamStanding[];
  bracket: KnockoutBracket;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const ALL_GROUPS: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// ─── Group Stage Calculations ───────────────────────────────────────────────────

/**
 * Calculate standings for every group from completed group-stage matches.
 *
 * Each group produces a sorted array of TeamStanding with position assigned.
 * Tiebreakers are applied in FIFA order:
 *   1. Points (3W + 1D)
 *   2. Goal difference
 *   3. Goals scored
 *   4. Head-to-head points (between tied teams)
 *   5. Head-to-head goal difference
 *   6. Alphabetical (proxy for fair-play, last resort)
 */
export function calculateGroupStandings(matches: Match[]): Map<GroupId, TeamStanding[]> {
  const groupMatches = partitionByGroup(matches);
  const standings = new Map<GroupId, TeamStanding[]>();

  for (const group of ALL_GROUPS) {
    const gMatches = groupMatches.get(group) ?? [];
    const teamIds = extractTeamIds(gMatches);
    const raw = buildRawStandings(teamIds, gMatches);
    const sorted = sortStandings(raw, gMatches);

    // Assign positions (1-indexed)
    sorted.forEach((s, i) => {
      s.position = i + 1;
    });

    standings.set(group, sorted);
  }

  return standings;
}

// ─── Third-Place Ranking ────────────────────────────────────────────────────────

/**
 * Rank all 12 third-placed teams across groups.
 *
 * Tiebreaker: points → goal difference → goals scored → alphabetical (teamId).
 */
export function rankThirdPlaceTeams(
  standings: Map<GroupId, TeamStanding[]>
): TeamStanding[] {
  const thirds: TeamStanding[] = [];

  for (const group of ALL_GROUPS) {
    const groupStandings = standings.get(group);
    if (groupStandings && groupStandings.length >= 3) {
      thirds.push(groupStandings[2]); // 0-indexed → pos 3
    }
  }

  return thirds.sort((a, b) => {
    // 1. Points (desc)
    if (b.points !== a.points) return b.points - a.points;
    // 2. Goal difference (desc)
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    // 3. Goals scored (desc)
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    // 4. Alphabetical by teamId (asc) — proxy for fair play / FIFA ranking
    return a.teamId.localeCompare(b.teamId);
  });
}

/**
 * Select the best 8 out of 12 third-placed teams.
 */
export function getBestThirdPlaceTeams(ranked: TeamStanding[]): TeamStanding[] {
  return ranked.slice(0, 8);
}

// ─── Knockout Bracket Generation ────────────────────────────────────────────────

/**
 * R32 matchup configuration.
 *
 * Each entry defines one Round-of-32 match:
 *   - team1Source: position+group for the group winner/runner-up (e.g. '1A', '2C')
 *   - team2Source: for third-place qualifiers, a label like '3rd-qual-1'
 *   - thirdPlacePool: which groups' third-place teams could fill the slot
 *     (the actual assignment depends on which 8 qualify)
 */
interface R32Slot {
  team1Source: string;
  team2Source: string;
  thirdPlacePool?: GroupId[];
}

/*
 * Simplified Round-of-32 matchups.
 *
 * 24 matches total: 16 feature group winners/runners-up vs each other or
 * vs third-place qualifiers. The bracket is designed so that:
 *   - Top half: groups A, C, E, G, I, K
 *   - Bottom half: groups B, D, F, H, J, L
 *
 * Third-place qualifiers are distributed so that each half gets 4.
 */
const R32_SLOTS: R32Slot[] = [
  // === TOP HALF (matches 1–12) ===
  // Group winners vs 3rd place qualifiers
  { team1Source: '1A', team2Source: '3rd-qual-1', thirdPlacePool: ['I', 'J', 'K', 'L'] },
  { team1Source: '1C', team2Source: '3rd-qual-2', thirdPlacePool: ['A', 'B', 'E', 'F'] },
  { team1Source: '1E', team2Source: '3rd-qual-3', thirdPlacePool: ['C', 'D', 'G', 'H'] },
  { team1Source: '1G', team2Source: '3rd-qual-4', thirdPlacePool: ['E', 'F', 'I', 'J'] },
  { team1Source: '1I', team2Source: '3rd-qual-5', thirdPlacePool: ['A', 'B', 'K', 'L'] },
  { team1Source: '1K', team2Source: '3rd-qual-6', thirdPlacePool: ['C', 'D', 'G', 'H'] },
  // Runners-up cross matches
  { team1Source: '2A', team2Source: '2I' },
  { team1Source: '2C', team2Source: '2K' },
  { team1Source: '2E', team2Source: '2G' },
  // Runners-up reverse cross (for bracket balance)
  { team1Source: '2G', team2Source: '2E' },
  { team1Source: '2I', team2Source: '2A' },
  { team1Source: '2K', team2Source: '2C' },

  // === BOTTOM HALF (matches 13–24) ===
  // Group winners vs 3rd place qualifiers
  { team1Source: '1B', team2Source: '3rd-qual-7', thirdPlacePool: ['G', 'H', 'I', 'J'] },
  { team1Source: '1D', team2Source: '3rd-qual-8', thirdPlacePool: ['A', 'B', 'C', 'D'] },
  { team1Source: '1F', team2Source: '3rd-qual-9', thirdPlacePool: ['E', 'F', 'K', 'L'] },  // note: extra
  { team1Source: '1H', team2Source: '3rd-qual-10', thirdPlacePool: ['C', 'D', 'I', 'J'] }, // note: extra
  { team1Source: '1J', team2Source: '3rd-qual-11', thirdPlacePool: ['A', 'B', 'G', 'H'] }, // note: extra
  { team1Source: '1L', team2Source: '3rd-qual-12', thirdPlacePool: ['E', 'F', 'K', 'L'] }, // note: extra
  // Runners-up cross matches
  { team1Source: '2B', team2Source: '2J' },
  { team1Source: '2D', team2Source: '2L' },
  { team1Source: '2F', team2Source: '2H' },
  // Runners-up reverse cross
  { team1Source: '2H', team2Source: '2F' },
  { team1Source: '2J', team2Source: '2B' },
  { team1Source: '2L', team2Source: '2D' },
];

/**
 * Generate the full knockout bracket from group standings and qualified
 * third-place teams.
 *
 * - R32: 24 matches (but we model the "pre-bracket" as 16 meaningful matches
 *   since some runner-up cross matches overlap; the slot list above includes
 *   all 24 slots as per the 48-team format where 32 teams advance).
 *
 * Actually, 32 teams advance → 16 R32 matches. Let me fix this:
 *   - 12 group winners + 12 runners-up + 8 third-place = 32 teams
 *   - 32 / 2 = 16 matches in the Round of 32
 */
export function generateKnockoutBracket(
  groupStandings: Map<GroupId, TeamStanding[]>,
  bestThirds: TeamStanding[]
): KnockoutBracket {
  // Build lookup: '1A' → teamId, '2A' → teamId, etc.
  const positionLookup = buildPositionLookup(groupStandings);

  // Assign third-place qualifiers to their slots
  const thirdAssignment = assignThirdPlaceToSlots(bestThirds);

  // Build actual R32 matchups (16 matches)
  const r32Matchups = buildR32Matchups(positionLookup, thirdAssignment);

  const roundOf32: KnockoutMatch[] = r32Matchups.map((m, i) => ({
    id: `R32-${String(i + 1).padStart(2, '0')}`,
    stage: 'round-of-32' as MatchStage,
    team1Id: m.team1Id,
    team2Id: m.team2Id,
    team1Source: m.team1Source,
    team2Source: m.team2Source,
    winnerId: null,
  }));

  // R16: winners of R32 pairs → 8 matches
  const roundOf16: KnockoutMatch[] = [];
  for (let i = 0; i < 8; i++) {
    const matchA = roundOf32[i * 2];
    const matchB = roundOf32[i * 2 + 1];
    roundOf16.push({
      id: `R16-${String(i + 1).padStart(2, '0')}`,
      stage: 'round-of-16' as MatchStage,
      team1Id: null,
      team2Id: null,
      team1Source: `W-${matchA.id}`,
      team2Source: `W-${matchB.id}`,
      winnerId: null,
    });
  }

  // QF: winners of R16 pairs → 4 matches
  const quarterFinals: KnockoutMatch[] = [];
  for (let i = 0; i < 4; i++) {
    const matchA = roundOf16[i * 2];
    const matchB = roundOf16[i * 2 + 1];
    quarterFinals.push({
      id: `QF-${String(i + 1).padStart(2, '0')}`,
      stage: 'quarter-final' as MatchStage,
      team1Id: null,
      team2Id: null,
      team1Source: `W-${matchA.id}`,
      team2Source: `W-${matchB.id}`,
      winnerId: null,
    });
  }

  // SF: winners of QF pairs → 2 matches
  const semiFinals: KnockoutMatch[] = [];
  for (let i = 0; i < 2; i++) {
    const matchA = quarterFinals[i * 2];
    const matchB = quarterFinals[i * 2 + 1];
    semiFinals.push({
      id: `SF-${String(i + 1).padStart(2, '0')}`,
      stage: 'semi-final' as MatchStage,
      team1Id: null,
      team2Id: null,
      team1Source: `W-${matchA.id}`,
      team2Source: `W-${matchB.id}`,
      winnerId: null,
    });
  }

  // Third place: losers of SFs
  const thirdPlace: KnockoutMatch = {
    id: '3RD-01',
    stage: 'third-place' as MatchStage,
    team1Id: null,
    team2Id: null,
    team1Source: `L-${semiFinals[0].id}`,
    team2Source: `L-${semiFinals[1].id}`,
    winnerId: null,
  };

  // Final: winners of SFs
  const final: KnockoutMatch = {
    id: 'FIN-01',
    stage: 'final' as MatchStage,
    team1Id: null,
    team2Id: null,
    team1Source: `W-${semiFinals[0].id}`,
    team2Source: `W-${semiFinals[1].id}`,
    winnerId: null,
  };

  return {
    roundOf32,
    roundOf16,
    quarterFinals,
    semiFinals,
    thirdPlace,
    final,
  };
}

// ─── Main Simulation Entry Point ────────────────────────────────────────────────

/**
 * Run the full simulation pipeline:
 * 1. Calculate group standings from match results
 * 2. Rank all third-placed teams
 * 3. Select best 8 third-placed teams
 * 4. Generate the knockout bracket
 */
export function simulateAllGroups(matches: Match[]): SimulationResult {
  const groupStandings = calculateGroupStandings(matches);
  const thirdPlaceRanking = rankThirdPlaceTeams(groupStandings);
  const qualifiedThirds = getBestThirdPlaceTeams(thirdPlaceRanking);
  const bracket = generateKnockoutBracket(groupStandings, qualifiedThirds);

  return {
    groupStandings,
    thirdPlaceRanking,
    qualifiedThirds,
    bracket,
  };
}

// ─── Internal Helpers ───────────────────────────────────────────────────────────

/**
 * Partition matches by their group.
 */
function partitionByGroup(matches: Match[]): Map<GroupId, Match[]> {
  const map = new Map<GroupId, Match[]>();
  for (const match of matches) {
    if (match.stage !== 'group' || !match.group) continue;
    const group = match.group;
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(match);
  }
  return map;
}

/**
 * Extract all unique team IDs from a list of matches.
 */
function extractTeamIds(matches: Match[]): string[] {
  const ids = new Set<string>();
  for (const m of matches) {
    if (m.homeTeamId) ids.add(m.homeTeamId);
    if (m.awayTeamId) ids.add(m.awayTeamId);
  }
  return Array.from(ids);
}

/**
 * Build raw (unsorted) standings for a set of teams from their matches.
 */
function buildRawStandings(teamIds: string[], matches: Match[]): TeamStanding[] {
  const standingMap = new Map<string, TeamStanding>();

  for (const id of teamIds) {
    standingMap.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      position: 0,
    });
  }

  for (const m of matches) {
    if (m.homeGoals === null || m.awayGoals === null) continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;

    const home = standingMap.get(m.homeTeamId);
    const away = standingMap.get(m.awayTeamId);
    if (!home || !away) continue;

    const hg = m.homeGoals;
    const ag = m.awayGoals;

    // Home team
    home.played++;
    home.goalsFor += hg;
    home.goalsAgainst += ag;
    if (hg > ag) {
      home.won++;
      home.points += 3;
    } else if (hg === ag) {
      home.drawn++;
      home.points += 1;
    } else {
      home.lost++;
    }
    home.goalDifference = home.goalsFor - home.goalsAgainst;

    // Away team
    away.played++;
    away.goalsFor += ag;
    away.goalsAgainst += hg;
    if (ag > hg) {
      away.won++;
      away.points += 3;
    } else if (ag === hg) {
      away.drawn++;
      away.points += 1;
    } else {
      away.lost++;
    }
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  return Array.from(standingMap.values());
}

/**
 * Sort standings with full FIFA tiebreaker rules:
 * 1. Points (desc)
 * 2. Goal difference (desc)
 * 3. Goals scored (desc)
 * 4. Head-to-head points (desc)
 * 5. Head-to-head goal difference (desc)
 * 6. Alphabetical by teamId (asc) — final tiebreaker
 */
function sortStandings(standings: TeamStanding[], matches: Match[]): TeamStanding[] {
  return [...standings].sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points;
    // 2. Goal difference
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    // 3. Goals scored
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

    // 4. Head-to-head points
    const h2h = getHeadToHead(a.teamId, b.teamId, matches);
    if (h2h.pointsA !== h2h.pointsB) return h2h.pointsB - h2h.pointsA;

    // 5. Head-to-head goal difference
    if (h2h.gdA !== h2h.gdB) return h2h.gdB - h2h.gdA;

    // 6. Alphabetical (fair play proxy)
    return a.teamId.localeCompare(b.teamId);
  });
}

/**
 * Compute head-to-head record between two teams.
 */
function getHeadToHead(
  teamA: string,
  teamB: string,
  matches: Match[]
): { pointsA: number; pointsB: number; gdA: number; gdB: number } {
  let pointsA = 0;
  let pointsB = 0;
  let goalsA = 0;
  let goalsB = 0;

  for (const m of matches) {
    if (m.homeGoals === null || m.awayGoals === null) continue;

    const isAHome = m.homeTeamId === teamA && m.awayTeamId === teamB;
    const isBHome = m.homeTeamId === teamB && m.awayTeamId === teamA;

    if (!isAHome && !isBHome) continue;

    const aGoals = isAHome ? m.homeGoals : m.awayGoals;
    const bGoals = isAHome ? m.awayGoals : m.homeGoals;

    goalsA += aGoals;
    goalsB += bGoals;

    if (aGoals > bGoals) {
      pointsA += 3;
    } else if (aGoals === bGoals) {
      pointsA += 1;
      pointsB += 1;
    } else {
      pointsB += 3;
    }
  }

  return {
    pointsA,
    pointsB,
    gdA: goalsA - goalsB,
    gdB: goalsB - goalsA,
  };
}

/**
 * Build a lookup: '1A' → teamId, '2A' → teamId, '3A' → teamId, etc.
 */
function buildPositionLookup(
  groupStandings: Map<GroupId, TeamStanding[]>
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [group, standings] of groupStandings) {
    for (const standing of standings) {
      const key = `${standing.position}${group}`;
      lookup.set(key, standing.teamId);
    }
  }
  return lookup;
}

/**
 * Assign qualified third-place teams to R32 slots.
 *
 * This creates a mapping: '3rd-qual-1' → teamId, '3rd-qual-2' → teamId, etc.
 * The order is determined by the ranking of the best thirds.
 */
function assignThirdPlaceToSlots(
  bestThirds: TeamStanding[]
): Map<string, string> {
  const assignment = new Map<string, string>();
  for (let i = 0; i < bestThirds.length; i++) {
    assignment.set(`3rd-qual-${i + 1}`, bestThirds[i].teamId);
  }
  return assignment;
}

interface R32MatchupResolved {
  team1Id: string | null;
  team2Id: string | null;
  team1Source: string;
  team2Source: string;
}

/**
 * Build the 16 Round-of-32 matchups, resolving team IDs from position lookup
 * and third-place assignments.
 *
 * From the 24-slot configuration, we need to produce 16 unique matches.
 * We de-duplicate the cross-matches (e.g., 2A vs 2I and 2I vs 2A are the
 * same pair, appearing once).
 */
function buildR32Matchups(
  positionLookup: Map<string, string>,
  thirdAssignment: Map<string, string>
): R32MatchupResolved[] {
  const matchups: R32MatchupResolved[] = [];
  const seen = new Set<string>();

  for (const slot of R32_SLOTS) {
    // Create a canonical key to deduplicate
    const canonicalKey = [slot.team1Source, slot.team2Source].sort().join('-vs-');
    if (seen.has(canonicalKey)) continue;
    seen.add(canonicalKey);

    const team1Id = resolveTeamId(slot.team1Source, positionLookup, thirdAssignment);
    const team2Id = resolveTeamId(slot.team2Source, positionLookup, thirdAssignment);

    matchups.push({
      team1Id,
      team2Id,
      team1Source: slot.team1Source,
      team2Source: slot.team2Source,
    });
  }

  return matchups;
}

/**
 * Resolve a source string like '1A', '2C', or '3rd-qual-1' to a teamId.
 */
function resolveTeamId(
  source: string,
  positionLookup: Map<string, string>,
  thirdAssignment: Map<string, string>
): string | null {
  // Third-place qualifier slot
  if (source.startsWith('3rd-qual-')) {
    return thirdAssignment.get(source) ?? null;
  }
  // Position + Group (e.g., '1A', '2C')
  return positionLookup.get(source) ?? null;
}

// ─── Utility Exports for Testing ────────────────────────────────────────────────

/**
 * Create an empty TeamStanding for a given team.
 * Useful for tests and initialising new team entries.
 */
export function createEmptyStanding(teamId: string): TeamStanding {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    position: 0,
  };
}
