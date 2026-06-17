/**
 * Rodadas do bolão (premiação extra de 50 pontos por rodada).
 *
 * Uma "rodada" agrupa um conjunto de partidas:
 *   - Fase de grupos → 3 rodadas (matchday 1, 2 e 3).
 *   - Mata-mata → uma rodada por fase: 16-avos, oitavas, quartas e semis.
 *
 * A final e a disputa de 3º lugar NÃO contam como rodada premiada — a final
 * é coberta pela premiação geral do campeonato.
 *
 * A pertinência de cada partida a uma rodada é derivada do calendário
 * estático (src/data/matches.ts), cujos ids batem com os ids no banco.
 */

import { matches } from '@/data/matches';

export type RoundKey =
  | 'group-1'
  | 'group-2'
  | 'group-3'
  | 'round-of-32'
  | 'round-of-16'
  | 'quarter-final'
  | 'semi-final';

/** Ordem cronológica das rodadas (define "rodada atual" e exibição). */
export const ROUND_ORDER: RoundKey[] = [
  'group-1',
  'group-2',
  'group-3',
  'round-of-32',
  'round-of-16',
  'quarter-final',
  'semi-final',
];

export const ROUND_LABELS: Record<RoundKey, string> = {
  'group-1': 'Rodada 1 · Grupos',
  'group-2': 'Rodada 2 · Grupos',
  'group-3': 'Rodada 3 · Grupos',
  'round-of-32': '16-avos de final',
  'round-of-16': 'Oitavas de final',
  'quarter-final': 'Quartas de final',
  'semi-final': 'Semifinais',
};

/** id da partida → rodada (ou null se a partida não premia rodada). */
export function roundKeyForMatch(matchId: string): RoundKey | null {
  return matchToRound.get(matchId) ?? null;
}

/** Mapa rodada → lista de ids de partida que a compõem. */
export const ROUND_MATCH_IDS: Record<RoundKey, string[]> = {
  'group-1': [],
  'group-2': [],
  'group-3': [],
  'round-of-32': [],
  'round-of-16': [],
  'quarter-final': [],
  'semi-final': [],
};

const matchToRound = new Map<string, RoundKey>();

for (const m of matches) {
  let key: RoundKey | null = null;
  if (m.stage === 'group') {
    if (m.matchday === 1) key = 'group-1';
    else if (m.matchday === 2) key = 'group-2';
    else if (m.matchday === 3) key = 'group-3';
  } else if (m.stage === 'round-of-32') key = 'round-of-32';
  else if (m.stage === 'round-of-16') key = 'round-of-16';
  else if (m.stage === 'quarter-final') key = 'quarter-final';
  else if (m.stage === 'semi-final') key = 'semi-final';
  // third-place e final → não premiam rodada.

  if (key) {
    matchToRound.set(m.id, key);
    ROUND_MATCH_IDS[key].push(m.id);
  }
}

/** Bônus concedido ao vencedor de cada rodada. */
export const ROUND_BONUS_POINTS = 50;

/** Data UTC da última partida de cada rodada (prazo do bônus). */
export const ROUND_END_DATES: Record<RoundKey, string> = {
  'group-1': '',
  'group-2': '',
  'group-3': '',
  'round-of-32': '',
  'round-of-16': '',
  'quarter-final': '',
  'semi-final': '',
};

for (const key of ROUND_ORDER) {
  const sorted = ROUND_MATCH_IDS[key]
    .map(id => matches.find(m => m.id === id)?.dateUTC ?? '')
    .filter(Boolean)
    .sort();
  ROUND_END_DATES[key] = sorted[sorted.length - 1] ?? '';
}
