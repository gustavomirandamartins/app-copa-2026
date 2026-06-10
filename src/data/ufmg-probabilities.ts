import type { UfmgProbability } from '@/lib/types';

// Source: https://www.mat.ufmg.br/futebol/ — all 6 stages are real UFMG data
const rawData: (UfmgProbability & { teamId: string })[] = [
  { teamId: 'fra', champion: 4.6,  final: 8.4,  semifinal: 15.43, quarterFinal: 27.5, roundOf16: 49.5, roundOf32: 83.7 },
  { teamId: 'esp', champion: 4.6,  final: 8.6,  semifinal: 15.56, quarterFinal: 27.6, roundOf16: 47.7, roundOf32: 84.9 },
  { teamId: 'arg', champion: 4.5,  final: 8.4,  semifinal: 15.41, quarterFinal: 27.4, roundOf16: 47.2, roundOf32: 85.2 },
  { teamId: 'eng', champion: 3.8,  final: 7.3,  semifinal: 13.97, quarterFinal: 26.3, roundOf16: 48.7, roundOf32: 85.4 },
  { teamId: 'ger', champion: 3.7,  final: 7.0,  semifinal: 13.29, quarterFinal: 24.6, roundOf16: 47.0, roundOf32: 82.9 },
  { teamId: 'por', champion: 3.7,  final: 7.1,  semifinal: 13.45, quarterFinal: 25.4, roundOf16: 46.3, roundOf32: 80.4 },
  { teamId: 'bel', champion: 3.5,  final: 6.8,  semifinal: 13.01, quarterFinal: 24.8, roundOf16: 47.0, roundOf32: 83.7 },
  { teamId: 'bra', champion: 3.3,  final: 6.3,  semifinal: 12.01, quarterFinal: 22.9, roundOf16: 42.1, roundOf32: 82.0 },
  { teamId: 'ned', champion: 3.2,  final: 6.1,  semifinal: 11.72, quarterFinal: 22.3, roundOf16: 40.0, roundOf32: 76.3 },
  { teamId: 'cro', champion: 3.0,  final: 5.9,  semifinal: 11.54, quarterFinal: 22.5, roundOf16: 43.5, roundOf32: 80.6 },
  { teamId: 'mar', champion: 2.8,  final: 5.5,  semifinal: 10.86, quarterFinal: 21.2, roundOf16: 39.7, roundOf32: 79.9 },
  { teamId: 'usa', champion: 2.7,  final: 5.5,  semifinal: 10.74, quarterFinal: 21.0, roundOf16: 41.5, roundOf32: 75.1 },
  { teamId: 'mex', champion: 2.6,  final: 5.2,  semifinal: 10.42, quarterFinal: 21.0, roundOf16: 41.9, roundOf32: 76.0 },
  { teamId: 'ecu', champion: 2.5,  final: 5.0,  semifinal:  9.95, quarterFinal: 19.5, roundOf16: 39.4, roundOf32: 75.2 },
  { teamId: 'sen', champion: 2.5,  final: 4.9,  semifinal:  9.68, quarterFinal: 18.9, roundOf16: 37.5, roundOf32: 71.3 },
  { teamId: 'uru', champion: 2.3,  final: 4.6,  semifinal:  9.20, quarterFinal: 17.9, roundOf16: 34.3, roundOf32: 70.2 },
  { teamId: 'civ', champion: 2.1,  final: 4.2,  semifinal:  8.53, quarterFinal: 17.1, roundOf16: 35.5, roundOf32: 70.4 },
  { teamId: 'col', champion: 2.1,  final: 4.2,  semifinal:  8.57, quarterFinal: 17.3, roundOf16: 34.8, roundOf32: 68.0 },
  { teamId: 'sui', champion: 2.1,  final: 4.3,  semifinal:  8.74, quarterFinal: 18.3, roundOf16: 38.3, roundOf32: 75.2 },
  { teamId: 'swe', champion: 2.1,  final: 4.1,  semifinal:  8.30, quarterFinal: 16.6, roundOf16: 31.8, roundOf32: 65.9 },
  { teamId: 'jpn', champion: 2.0,  final: 4.0,  semifinal:  8.15, quarterFinal: 16.4, roundOf16: 31.5, roundOf32: 66.0 },
  { teamId: 'irn', champion: 2.0,  final: 4.2,  semifinal:  8.61, quarterFinal: 17.7, roundOf16: 36.9, roundOf32: 73.2 },
  { teamId: 'tur', champion: 1.9,  final: 3.9,  semifinal:  7.95, quarterFinal: 16.1, roundOf16: 33.7, roundOf32: 65.9 },
  { teamId: 'kor', champion: 1.9,  final: 3.8,  semifinal:  7.91, quarterFinal: 16.7, roundOf16: 34.9, roundOf32: 67.3 },
  { teamId: 'nor', champion: 1.9,  final: 3.8,  semifinal:  7.79, quarterFinal: 15.7, roundOf16: 32.4, roundOf32: 65.2 },
  { teamId: 'aut', champion: 1.8,  final: 3.7,  semifinal:  7.61, quarterFinal: 15.4, roundOf16: 30.5, roundOf32: 65.8 },
  { teamId: 'cze', champion: 1.8,  final: 3.6,  semifinal:  7.49, quarterFinal: 15.9, roundOf16: 33.5, roundOf32: 65.5 },
  { teamId: 'alg', champion: 1.7,  final: 3.6,  semifinal:  7.44, quarterFinal: 15.2, roundOf16: 30.3, roundOf32: 66.3 },
  { teamId: 'aus', champion: 1.7,  final: 3.5,  semifinal:  7.22, quarterFinal: 14.9, roundOf16: 31.6, roundOf32: 63.2 },
  { teamId: 'sco', champion: 1.6,  final: 3.4,  semifinal:  6.99, quarterFinal: 14.6, roundOf16: 29.8, roundOf32: 66.3 },
  { teamId: 'par', champion: 1.6,  final: 3.5,  semifinal:  7.19, quarterFinal: 14.9, roundOf16: 31.8, roundOf32: 63.6 },
  { teamId: 'ksa', champion: 1.6,  final: 3.4,  semifinal:  7.00, quarterFinal: 14.2, roundOf16: 28.4, roundOf32: 62.2 },
  { teamId: 'tun', champion: 1.6,  final: 3.2,  semifinal:  6.64, quarterFinal: 13.6, roundOf16: 26.8, roundOf32: 58.5 },
  { teamId: 'egy', champion: 1.6,  final: 3.4,  semifinal:  7.11, quarterFinal: 15.1, roundOf16: 32.8, roundOf32: 68.2 },
  { teamId: 'can', champion: 1.5,  final: 3.2,  semifinal:  6.90, quarterFinal: 15.4, roundOf16: 33.3, roundOf32: 70.0 },
  { teamId: 'cod', champion: 1.5,  final: 3.1,  semifinal:  6.57, quarterFinal: 13.8, roundOf16: 29.1, roundOf32: 60.2 },
  { teamId: 'uzb', champion: 1.4,  final: 2.9,  semifinal:  6.13, quarterFinal: 13.0, roundOf16: 27.7, roundOf32: 57.9 },
  { teamId: 'rsa', champion: 1.2,  final: 2.7,  semifinal:  5.77, quarterFinal: 12.8, roundOf16: 28.4, roundOf32: 58.2 },
  { teamId: 'bih', champion: 1.2,  final: 2.6,  semifinal:  5.69, quarterFinal: 12.9, roundOf16: 29.3, roundOf32: 63.7 },
  { teamId: 'qat', champion: 1.0,  final: 2.3,  semifinal:  5.00, quarterFinal: 11.4, roundOf16: 26.4, roundOf32: 58.9 },
  { teamId: 'pan', champion: 0.9,  final: 2.0,  semifinal:  4.48, quarterFinal: 10.1, roundOf16: 23.0, roundOf32: 54.7 },
  { teamId: 'irq', champion: 0.9,  final: 1.9,  semifinal:  4.13, quarterFinal:  9.0, roundOf16: 20.3, roundOf32: 46.3 },
  { teamId: 'jor', champion: 0.9,  final: 1.9,  semifinal:  4.16, quarterFinal:  9.1, roundOf16: 19.7, roundOf32: 47.3 },
  { teamId: 'cpv', champion: 0.9,  final: 1.9,  semifinal:  4.14, quarterFinal:  9.0, roundOf16: 19.4, roundOf32: 47.8 },
  { teamId: 'gha', champion: 0.7,  final: 1.5,  semifinal:  3.43, quarterFinal:  8.0, roundOf16: 18.9, roundOf32: 47.1 },
  { teamId: 'nzl', champion: 0.6,  final: 1.3,  semifinal:  2.94, quarterFinal:  6.9, roundOf16: 17.1, roundOf32: 41.8 },
  { teamId: 'cur', champion: 0.5,  final: 1.1,  semifinal:  2.58, quarterFinal:  6.0, roundOf16: 15.0, roundOf32: 37.7 },
  { teamId: 'hti', champion: 0.5,  final: 1.1,  semifinal:  2.58, quarterFinal:  6.0, roundOf16: 14.2, roundOf32: 39.0 },
];

export const ufmgProbabilities: UfmgProbability[] = rawData;

const probByTeamId = new Map<string, UfmgProbability>(
  ufmgProbabilities.map((p) => [p.teamId, p])
);

export function getTeamProbability(teamId: string): UfmgProbability | undefined {
  return probByTeamId.get(teamId);
}

type ProbStage = 'champion' | 'final' | 'semifinal' | 'quarterFinal' | 'roundOf16' | 'roundOf32';

export function getProbabilitiesByStage(
  stage: ProbStage
): { teamId: string; probability: number }[] {
  return ufmgProbabilities
    .map((p) => ({ teamId: p.teamId, probability: p[stage] }))
    .sort((a, b) => b.probability - a.probability);
}
