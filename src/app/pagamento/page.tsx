import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { isProfileComplete } from '@/lib/bolao/profile';
import { getPixConfig, buildPixCopiaECola } from '@/lib/bolao/pix';
import { BOLAO_PRICE_BRL_CENTS } from '@/lib/stripe';
import type { Profile, PaymentRequest } from '@/lib/bolao/types';
import { PaymentOptions } from '@/components/payment/PaymentOptions';

/**
 * Página de pagamento. Oferece duas formas de liberar o Premium do Bolão:
 *  1. Cartão (Stripe Checkout) — liberação automática via webhook.
 *  2. Pix manual — o usuário paga, envia o comprovante por e-mail e um
 *     admin aprova na central de controle (/admin).
 */
export default async function PagamentoPage() {
  if (!isSupabaseConfigured()) redirect('/bolao');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/bolao');

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  const profile = (data as Profile) ?? null;

  if (profile?.is_premium) redirect('/bolao');
  if (!isProfileComplete(profile)) redirect('/completar-cadastro');

  // Já existe solicitação de Pix pendente?
  const { data: pendingRow } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();
  const pending = (pendingRow as PaymentRequest) ?? null;

  // Monta o Pix copia-e-cola + QR, se a chave estiver configurada.
  const pixConfig = getPixConfig();
  let pixCopiaECola: string | null = null;
  let pixQrDataUrl: string | null = null;
  if (pixConfig) {
    pixCopiaECola = buildPixCopiaECola(pixConfig, BOLAO_PRICE_BRL_CENTS);
    pixQrDataUrl = await QRCode.toDataURL(pixCopiaECola, {
      width: 280,
      margin: 1,
    });
  }

  const amountLabel = (BOLAO_PRICE_BRL_CENTS / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div className="container">
      <div className="glass-card-static onb-card">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <CreditCard size={32} style={{ color: 'var(--gold)' }} />
          <h1 style={{ fontSize: '1.5rem', marginTop: 'var(--space-sm)' }}>
            Finalize seu acesso Premium
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Bolão Premium — Copa 2026 (MinduBier) · {amountLabel}
          </p>
        </div>

        <PaymentOptions
          amountLabel={amountLabel}
          pixKey={pixConfig?.key ?? null}
          pixReceiptEmail={pixConfig?.receiptEmail ?? null}
          pixCopiaECola={pixCopiaECola}
          pixQrDataUrl={pixQrDataUrl}
          hasPendingRequest={!!pending}
        />
      </div>
    </div>
  );
}
