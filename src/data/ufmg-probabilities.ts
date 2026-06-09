import type { UfmgProbability } from '@/lib/types';

/**
 * UFMG probability data for the 2026 FIFA World Cup.
 *
 * Champion and Round-of-32 probabilities are sourced directly from UFMG.
 * Intermediate stages (final, semifinal, quarterFinal, roundOf16) are
 * interpolated between champion% and roundOf32%.
 *
 * Interpolation formula:
 *   roundOf16   = roundOf32 - (roundOf32 - champion) * 0.15
 *   quarterFinal = roundOf32 - (roundOf32 - champion) * 0.35
 *   semifinal    = roundOf32 - (roundOf32 - champion) * 0.60
 *   final        = roundOf32 - (roundOf32 - champion) * 0.82
 */

interface RawProbEntry {
  teamId: string;
  namePt: string;
  champion: number;
  roundOf32: number;
}

const rawData: RawProbEntry[] = [
  { teamId: 'fra', namePt: 'França', champion: 4.6, roundOf32: 83.7 },
  { teamId: 'esp', namePt: 'Espanha', champion: 4.6, roundOf32: 84.9 },
  { teamId: 'arg', namePt: 'Argentina', champion: 4.5, roundOf32: 85.2 },
  { teamId: 'eng', namePt: 'Inglaterra', champion: 3.8, roundOf32: 85.4 },
  { teamId: 'ger', namePt: 'Alemanha', champion: 3.7, roundOf32: 82.9 },
  { teamId: 'por', namePt: 'Portugal', champion: 3.7, roundOf32: 80.4 },
  { teamId: 'bel', namePt: 'Bélgica', champion: 3.5, roundOf32: 83.7 },
  { teamId: 'bra', namePt: 'Brasil', champion: 3.3, roundOf32: 82.0 },
  { teamId: 'ned', namePt: 'Holanda', champion: 3.2, roundOf32: 76.3 },
  { teamId: 'cro', namePt: 'Croácia', champion: 3.0, roundOf32: 80.6 },
  { teamId: 'mar', namePt: 'Marrocos', champion: 2.8, roundOf32: 79.9 },
  { teamId: 'usa', namePt: 'EUA', champion: 2.7, roundOf32: 75.1 },
  { teamId: 'mex', namePt: 'México', champion: 2.6, roundOf32: 76.0 },
  { teamId: 'ecu', namePt: 'Equador', champion: 2.5, roundOf32: 75.2 },
  { teamId: 'sen', namePt: 'Senegal', champion: 2.5, roundOf32: 71.3 },
  { teamId: 'uru', namePt: 'Uruguai', champion: 2.3, roundOf32: 70.2 },
  { teamId: 'civ', namePt: 'Costa do Marfim', champion: 2.1, roundOf32: 70.4 },
  { teamId: 'col', namePt: 'Colômbia', champion: 2.1, roundOf32: 68.0 },
  { teamId: 'sui', namePt: 'Suíça', champion: 2.1, roundOf32: 75.2 },
  { teamId: 'swe', namePt: 'Suécia', champion: 2.1, roundOf32: 65.9 },
  { teamId: 'jpn', namePt: 'Japão', champion: 2.0, roundOf32: 66.0 },
  { teamId: 'irn', namePt: 'Irã', champion: 2.0, roundOf32: 73.2 },
  { teamId: 'tur', namePt: 'Turquia', champion: 1.9, roundOf32: 65.9 },
  { teamId: 'kor', namePt: 'Coreia do Sul', champion: 1.9, roundOf32: 67.3 },
  { teamId: 'nor', namePt: 'Noruega', champion: 1.9, roundOf32: 65.2 },
  { teamId: 'aut', namePt: 'Áustria', champion: 1.8, roundOf32: 65.8 },
  { teamId: 'cze', namePt: 'República Tcheca', champion: 1.8, roundOf32: 65.5 },
  { teamId: 'alg', namePt: 'Argélia', champion: 1.7, roundOf32: 66.3 },
  { teamId: 'aus', namePt: 'Austrália', champion: 1.7, roundOf32: 63.2 },
  { teamId: 'sco', namePt: 'Escócia', champion: 1.6, roundOf32: 66.3 },
  { teamId: 'par', namePt: 'Paraguai', champion: 1.6, roundOf32: 63.6 },
  { teamId: 'ksa', namePt: 'Arábia Saudita', champion: 1.6, roundOf32: 62.2 },
  { teamId: 'tun', namePt: 'Tunísia', champion: 1.6, roundOf32: 58.5 },
  { teamId: 'egy', namePt: 'Egito', champion: 1.6, roundOf32: 68.2 },
  { teamId: 'can', namePt: 'Canadá', champion: 1.5, roundOf32: 70.0 },
  { teamId: 'cod', namePt: 'RD Congo', champion: 1.5, roundOf32: 60.2 },
  { teamId: 'uzb', namePt: 'Uzbequistão', champion: 1.4, roundOf32: 57.9 },
  { teamId: 'rsa', namePt: 'África do Sul', champion: 1.2, roundOf32: 58.2 },
  { teamId: 'bih', namePt: 'Bósnia e Herzegovina', champion: 1.2, roundOf32: 63.7 },
  { teamId: 'qat', namePt: 'Catar', champion: 1.0, roundOf32: 58.9 },
  { teamId: 'pan', namePt: 'Panamá', champion: 0.9, roundOf32: 54.7 },
  { teamId: 'irq', namePt: 'Iraque', champion: 0.9, roundOf32: 46.3 },
  { teamId: 'jor', namePt: 'Jordânia', champion: 0.9, roundOf32: 47.3 },
  { teamId: 'cpv', namePt: 'Cabo Verde', champion: 0.9, roundOf32: 47.8 },
  { teamId: 'gha', namePt: 'Gana', champion: 0.7, roundOf32: 47.1 },
  { teamId: 'nzl', namePt: 'Nova Zelândia', champion: 0.6, roundOf32: 41.8 },
  { teamId: 'cur', namePt: 'Curaçao', champion: 0.5, roundOf32: 37.7 },
  { teamId: 'hti', namePt: 'Haiti', champion: 0.5, roundOf32: 39.0 },
];

/**
 * Interpolate intermediate-stage probabilities from champion and roundOf32.
 */
function interpolate(champion: number, roundOf32: number): UfmgProbability & { teamId: string } {
  const range = roundOf32 - champion;
  return {
    teamId: '', // will be set below
    champion: round2(champion),
    roundOf32: round2(roundOf32),
    roundOf16: round2(roundOf32 - range * 0.15),
    quarterFinal: round2(roundOf32 - range * 0.35),
    semifinal: round2(roundOf32 - range * 0.60),
    final: round2(roundOf32 - range * 0.82),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Full UFMG probability dataset for all 48 World Cup 2026 teams.
 * Champion and roundOf32 are real UFMG data; other stages are interpolated.
 */
export const ufmgProbabilities: UfmgProbability[] = rawData.map((entry) => {
  const probs = interpolate(entry.champion, entry.roundOf32);
  return {
    ...probs,
    teamId: entry.teamId,
  };
});

// Lookup map for O(1) access by teamId
const probByTeamId = new Map<string, UfmgProbability>(
  ufmgProbabilities.map((p) => [p.teamId, p])
);

/**
 * Get the UFMG probability entry for a specific team.
 */
export function getTeamProbability(teamId: string): UfmgProbability | undefined {
  return probByTeamId.get(teamId);
}

type ProbStage = 'champion' | 'final' | 'semifinal' | 'quarterFinal' | 'roundOf16' | 'roundOf32';

/**
 * Get all teams' probabilities for a specific tournament stage,
 * sorted descending by probability.
 */
export function getProbabilitiesByStage(
  stage: ProbStage
): { teamId: string; probability: number }[] {
  return ufmgProbabilities
    .map((p) => ({
      teamId: p.teamId,
      probability: p[stage],
    }))
    .sort((a, b) => b.probability - a.probability);
}
