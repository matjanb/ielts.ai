'use client'

import { useEffect } from 'react'
import { logAgentEvent } from '@/lib/agent/events'

const KEY = 'agent_session_started_at'

// Logs session_start once per browser tab (sessionStorage-guarded, so SPA
// navigation and reloads don't restart the session) and session_end with the
// elapsed duration on pagehide. A reload emits an extra session_end for the
// same session — analysis takes the last one, so that's harmless.
export function SessionTracker() {
  useEffect(() => {
    // sessionStorage can THROW (Safari private mode, some webviews with
    // storage disabled) — and an uncaught throw here unmounts the whole tree.
    let startedAt = 0
    try { startedAt = Number(sessionStorage.getItem(KEY)) || 0 } catch { /* ignore */ }
    if (!startedAt) {
      startedAt = Date.now()
      try { sessionStorage.setItem(KEY, String(startedAt)) } catch { /* ignore */ }
      logAgentEvent('session_start')
    }
    const onHide = () => {
      logAgentEvent('session_end', undefined, {
        duration_sec: Math.round((Date.now() - startedAt) / 1000),
      })
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])
  return null
}
