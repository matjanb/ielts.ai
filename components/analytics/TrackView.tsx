'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics/track'
import type { FunnelEvent } from '@/lib/analytics/events'

// Fires a funnel view event once on mount. Lets server-rendered pages log a view
// without becoming client components themselves.
export function TrackView({ event }: { event: FunnelEvent }) {
  useEffect(() => { track(event) }, [event])
  return null
}
