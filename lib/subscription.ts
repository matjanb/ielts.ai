// Single source of truth for "does this profile have access right now".
//
// There is one paid tier ('pro'). A subscriber keeps access until the end of the
// period they paid for: even after the status flips to 'cancelled'/'free', a
// future `subscription_expires_at` still grants access until that moment.
//
// Pure (no server-only deps) so both the server (api/helpers, webhook) and the
// edge middleware can import it.

export interface SubscriptionFields {
  subscription_status?: string | null
  subscription_expires_at?: string | null
}

export function isSubscriptionActive(p?: SubscriptionFields | null): boolean {
  if (!p) return false
  if (p.subscription_status === 'pro') return true
  if (p.subscription_expires_at && new Date(p.subscription_expires_at).getTime() > Date.now()) {
    return true
  }
  return false
}
