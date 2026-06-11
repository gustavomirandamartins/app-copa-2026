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
  const { data } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  const profile = (data as Profile) ?? null;

  if (profile?.is_premium) {
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

  return NextResponse.json({ url: session.url });
}
