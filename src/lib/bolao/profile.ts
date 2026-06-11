import type { Profile } from './types';

/**
 * Campos obrigatórios do onboarding antes de liberar o pagamento.
 * Fonte única de verdade — usada no guard da página /completar-cadastro
 * e no guard do /api/checkout (defesa em profundidade).
 */
export function isProfileComplete(p: Profile | null | undefined): boolean {
  if (!p) return false;
  const required = [
    p.full_name,
    p.birth_date,
    p.phone,
    p.postal_code,
    p.address_street,
    p.address_number,
    p.address_city,
    p.address_state,
  ];
  return required.every((v) => typeof v === 'string' && v.trim() !== '') &&
    p.agreed_to_lgpd === true;
}
