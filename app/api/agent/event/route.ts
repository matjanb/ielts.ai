import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { AGENT_EVENTS, AGENT_MODULES, type AgentEvent, type AgentModule } from '@/lib/agent/events'

export const runtime = 'nodejs'

// Records one behavioral event for the coach agent. user_id comes from the
// session (never the client); only whitelisted events/modules land. Anonymous
// visitors have no coach, so unauthenticated calls are dropped.
export async function POST(req: NextRequest) {
  let body: { event?: string; module?: string; payload?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!body.event || !AGENT_EVENTS.includes(body.event as AgentEvent)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (body.module !== undefined && !AGENT_MODULES.includes(body.module as AgentModule)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {}
  if (JSON.stringify(payload).length > 2000) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const user = await getApiUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { error } = await createAdminClient().from('user_events').insert({
    user_id: user.id,
    event_type: body.event as AgentEvent,
    module: (body.module as AgentModule | undefined) ?? null,
    payload: payload as never,
  })
  if (error) console.error('[agent] event insert failed', error)
  return NextResponse.json({ ok: true })
}
