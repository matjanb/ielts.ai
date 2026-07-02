'use client'

import { useEffect, useRef } from 'react'
import { logAgentEvent, type AgentModule } from './events'

/**
 * Fires test_abandoned exactly once if the user leaves — tab close (pagehide)
 * or in-app navigation (unmount) — while a test is in progress. Callers must
 * flip `active` to false before a legitimate submit navigates away, otherwise
 * the submit itself would count as an abandon.
 *
 * A mid-test page reload also logs an abandon even if the user resumes right
 * after; accepted v1 noise — the analysis layer cares about the abandon *rate*,
 * not single events.
 */
export function useAbandonTracker(opts: {
  module: AgentModule
  testId: string
  active: boolean
  getProgress: () => { progressPct: number; part: number | null }
}) {
  const ref = useRef(opts)
  const fired = useRef(false)

  useEffect(() => {
    ref.current = opts
  })

  useEffect(() => {
    const fire = () => {
      if (fired.current || !ref.current.active) return
      fired.current = true
      const { module, testId, getProgress } = ref.current
      const { progressPct, part } = getProgress()
      logAgentEvent('test_abandoned', module, {
        test_id: testId,
        progress_pct: progressPct,
        abandoned_at_part: part,
      })
    }
    window.addEventListener('pagehide', fire)
    return () => {
      window.removeEventListener('pagehide', fire)
      fire()
    }
  }, [])
}
