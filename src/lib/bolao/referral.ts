import type { createAdminClient } from '@/lib/supabase/admin';

type Admin = ReturnType<typeof createAdminClient>;

/** Pontos de bônus que o dono do cupom ganha por cada indicado que paga. */
export const REFERRAL_BONUS_POINTS = 5;

/**
 * Credita o bônus de indicação ao dono do cupom quando `userId` vira premium.
 *
 * Toda a lógica (achar o indicador, travar idempotência e somar os pontos)
 * roda atomicamente na função SQL `credit_referral`, então é seguro chamar
 * em todo retry do webhook do Stripe — a tabela `referrals` (PK = indicado)
 * garante que cada pagamento credita o indicador no máximo uma vez.
 *
 * Nunca lança: uma falha aqui não deve impedir a concessão do Premium.
 */
export async function creditReferralOnPremium(
  admin: Admin,
  userId: string,
): Promise<void> {
  const { error } = await admin.rpc('credit_referral', { referred: userId });
  if (error) {
    console.error('[referral] falha ao creditar indicação:', error);
  }
}
