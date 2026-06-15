import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { creditReferralOnPremium } from '@/lib/bolao/referral';

/**
 * POST /api/webhooks/stripe
 * Stripe webhook receiver. Verifies the signature against the RAW body,
 * then grants Premium on `checkout.session.completed`.
 *
 * Note: reads the raw body via req.text() — required for signature
 * verification. App Router does not parse the body, so no extra config.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json(
      { error: 'Assinatura do webhook inválida.' },
      { status: 400 },
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only grant access once the payment actually settled.
    if (session.payment_status === 'paid') {
      const userId =
        session.metadata?.supabase_user_id ?? session.client_reference_id;

      if (userId) {
        const admin = createAdminClient();
        // upsert instead of update: safe even if the profile row was never
        // created by the on_auth_user_created trigger (e.g. race condition,
        // OAuth signup before migration ran, etc.)
        const { error } = await admin.from('profiles').upsert(
          {
            id: userId,
            is_premium: true,
            stripe_customer_id: (session.customer as string) ?? null,
          },
          { onConflict: 'id' },
        );

        // Crucial: NÃO retornar 200 se a gravação falhou. Devolvendo 500, o
        // Stripe re-tenta o webhook (com backoff, por até ~3 dias) e o upsert
        // idempotente eventualmente concede o Premium. Sem isso, uma falha de
        // banco no pico de assinaturas perderia o acesso pago silenciosamente.
        if (error) {
          console.error('[stripe webhook] falha ao conceder Premium:', error);
          return NextResponse.json(
            { error: 'Falha ao registrar o pagamento.' },
            { status: 500 },
          );
        }

        // Premium concedido → credita quem indicou (idempotente).
        await creditReferralOnPremium(admin, userId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
