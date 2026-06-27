import 'server-only'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FunnelEvent } from './events'

interface Attribution {
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  referrer?: string | null
  landing_path?: string | null
}

async function readAnalyticsCookies(): Promise<{ anonId: string | null; attribution: Attribution }> {
  const store = await cookies()
  const anonId = store.get('anon_id')?.value ?? null
  let attribution: Attribution = {}
  try {
    const raw = store.get('ielts_attribution')?.value
    if (raw) attribution = JSON.parse(raw) as Attribution
  } catch { /* malformed cookie — ignore */ }
  return { anonId, attribution }
}

/** Fire-and-forget funnel event write. `userId` is null for anonymous events. */
export async function logEvent(
  event: FunnelEvent,
  opts: { userId?: string | null; path?: string | null; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    const { anonId, attribution } = await readAnalyticsCookies()
    await createAdminClient().from('funnel_events').insert({
      event,
      user_id: opts.userId ?? null,
      anon_id: anonId,
      utm_source: attribution.utm_source ?? null,
      utm_medium: attribution.utm_medium ?? null,
      utm_campaign: attribution.utm_campaign ?? null,
      referrer: attribution.referrer ?? null,
      path: opts.path ?? attribution.landing_path ?? null,
      metadata: (opts.metadata ?? null) as never,
    })
  } catch (e) {
    console.error('[analytics] logEvent failed', e)
  }
}

/**
 * Log an event for a user from a context WITHOUT their cookies (e.g. the Paddle
 * webhook). Pulls the user's first-touch attribution from `user_attribution` so
 * the event still carries the right channel.
 */
export async function logEventForUser(
  event: FunnelEvent,
  userId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: attr } = await admin
      .from('user_attribution')
      .select('anon_id, utm_source, utm_medium, utm_campaign, referrer, landing_path')
      .eq('user_id', userId)
      .maybeSingle()
    await admin.from('funnel_events').insert({
      event,
      user_id: userId,
      anon_id: attr?.anon_id ?? null,
      utm_source: attr?.utm_source ?? null,
      utm_medium: attr?.utm_medium ?? null,
      utm_campaign: attr?.utm_campaign ?? null,
      referrer: attr?.referrer ?? null,
      path: attr?.landing_path ?? null,
      metadata: (metadata ?? null) as never,
    })
  } catch (e) {
    console.error('[analytics] logEventForUser failed', e)
  }
}

/**
 * First-touch UTM attribution on signup. Creates the row exactly once (atomic
 * upsert that ignores duplicates); on first creation it also emits
 * `signup_completed`, so the event fires once across the email + OAuth paths.
 */
export async function attributeUtm(userId: string): Promise<void> {
  try {
    const { anonId, attribution } = await readAnalyticsCookies()
    const { data: inserted } = await createAdminClient()
      .from('user_attribution')
      .upsert({
        user_id: userId,
        anon_id: anonId,
        utm_source: attribution.utm_source ?? null,
        utm_medium: attribution.utm_medium ?? null,
        utm_campaign: attribution.utm_campaign ?? null,
        utm_content: attribution.utm_content ?? null,
        utm_term: attribution.utm_term ?? null,
        referrer: attribution.referrer ?? null,
        landing_path: attribution.landing_path ?? null,
      }, { onConflict: 'user_id', ignoreDuplicates: true })
      .select('user_id')

    if (inserted && inserted.length > 0) await logEvent('signup_completed', { userId })
  } catch (e) {
    console.error('[analytics] attributeUtm failed', e)
  }
}
