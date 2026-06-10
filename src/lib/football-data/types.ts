/**
 * Tipos do subconjunto da API football-data.org (v4) que usamos.
 * Confirmados na doc: https://docs.football-data.org/general/v4/match.html
 */

export type FdStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'AWARDED';

export type FdStage =
  | 'GROUP_STAGE'
  | 'LAST_32'
  | 'LAST_16'
  | 'QUARTER_FINALS'
  | 'SEMI_FINALS'
  | 'THIRD_PLACE'
  | 'FINAL';

export interface FdTeam {
  id: number;
  name: string;
  tla: string | null; // sigla FIFA de 3 letras, ex.: "BRA"
}

export interface FdScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface FdMatch {
  id: number;
  utcDate: string;
  status: FdStatus;
  stage: FdStage;
  group: string | null; // ex.: "GROUP_A"
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: FdScore;
}

export interface FdMatchesResponse {
  matches: FdMatch[];
}

export interface FdStandingRow {
  position: number;
  team: FdTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface FdStanding {
  stage: string;
  type: 'TOTAL' | 'HOME' | 'AWAY';
  group: string | null;
  table: FdStandingRow[];
}

export interface FdStandingsResponse {
  standings: FdStanding[];
}
