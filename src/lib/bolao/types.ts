/**
 * Tipos espelhando o schema do Supabase (snake_case), usados pelo Bolão.
 * Mantidos separados de @/lib/types (que descreve o app estático em camelCase).
 */

export interface Profile {
  id: string;
  full_name: string | null;
  is_premium: boolean;
  is_admin: boolean;
  agreed_to_ranking: boolean;
  stripe_customer_id: string | null;
  total_score: number;
  score_adjustment: number;
  round_bonus: number;
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

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

/** Configuração por jogo mantida pelo admin (multiplicador de pontos). */
export interface MatchSetting {
  match_id: string;
  score_multiplier: number;
  updated_at: string;
}

/** Solicitação de pagamento manual via Pix, revisada na central (/admin). */
export interface PaymentRequest {
  id: string;
  user_id: string;
  contact_email: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  amount_cents: number;
  note: string | null;
  status: PaymentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
