// Single source of truth for "does this profile have access right now".
//
// Secure by default: access is granted only when EITHER
//   • lifetime_access is explicitly true (admin-granted "forever"), or
//   • subscription_expires_at is still in the future (paid through that date).
//
// We deliberately do NOT grant on subscription_status === 'pro' alone. A paid
// subscription always carries a paid-through date (the webhook guarantees one and
// Paddle's renewals push it forward), so if a cancellation webhook is ever missed
// or a charge is misconfigured, access simply lapses when the period ends instead
// of lasting forever. subscription_status is kept for display/reporting only.
//
// Pure (no server-only deps) so both the server (api/helpers, webhook) and the
// edge middleware can import it.

export interface SubscriptionFields {
  subscription_status?: string | null
  subscription_expires_at?: string | null
  lifetime_access?: boolean | null
}

export function isSubscriptionActive(p?: SubscriptionFields | null): boolean {
  if (!p) return false
  if (p.lifetime_access === true) return true
  if (p.subscription_expires_at && new Date(p.subscription_expires_at).getTime() > Date.now()) {
    return true
  }
  return false
}
