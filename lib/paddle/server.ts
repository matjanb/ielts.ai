import crypto from 'crypto'

/** Plan id (from the UI) → the env var holding its Paddle Price ID. */
const PRICE_ENV: Record<string, string> = {
  '1mo': 'PADDLE_PRICE_1MO',
  '3mo': 'PADDLE_PRICE_3MO',
  '12mo': 'PADDLE_PRICE_12MO',
}

export function priceIdForPlan(plan: string): string | undefined {
  const envName = PRICE_ENV[plan]
  return envName ? process.env[envName] : undefined
}

/**
 * Verify a Paddle Billing webhook signature.
 *
 * Paddle sends `Paddle-Signature: ts=<unix>;h1=<hmac>` where the HMAC is
 * SHA-256 of `${ts}:${rawBody}` keyed with the webhook secret. We compare in
 * constant time. Done by hand so we don't pull in the Paddle Node SDK.
 */
export function verifyPaddleSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false
  const parts = Object.fromEntries(
    signatureHeader.split(';').map(kv => {
      const i = kv.indexOf('=')
      return [kv.slice(0, i), kv.slice(i + 1)]
    }),
  ) as Record<string, string>

  const ts = parts.ts
  const h1 = parts.h1
  if (!ts || !h1) return false

  const digest = crypto.createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(h1))
  } catch {
    return false
  }
}
