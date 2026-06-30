export type GroupId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export type Confederation = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC';

export type MatchStage =
  | 'group'
  | 'round-of-32'
  | 'round-of-16'
  | 'quarter-final'
  | 'semi-final'
  | 'third-place'
  | 'final';

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

export interface Team {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  flag: string;
  group: GroupId;
  confederation: Confederation;
  fifaRanking: number;
  titles: number;
  bestResult: string;
  appearances: number;
  primaryColor: string;
  secondaryColor: string;
}

export interface Stadium {
  id: string;
  name: string;
  city: string;
  country: string;
  countryFlag: string;
  capacity: number;
  timezone: string;
  utcOffset: number;
  lat: number;
  lng: number;
}

export interface Match {
  id: string;
  stage: MatchStage;
  group?: GroupId;
  matchday?: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamPlaceholder?: string;
  awayTeamPlaceholder?: string;
  homeGoals: number | null;
  awayGoals: number | null;
  // Placar da disputa de pênaltis (mata-mata). Derivado de fullTime − regularTime
  // no sync; null quando não houve disputa.
  homePenalties?: number | null;
  awayPenalties?: number | null;
  dateUTC: string;
  stadiumId: string;
  status: MatchStatus;
  matchNumber: number;
}

export interface Broadcaster {
  id: string;
  name: string;
  games: number;
  platform: string;
  url: string | null;
  type: 'free' | 'subscription';
  logo?: string;
}

export interface UfmgProbability {
  teamId: string;
  champion: number;
  final: number;
  semifinal: number;
  quarterFinal: number;
  roundOf16: number;
  roundOf32: number;
}
