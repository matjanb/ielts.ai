import Stripe from 'stripe'

let _stripe: Stripe | null = null

/** Server-only Stripe client. Returns null when STRIPE_SECRET_KEY is not set. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!_stripe) _stripe = new Stripe(key)
  return _stripe
}

/** Plan id (from the UI) → the env var holding its Stripe Price ID. */
const PRICE_ENV: Record<string, string> = {
  '1mo': 'STRIPE_PRICE_1MO',
  '3mo': 'STRIPE_PRICE_3MO',
  '12mo': 'STRIPE_PRICE_12MO',
}

export function priceIdForPlan(plan: string): string | undefined {
  const envName = PRICE_ENV[plan]
  return envName ? process.env[envName] : undefined
}
