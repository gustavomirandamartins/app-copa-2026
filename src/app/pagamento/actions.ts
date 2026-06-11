'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isProfileComplete } from '@/lib/bolao/profile';
import { BOLAO_PRICE_BRL_CENTS } from '@/lib/stripe';
import type { Profile, PaymentRequest } from '@/lib/bolao/types';

export interface RequestPixResult {
  ok: boolean;
  error?: string;
}

/**
 * Registra uma solicitação de pagamento manual via Pix (status 'pending').
 * O acesso Premium só é liberado depois que um admin aprovar na central
 * de controle (/admin), após conferir o comprovante enviado por e-mail.
 *
 * Idempotente: se já existe uma solicitação pendente, apenas confirma.
 */
export async function requestManualPix(note?: string): Promise<RequestPixResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Não autenticado.' };

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  const profile = (data as Profile) ?? null;

  if (profile?.is_premium) {
    return { ok: false, error: 'Você já tem acesso Premium.' };
  }
  if (!isProfileComplete(profile)) {
    return { ok: false, error: 'Complete seu cadastro antes de pagar.' };
  }

  // Já existe solicitação pendente? Então só confirmamos (idempotente).
  const { data: existing } = await supabase
    .from('payment_requests')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if ((existing as Pick<PaymentRequest, 'id' | 'status'> | null)?.id) {
    return { ok: true };
  }

  const { error } = await supabase.from('payment_requests').insert({
    user_id: user.id,
    contact_email: user.email ?? null,
    contact_name: profile?.full_name ?? null,
    contact_phone: profile?.phone ?? null,
    amount_cents: BOLAO_PRICE_BRL_CENTS,
    note: note?.trim() ? note.trim().slice(0, 500) : null,
  });

  if (error) {
    // Corrida com o índice único de "uma pendente por usuário" → trata como ok.
    if (error.code === '23505') return { ok: true };
    console.error('[pagamento] erro ao criar solicitação Pix:', error);
    return { ok: false, error: 'Não foi possível registrar o pagamento. Tente novamente.' };
  }

  revalidatePath('/pagamento');
  return { ok: true };
}
