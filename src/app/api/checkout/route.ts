import { NextResponse, type NextRequest } from 'next/server';
import { getStripe, BOLAO_PRICE_BRL_CENTS } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isProfileComplete } from '@/lib/bolao/profile';
import type { Profile } from '@/lib/bolao/types';

/**
 * POST /api/checkout
 * Creates a one-time Stripe Checkout Session (R$ 39,90) for the
 * authenticated user and returns the hosted Checkout URL.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error: profileError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Não engolir erro de leitura: se o admin não conseguir ler o profile
  // (ex.: privilégios faltando para o service_role), retornamos 500 com a
  // causa real em vez de tratar como "cadastro incompleto" e confundir.
  if (profileError) {
    console.error('[checkout] erro ao ler profile:', profileError);
    return NextResponse.json(
      { error: 'Não foi possível verificar seu cadastro. Tente novamente.' },
      { status: 500 },
    );
  }

  const profile = data as Profile;

  if (profile.is_premium) {
    return NextResponse.json({ error: 'Você já é Premium.' }, { status: 409 });
  }

  // Defesa em profundidade: só libera o pagamento com cadastro completo
  // (dados pessoais + endereço + consentimento LGPD).
  if (!isProfileComplete(profile)) {
    return NextResponse.json(
      { error: 'Complete seu cadastro antes de pagar.' },
      { status: 400 },
    );
  }

  // Tudo que fala com o Stripe fica sob try/catch: assim qualquer falha
  // (cliente, método de pagamento não ativado, etc.) vira uma mensagem
  // clara em JSON — em vez de um 500 sem corpo que jogaria o usuário numa
  // página quebrada ("This page couldn't load") após o redirect.
  try {
    // Reuse the Stripe customer if we already created one for this user.
    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email ?? undefined,
        name: profile?.full_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const origin = req.nextUrl.origin;
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      // Não fixamos `payment_method_types`. Ao omitir, o Checkout exibe
      // automaticamente os métodos habilitados no painel do Stripe
      // (Settings → Payment methods) compatíveis com BRL.
      //
      // IMPORTANTE: esta é uma conta US. Nela o Pix NÃO é um método ativável
      // isoladamente — ele é oferecido APENAS via Stripe Link (habilitado o
      // Link, o Pix aparece automaticamente para compradores no Brasil).
      // Por isso fixar 'pix' aqui derrubava a criação da sessão. Para ter
      // Pix: ative o Link no painel. O Checkout Hosted suporta Pix on Link.
      customer: customerId,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: BOLAO_PRICE_BRL_CENTS,
            product_data: {
              name: 'Bolão Premium — Copa 2026 (MinduBier)',
            },
          },
        },
      ],
      success_url: `${origin}/bolao?checkout=success`,
      cancel_url: `${origin}/bolao?checkout=cancel`,
    });

    if (!session.url) {
      console.error('[checkout] sessão criada sem URL:', session.id);
      return NextResponse.json(
        { error: 'Não foi possível iniciar o pagamento. Tente novamente.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] erro ao criar sessão do Stripe:', err);
    const message =
      err instanceof Error ? err.message : 'Erro ao iniciar o pagamento.';
    return NextResponse.json(
      { error: `Não foi possível iniciar o pagamento: ${message}` },
      { status: 502 },
    );
  }
}
