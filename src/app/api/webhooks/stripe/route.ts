import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

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
        await admin.from('profiles').upsert(
          {
            id: userId,
            is_premium: true,
            stripe_customer_id: (session.customer as string) ?? null,
          },
          { onConflict: 'id' },
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
