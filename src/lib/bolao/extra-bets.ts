/**
 * Palpites extras — ponto único de ajuste de regras e escopo.
 *
 * Semifinais = rodada de TESTE (aposta e apura pontos por jogo, mas não soma
 * no total_score); 3º lugar e final = valendo. A distinção é derivada dos
 * ids estáticos abaixo, sem flag no banco — auditável e impossível de
 * divergir entre UI, action e scoring.
 */

/** Jogos em que dá para registrar palpites extras (semis + 3º + final). */
export const EXTRA_BET_MATCH_IDS: readonly string[] = ['ko-101', 'ko-102', 'ko-103', 'ko-104'];

/** Subconjunto em que os extras valem pontos no total (3º lugar e final). */
export const EXTRA_COUNTING_MATCH_IDS: readonly string[] = ['ko-103', 'ko-104'];

/**
 * Pontos por categoria acertada em cheio (decisão do produto: 3 para todas,
 * multiplicados pelo score_multiplier de jogos turbinados no scoring).
 * 9 categorias × 3 = até 27 pts por jogo antes do multiplicador.
 */
export const EXTRA_POINTS_PER_CATEGORY = 3;

export type FirstGoal = 'home' | 'away' | 'none';

export type ExtraCategory =
  | 'ht'          // placar do 1º tempo
  | 'h2'          // placar do 2º tempo regulamentar (derivado: rt − ht)
  | 'et'          // placar da prorrogação (agregado; caso ocorra)
  | 'pen'         // placar dos pênaltis (caso ocorra)
  | 'yellowHome'  // cartões amarelos do mandante
  | 'yellowAway'  // cartões amarelos do visitante
  | 'redHome'     // cartões vermelhos do mandante
  | 'redAway'     // cartões vermelhos do visitante
  | 'firstGoal';  // qual seleção faz o 1º gol (ou nenhum gol)

export const EXTRA_CATEGORIES: readonly ExtraCategory[] = [
  'ht', 'h2', 'et', 'pen', 'yellowHome', 'yellowAway', 'redHome', 'redAway', 'firstGoal',
];

/** Payload cliente → saveExtraPredictions (colunas de palpite, sem points). */
export interface ExtraPredictionInput {
  match_id: string;
  ht_home: number | null;
  ht_away: number | null;
  h2_home: number | null;
  h2_away: number | null;
  et_home: number | null;
  et_away: number | null;
  pen_home: number | null;
  pen_away: number | null;
  yellow_home: number | null;
  yellow_away: number | null;
  red_home: number | null;
  red_away: number | null;
  first_goal: FirstGoal | null;
}

/** Linha de extra_predictions lida do banco. */
export interface ExtraPredictionRow extends ExtraPredictionInput {
  id: string;
  user_id: string;
  points_earned: number;
}

/** Linha de match_extra_results (API + entrada manual do admin). */
export interface ExtraResultRow {
  match_id: string;
  ht_home: number | null;
  ht_away: number | null;
  rt_home: number | null;
  rt_away: number | null;
  et_home: number | null;
  et_away: number | null;
  pen_home: number | null;
  pen_away: number | null;
  duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | null;
  yellow_home: number | null;
  yellow_away: number | null;
  red_home: number | null;
  red_away: number | null;
  first_goal: FirstGoal | null;
}
