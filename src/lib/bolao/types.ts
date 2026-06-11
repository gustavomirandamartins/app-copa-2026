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
  // Onboarding (coletados após a confirmação do e-mail)
  birth_date: string | null;
  phone: string | null;
  postal_code: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  agreed_to_lgpd: boolean;
  lgpd_agreed_at: string | null;
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
