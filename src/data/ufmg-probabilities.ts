import type { UfmgProbability } from '@/lib/types';

/**
 * Probabilidades do modelo matemático da UFMG (Dept. de Matemática).
 * Fonte: https://www.mat.ufmg.br/futebol/ — as 6 fases são dados reais.
 *
 * Este arquivo é a *semente* e o *fallback* das probabilidades: a página lê
 * primeiro da tabela `team_probabilities` do Supabase (atualizável pelo admin
 * via scraping) e cai para estes valores quando o banco está vazio ou ausente.
 *
 * Última coleta manual: 15/06/2026.
 */
export const UFMG_LAST_UPDATED = '2026-06-15';

const rawData: (UfmgProbability & { teamId: string })[] = [
  { teamId: 'esp', champion: 4.5, final: 8.5, semifinal: 15.45, quarterFinal: 27.5, roundOf16: 47.6, roundOf32: 85.5 },
  { teamId: 'arg', champion: 4.5, final: 8.4, semifinal: 15.49, quarterFinal: 27.4, roundOf16: 47.4, roundOf32: 84.8 },
  { teamId: 'fra', champion: 4.5, final: 8.1, semifinal: 14.96, quarterFinal: 26.6, roundOf16: 48.0, roundOf32: 81.2 },
  { teamId: 'eng', champion: 3.8, final: 7.3, semifinal: 13.79, quarterFinal: 26.0, roundOf16: 48.4, roundOf32: 85.3 },
  { teamId: 'ger', champion: 3.8, final: 8.8, semifinal: 16.45, quarterFinal: 29.9, roundOf16: 56.2, roundOf32: 98.4 },
  { teamId: 'mex', champion: 3.7, final: 7.2, semifinal: 14.14, quarterFinal: 28.1, roundOf16: 54.8, roundOf32: 95.7 },
  { teamId: 'por', champion: 3.7, final: 7.1, semifinal: 13.47, quarterFinal: 25.5, roundOf16: 46.0, roundOf32: 79.9 },
  { teamId: 'bel', champion: 3.5, final: 6.9, semifinal: 13.11, quarterFinal: 25.0, roundOf16: 47.7, roundOf32: 84.1 },
  { teamId: 'bra', champion: 3.4, final: 5.9, semifinal: 11.53, quarterFinal: 22.5, roundOf16: 42.6, roundOf32: 84.3 },
  { teamId: 'ned', champion: 3.2, final: 5.2, semifinal: 10.29, quarterFinal: 20.0, roundOf16: 37.5, roundOf32: 74.7 },
  { teamId: 'mar', champion: 3.0, final: 5.5, semifinal: 10.94, quarterFinal: 21.8, roundOf16: 41.4, roundOf32: 83.4 },
  { teamId: 'cro', champion: 3.0, final: 5.8, semifinal: 11.39, quarterFinal: 22.2, roundOf16: 43.2, roundOf32: 80.5 },
  { teamId: 'kor', champion: 3.0, final: 5.9, semifinal: 11.91, quarterFinal: 24.8, roundOf16: 51.1, roundOf32: 93.9 },
  { teamId: 'usa', champion: 2.7, final: 7.8, semifinal: 14.91, quarterFinal: 28.7, roundOf16: 55.3, roundOf32: 96.7 },
  { teamId: 'sen', champion: 2.6, final: 5.0, semifinal: 9.84, quarterFinal: 19.0, roundOf16: 37.0, roundOf32: 69.4 },
  { teamId: 'uru', champion: 2.3, final: 4.6, semifinal: 9.13, quarterFinal: 17.8, roundOf16: 34.2, roundOf32: 71.2 },
  { teamId: 'sui', champion: 2.1, final: 3.8, semifinal: 7.96, quarterFinal: 17.2, roundOf16: 36.4, roundOf32: 73.3 },
  { teamId: 'col', champion: 2.1, final: 4.3, semifinal: 8.74, quarterFinal: 17.7, roundOf16: 35.1, roundOf32: 68.2 },
  { teamId: 'irn', champion: 2.0, final: 4.3, semifinal: 8.76, quarterFinal: 18.0, roundOf16: 37.7, roundOf32: 74.1 },
  { teamId: 'jpn', champion: 2.0, final: 4.0, semifinal: 8.16, quarterFinal: 16.6, roundOf16: 33.0, roundOf32: 70.2 },
  { teamId: 'civ', champion: 2.0, final: 5.9, semifinal: 11.99, quarterFinal: 23.6, roundOf16: 48.5, roundOf32: 95.1 },
  { teamId: 'aut', champion: 2.0, final: 4.0, semifinal: 8.22, quarterFinal: 16.4, roundOf16: 32.2, roundOf32: 67.6 },
  { teamId: 'alg', champion: 1.9, final: 3.9, semifinal: 8.06, quarterFinal: 16.2, roundOf16: 32.0, roundOf32: 68.1 },
  { teamId: 'tur', champion: 1.9, final: 1.8, semifinal: 3.72, quarterFinal: 7.5, roundOf16: 16.2, roundOf32: 36.2 },
  { teamId: 'nor', champion: 1.9, final: 3.8, semifinal: 7.65, quarterFinal: 15.3, roundOf16: 31.1, roundOf32: 61.9 },
  { teamId: 'ecu', champion: 1.8, final: 2.3, semifinal: 4.75, quarterFinal: 10.3, roundOf16: 22.1, roundOf32: 51.3 },
  { teamId: 'par', champion: 1.8, final: 2.0, semifinal: 4.19, quarterFinal: 8.5, roundOf16: 18.4, roundOf32: 40.1 },
  { teamId: 'swe', champion: 1.7, final: 5.6, semifinal: 11.50, quarterFinal: 24.1, roundOf16: 46.5, roundOf32: 96.9 },
  { teamId: 'egy', champion: 1.6, final: 3.5, semifinal: 7.40, quarterFinal: 15.6, roundOf16: 34.0, roundOf32: 69.7 },
  { teamId: 'sco', champion: 1.6, final: 4.5, semifinal: 9.45, quarterFinal: 20.0, roundOf16: 41.2, roundOf32: 90.5 },
  { teamId: 'tun', champion: 1.6, final: 1.4, semifinal: 2.92, quarterFinal: 6.0, roundOf16: 12.6, roundOf32: 29.0 },
  { teamId: 'cod', champion: 1.5, final: 3.2, semifinal: 6.74, quarterFinal: 14.1, roundOf16: 29.5, roundOf32: 60.6 },
  { teamId: 'can', champion: 1.5, final: 2.7, semifinal: 6.01, quarterFinal: 13.8, roundOf16: 30.1, roundOf32: 64.7 },
  { teamId: 'aus', champion: 1.4, final: 5.1, semifinal: 10.54, quarterFinal: 21.7, roundOf16: 46.7, roundOf32: 92.8 },
  { teamId: 'irq', champion: 1.4, final: 2.8, semifinal: 5.83, quarterFinal: 12.1, roundOf16: 25.5, roundOf32: 53.3 },
  { teamId: 'uzb', champion: 1.4, final: 2.9, semifinal: 6.07, quarterFinal: 12.9, roundOf16: 27.3, roundOf32: 57.2 },
  { teamId: 'ksa', champion: 1.3, final: 2.8, semifinal: 5.95, quarterFinal: 12.3, roundOf16: 25.4, roundOf32: 58.5 },
  { teamId: 'qat', champion: 1.2, final: 2.7, semifinal: 5.85, quarterFinal: 13.3, roundOf16: 30.1, roundOf32: 65.6 },
  { teamId: 'bih', champion: 1.2, final: 2.4, semifinal: 5.45, quarterFinal: 12.5, roundOf16: 28.4, roundOf32: 62.4 },
  { teamId: 'cze', champion: 1.0, final: 2.0, semifinal: 4.27, quarterFinal: 9.4, roundOf16: 20.2, roundOf32: 43.4 },
  { teamId: 'pan', champion: 0.9, final: 2.0, semifinal: 4.41, quarterFinal: 10.0, roundOf16: 22.8, roundOf32: 54.5 },
  { teamId: 'cpv', champion: 0.9, final: 1.9, semifinal: 4.12, quarterFinal: 8.9, roundOf16: 19.5, roundOf32: 49.0 },
  { teamId: 'jor', champion: 0.8, final: 1.7, semifinal: 3.67, quarterFinal: 8.1, roundOf16: 17.9, roundOf32: 43.4 },
  { teamId: 'gha', champion: 0.7, final: 1.5, semifinal: 3.39, quarterFinal: 7.9, roundOf16: 18.7, roundOf32: 46.9 },
  { teamId: 'rsa', champion: 0.6, final: 1.3, semifinal: 2.89, quarterFinal: 6.6, roundOf16: 15.0, roundOf32: 33.7 },
  { teamId: 'hai', champion: 0.5, final: 0.4, semifinal: 0.91, quarterFinal: 2.2, roundOf16: 5.4, roundOf32: 16.0 },
  { teamId: 'nzl', champion: 0.5, final: 1.1, semifinal: 2.52, quarterFinal: 6.0, roundOf16: 15.4, roundOf32: 38.3 },
  { teamId: 'cuw', champion: 0.5, final: 0.5, semifinal: 1.10, quarterFinal: 2.7, roundOf16: 6.7, roundOf32: 18.6 },
];

export const ufmgProbabilities: UfmgProbability[] = rawData;

const probByTeamId = new Map<string, UfmgProbability>(
  ufmgProbabilities.map((p) => [p.teamId, p])
);

export function getTeamProbability(teamId: string): UfmgProbability | undefined {
  return probByTeamId.get(teamId);
}

export type ProbStage = 'champion' | 'final' | 'semifinal' | 'quarterFinal' | 'roundOf16' | 'roundOf32';

export function getProbabilitiesByStage(
  stage: ProbStage
): { teamId: string; probability: number }[] {
  return ufmgProbabilities
    .map((p) => ({ teamId: p.teamId, probability: p[stage] }))
    .sort((a, b) => b.probability - a.probability);
}

/** Mapeia o nome da seleção (PT-BR, como aparece nas tabelas da UFMG) → teamId. */
export const UFMG_NAME_TO_TEAM_ID: Record<string, string> = {
  ESPANHA: 'esp', ARGENTINA: 'arg', 'FRANÇA': 'fra', INGLATERRA: 'eng', ALEMANHA: 'ger',
  'MÉXICO': 'mex', PORTUGAL: 'por', 'BÉLGICA': 'bel', BRASIL: 'bra', HOLANDA: 'ned',
  MARROCOS: 'mar', 'CROÁCIA': 'cro', 'COREIA DO SUL': 'kor', 'ESTADOS UNIDOS': 'usa', SENEGAL: 'sen',
  URUGUAI: 'uru', 'SUÍÇA': 'sui', 'COLÔMBIA': 'col', 'IRÃ': 'irn', 'JAPÃO': 'jpn',
  'COSTA DO MARFIM': 'civ', 'ÁUSTRIA': 'aut', 'ARGÉLIA': 'alg', TURQUIA: 'tur', NORUEGA: 'nor',
  EQUADOR: 'ecu', PARAGUAI: 'par', 'SUÉCIA': 'swe', EGITO: 'egy', 'ESCÓCIA': 'sco',
  'TUNÍSIA': 'tun', 'RD CONGO': 'cod', 'CANADÁ': 'can', 'AUSTRÁLIA': 'aus', IRAQUE: 'irq',
  'UZBEQUISTÃO': 'uzb', 'ARÁBIA SAUDITA': 'ksa', CATAR: 'qat', 'BÓSNIA E HERZEGOVINA': 'bih',
  'REPÚBLICA TCHECA': 'cze', 'PANAMÁ': 'pan', 'CABO VERDE': 'cpv', 'JORDÂNIA': 'jor', GANA: 'gha',
  'ÁFRICA DO SUL': 'rsa', HAITI: 'hai', 'NOVA ZELÂNDIA': 'nzl', 'CURAÇAO': 'cuw',
};
