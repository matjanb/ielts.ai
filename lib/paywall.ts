// Client helper for the per-action paywall. Token-spending AI endpoints return
// 403 when a free user has used up their one free mock (or reaches a paid-only
// feature). Instead of surfacing a dead "Subscription required" error, send them
// to the subscription page where the value is explained.
export function redirectToPaywallOn403(res: Response): boolean {
  if (res.status === 403 && typeof window !== 'undefined') {
    window.location.href = '/subscription'
    return true
  }
  return false
}
