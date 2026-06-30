/**
 * Estimativa de probabilidade Vitória A — Empate — Vitória B para um confronto,
 * derivada da força relativa das seleções (posição no ranking FIFA).
 *
 * É um MODELO PRÓPRIO (rotulado como "estimativa" na UI), usado porque o
 * simulador do previsaoesportiva.com.br é renderizado por JavaScript e não
 * pode ser coletado automaticamente. As probabilidades por seleção (título,
 * fases) continuam vindo da planilha enviada pelo admin / dados UFMG.
 */
export interface WinDrawWin {
  /** Vitória do mandante (0..1). */
  home: number;
  /** Empate no tempo normal (0..1). */
  draw: number;
  /** Vitória do visitante (0..1). */
  away: number;
}

/** Rating monotônico a partir da posição no ranking FIFA (1 = melhor). */
function ratingFromRank(rank: number): number {
  const r = Math.max(1, rank || 48);
  return 2000 - 420 * Math.log(r);
}

/**
 * @param homeRank posição FIFA do mandante
 * @param awayRank posição FIFA do visitante
 * Retorna probabilidades que somam 1.
 */
export function winDrawWin(homeRank: number, awayRank: number): WinDrawWin {
  const ra = ratingFromRank(homeRank);
  const rb = ratingFromRank(awayRank);

  // Resultado esperado do mandante (inclui meio-ponto de empate), escala Elo.
  const expHome = 1 / (1 + Math.pow(10, (rb - ra) / 400));

  // O empate é mais provável em jogos equilibrados e some quando há disparidade.
  const balance = 1 - Math.min(1, Math.abs(expHome - 0.5) * 1.6);
  const draw = 0.16 + 0.16 * balance; // ~16%..32%

  const rest = 1 - draw;
  const home = rest * expHome;
  const away = rest * (1 - expHome);

  return { home, draw, away };
}

/** Converte para inteiros que somam 100 (para exibição), preservando proporção. */
export function toPercentParts(p: WinDrawWin): { home: number; draw: number; away: number } {
  const home = Math.round(p.home * 100);
  const draw = Math.round(p.draw * 100);
  const away = 100 - home - draw;
  return { home, draw, away };
}
