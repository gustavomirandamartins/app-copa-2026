/**
 * "Ainda vale a pena entrar no Bolão?" — termômetro de oportunidade.
 *
 * Quem entra agora só pode pontuar em partidas que ainda NÃO começaram
 * (o palpite é registrado antes do apito inicial). Conforme os jogos vão
 * acontecendo, o teto de pontos que um novato pode conquistar diminui —
 * é isso que o termômetro mostra.
 *
 * Pontos em disputa:
 *   • até 5 por partida (placar exato);
 *   • +50 por rodada vencida (7 rodadas premiadas);
 *   • +5 por indicação paga (ILIMITADO — o curinga que mantém todo mundo
 *     no jogo; fica de fora da conta do teto por não ter limite).
 *
 * Derivado do calendário estático (datas), então funciona mesmo sem banco.
 */

import { matches } from '@/data/matches';
import { ROUND_ORDER, ROUND_MATCH_IDS, ROUND_BONUS_POINTS } from './rounds';

export const MAX_POINTS_PER_MATCH = 5;

export interface ThermometerData {
  totalMatches: number;
  remainingMatches: number;
  totalRounds: number;
  remainingRounds: number;
  /** Teto de pontos ainda conquistável agora (partidas + bônus de rodada). */
  stillAchievable: number;
  /** Teto de pontos no começo da Copa (referência do 100%). */
  totalAtStart: number;
  /** stillAchievable / totalAtStart, 0–100. */
  pct: number;
}

export function computeThermometer(now: Date = new Date()): ThermometerData {
  const t = now.getTime();
  const dateById = new Map(
    matches.map((m) => [m.id, new Date(m.dateUTC).getTime()]),
  );

  let remainingMatches = 0;
  for (const m of matches) {
    if (new Date(m.dateUTC).getTime() > t) remainingMatches += 1;
  }

  let remainingRounds = 0;
  for (const rk of ROUND_ORDER) {
    // Rodada ainda "vencível" por um novato se tem ao menos um jogo no futuro.
    const winnable = ROUND_MATCH_IDS[rk].some((id) => (dateById.get(id) ?? 0) > t);
    if (winnable) remainingRounds += 1;
  }

  const totalMatches = matches.length;
  const totalRounds = ROUND_ORDER.length;

  const totalAtStart = totalMatches * MAX_POINTS_PER_MATCH + totalRounds * ROUND_BONUS_POINTS;
  const stillAchievable =
    remainingMatches * MAX_POINTS_PER_MATCH + remainingRounds * ROUND_BONUS_POINTS;

  const pct = totalAtStart > 0 ? Math.round((stillAchievable / totalAtStart) * 100) : 0;

  return {
    totalMatches,
    remainingMatches,
    totalRounds,
    remainingRounds,
    stillAchievable,
    totalAtStart,
    pct,
  };
}

export type VerdictTone = 'hot' | 'warm' | 'tight' | 'cold';

export interface Verdict {
  tone: VerdictTone;
  title: string;
  text: string;
}

/**
 * Veredito do termômetro: compara o teto conquistável agora com a pontuação
 * do líder atual. Um novato começa do zero, então enquanto o que ele ainda
 * pode somar superar o líder, dá pra virar.
 */
export function verdictFor(stillAchievable: number, leaderPoints: number): Verdict {
  if (leaderPoints <= 0 || stillAchievable > leaderPoints * 1.5) {
    return {
      tone: 'hot',
      title: 'Tá só começando!',
      text: 'Há pontos de sobra em disputa. Dá tempo de assumir a liderança.',
    };
  }
  if (stillAchievable > leaderPoints) {
    return {
      tone: 'warm',
      title: 'Ainda dá pra virar!',
      text: 'Os pontos em jogo ainda superam a liderança atual.',
    };
  }
  if (stillAchievable > leaderPoints * 0.5) {
    return {
      tone: 'tight',
      title: 'Apertado, mas possível',
      text: 'Com os bônus de rodada e de indicação, a virada continua viva.',
    };
  }
  return {
    tone: 'cold',
    title: 'Reta final',
    text: 'Entre pela diversão — e some pontos indicando amigos (bônus ilimitado).',
  };
}
