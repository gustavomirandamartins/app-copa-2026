/**
 * Pontuação de uma partida (função PURA — Task 5).
 * Usada no sync/edge quando um jogo termina.
 *
 * Regras:
 *   5 pts — acertou o vencedor E o placar exato.
 *   3 pts — acertou o vencedor E a diferença de gols (mas não o placar exato).
 *   1 pt  — acertou apenas o vencedor.
 *   0 pt  — errou o vencedor ou não preencheu o palpite.
 *
 * Observação sobre empates: empate sempre tem diferença de gols 0, então um
 * palpite de empate que bate com empate real vale 5 (exato) ou 3 (saldo certo);
 * nunca 1 ponto.
 */

export type MatchPoints = 0 | 1 | 3 | 5;

type Outcome = 'home' | 'away' | 'draw';

function outcome(home: number, away: number): Outcome {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

export function calculateMatchPoints(
  guessHome: number | null,
  guessAway: number | null,
  actualHome: number | null,
  actualAway: number | null,
): MatchPoints {
  // Não preencheu (ou jogo sem placar) → 0.
  if (
    guessHome == null ||
    guessAway == null ||
    actualHome == null ||
    actualAway == null
  ) {
    return 0;
  }

  // Placar exato.
  if (guessHome === actualHome && guessAway === actualAway) return 5;

  // Errou o vencedor → 0.
  if (outcome(guessHome, guessAway) !== outcome(actualHome, actualAway)) {
    return 0;
  }

  // Acertou o vencedor: 3 se também acertou a diferença de gols, senão 1.
  if (guessHome - guessAway === actualHome - actualAway) return 3;
  return 1;
}
