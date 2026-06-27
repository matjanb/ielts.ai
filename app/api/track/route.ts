import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/helpers'
import { logEvent } from '@/lib/analytics/track.server'
import { FUNNEL_EVENTS, type FunnelEvent } from '@/lib/analytics/events'

export const runtime = 'nodejs'

// Records one funnel event. user_id comes from the session (never the client),
// so events can't be attributed to someone else. Only whitelisted events land.
export async function POST(req: NextRequest) {
  let body: { event?: string; path?: string; metadata?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!body.event || !FUNNEL_EVENTS.includes(body.event as FunnelEvent)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const user = await getApiUser()
  await logEvent(body.event as FunnelEvent, {
    userId: user?.id ?? null,
    path: typeof body.path === 'string' ? body.path.slice(0, 256) : null,
    metadata: body.metadata,
  })
  return NextResponse.json({ ok: true })
}
