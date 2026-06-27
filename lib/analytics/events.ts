// Shared funnel event names (safe to import on client and server).
export const FUNNEL_EVENTS = [
  'landing_viewed',
  'signup_started',
  'signup_completed',
  'mock_test_started',
  'mock_test_completed',
  'paywall_viewed',
  'checkout_started',
  'purchase_completed',
  // Public essay-checker lead magnet
  'checker_viewed',
  'checker_submitted',
  'checker_result_viewed',
  'checker_signup_cta_clicked',
] as const

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number]
