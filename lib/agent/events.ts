// Client-side fire-and-forget logger for coach behavioral events. Mirrors
// lib/analytics/track.ts: the client only names the event; /api/agent/event
// derives user_id from the session, so identity can't be spoofed. `keepalive`
// lets pagehide-time events survive the navigation.
//
// Only behavior lives here — test_completed / question_answered are already in
// user_attempts and user_answers; the analysis layer reads them from there.

export const AGENT_EVENTS = ['session_start', 'session_end', 'test_abandoned'] as const
export type AgentEvent = (typeof AGENT_EVENTS)[number]

export const AGENT_MODULES = ['listening', 'reading', 'writing', 'speaking', 'vocabulary'] as const
export type AgentModule = (typeof AGENT_MODULES)[number]

export function logAgentEvent(
  event: AgentEvent,
  module?: AgentModule,
  payload?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return
  try {
    fetch('/api/agent/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, module, payload }),
      keepalive: true,
    }).catch(() => { /* event logging never blocks the UI */ })
  } catch { /* ignore */ }
}
