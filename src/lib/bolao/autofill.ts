/**
 * Gerador "estatístico" de placares (MOCK).
 * Por enquanto, pondera os gols esperados pelo ranking FIFA relativo
 * das seleções via amostragem Poisson + leve vantagem de mando.
 * Função pura — sem efeitos colaterais, pronta para troca futura
 * por um modelo real (ex.: probabilidades UFMG).
 */

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Ranking FIFA (1 = melhor) → força em [0,1]. */
function rankingToStrength(fifaRanking: number): number {
  return clamp01(1 - (fifaRanking - 1) / 100);
}

/** Amostra um número de gols a partir de uma força [0,1] (Poisson ponderado). */
function sampleGoals(strength: number): number {
  const lambda = 0.6 + strength * 1.8; // ~0.6 a 2.4 gols esperados
  const r = Math.random();
  let goals = 0;
  let p = Math.exp(-lambda);
  let cumulative = p;
  while (r > cumulative && goals < 6) {
    goals += 1;
    p *= lambda / goals;
    cumulative += p;
  }
  return goals;
}

export function simulateScore(
  homeFifaRanking: number,
  awayFifaRanking: number,
): { home: number; away: number } {
  const homeStrength = rankingToStrength(homeFifaRanking) + 0.08; // mando de campo
  const awayStrength = rankingToStrength(awayFifaRanking);
  return {
    home: sampleGoals(clamp01(homeStrength)),
    away: sampleGoals(clamp01(awayStrength)),
  };
}
