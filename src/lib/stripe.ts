import Stripe from 'stripe';

/** Bolão Premium one-time price: R$ 39,90 → 3990 centavos. */
export const BOLAO_PRICE_BRL_CENTS = 3990;

let _stripe: Stripe | undefined;

/**
 * Lazy Stripe singleton — instantiated on first use so the module can be
 * imported during build without requiring STRIPE_SECRET_KEY at that point.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}
