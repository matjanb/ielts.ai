import type { FunnelEvent } from './events'

// Client-side fire-and-forget funnel event. The server derives user_id from the
// session and anon_id/UTM from cookies — the client only names the event, so it
// can't spoof identity. `keepalive` lets the request survive a navigation.
export function track(event: FunnelEvent, metadata?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, path: window.location.pathname, metadata }),
      keepalive: true,
    }).catch(() => { /* analytics never blocks the UI */ })
  } catch { /* ignore */ }
}
