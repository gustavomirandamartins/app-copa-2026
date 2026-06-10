/**
 * Tipos espelhando o schema do Supabase (snake_case), usados pelo Bolão.
 * Mantidos separados de @/lib/types (que descreve o app estático em camelCase).
 */

export interface Profile {
  id: string;
  full_name: string | null;
  is_premium: boolean;
  agreed_to_ranking: boolean;
  stripe_customer_id: string | null;
  total_score: number;
}

export interface PredictionRow {
  id: string;
  user_id: string;
  match_id: string;
  home_score_guess: number;
  away_score_guess: number;
  points_earned: number;
  is_autofilled: boolean;
}

/** Payload enviado do cliente ao salvar palpites. */
export interface PredictionInput {
  match_id: string;
  home_score_guess: number;
  away_score_guess: number;
  is_autofilled: boolean;
}
