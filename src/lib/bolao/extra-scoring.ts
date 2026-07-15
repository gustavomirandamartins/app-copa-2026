import {
  EXTRA_POINTS_PER_CATEGORY,
  type ExtraCategory,
  type ExtraPredictionInput,
  type ExtraResultRow,
} from './extra-bets';

/**
 * Pontuação dos palpites extras — puro, espelho do estilo de scoring.ts.
 *
 * Cada categoria vale EXTRA_POINTS_PER_CATEGORY no acerto EXATO; 0 no erro;
 * `null` quando a categoria está anulada (fase não ocorreu — "caso ocorra")
 * ou o dado real ainda não existe (ex.: admin não digitou os cartões).
 * Categoria anulada não pontua para ninguém e não penaliza ninguém.
 */
export interface ExtraPointsBreakdown {
  total: number;
  byCategory: Record<ExtraCategory, number | null>;
}

function exactPair(
  guessA: number | null, guessB: number | null,
  actualA: number | null, actualB: number | null,
): number | null {
  // Sem dado real → categoria ainda não apurável.
  if (actualA == null || actualB == null) return null;
  if (guessA == null || guessB == null) return 0; // não palpitou → 0
  return guessA === actualA && guessB === actualB ? EXTRA_POINTS_PER_CATEGORY : 0;
}

function exactSingle(guess: number | null, actual: number | null): number | null {
  if (actual == null) return null;
  if (guess == null) return 0;
  return guess === actual ? EXTRA_POINTS_PER_CATEGORY : 0;
}

export function calculateExtraPoints(
  guess: ExtraPredictionInput,
  actual: ExtraResultRow,
): ExtraPointsBreakdown {
  const byCategory: Record<ExtraCategory, number | null> = {
    ht: exactPair(guess.ht_home, guess.ht_away, actual.ht_home, actual.ht_away),

    // 2º tempo é derivado (rt − ht) — a football-data não fornece direto.
    h2:
      actual.rt_home != null && actual.rt_away != null && actual.ht_home != null && actual.ht_away != null
        ? exactPair(
            guess.h2_home, guess.h2_away,
            actual.rt_home - actual.ht_home, actual.rt_away - actual.ht_away,
          )
        : null,

    // "Caso ocorra": só apura quando duration confirma a fase. Se o jogo
    // terminou no tempo normal, prorrogação/pênaltis ficam anulados (null).
    et:
      actual.duration === 'EXTRA_TIME' || actual.duration === 'PENALTY_SHOOTOUT'
        ? exactPair(guess.et_home, guess.et_away, actual.et_home, actual.et_away)
        : actual.duration == null
          ? null
          : null,

    pen:
      actual.duration === 'PENALTY_SHOOTOUT'
        ? exactPair(guess.pen_home, guess.pen_away, actual.pen_home, actual.pen_away)
        : null,

    yellowHome: exactSingle(guess.yellow_home, actual.yellow_home),
    yellowAway: exactSingle(guess.yellow_away, actual.yellow_away),
    redHome: exactSingle(guess.red_home, actual.red_home),
    redAway: exactSingle(guess.red_away, actual.red_away),

    firstGoal:
      actual.first_goal == null
        ? null
        : guess.first_goal == null
          ? 0
          : guess.first_goal === actual.first_goal
            ? EXTRA_POINTS_PER_CATEGORY
            : 0,

    shotsHome: exactSingle(guess.shots_home, actual.shots_home),
    shotsAway: exactSingle(guess.shots_away, actual.shots_away),
    offsideHome: exactSingle(guess.offside_home, actual.offside_home),
    offsideAway: exactSingle(guess.offside_away, actual.offside_away),
    cornerHome: exactSingle(guess.corner_home, actual.corner_home),
    cornerAway: exactSingle(guess.corner_away, actual.corner_away),

    foulsHome: exactSingle(guess.fouls_home, actual.fouls_home),
    foulsAway: exactSingle(guess.fouls_away, actual.fouls_away),
  };

  const total = Object.values(byCategory).reduce<number>((sum, v) => sum + (v ?? 0), 0);
  return { total, byCategory };
}
