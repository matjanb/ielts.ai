import 'server-only'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * First-touch referral attribution. Reads the `ref_code` cookie (set by middleware
 * when a visitor arrives with ?ref=<code>) and stamps it on the user's profile —
 * but only when the code maps to a real, active referrer AND the profile has no
 * referrer yet. Idempotent and safe to call on every auth path (email confirm,
 * email auto-confirm, and OAuth), so attribution never depends on one redirect.
 */
export async function attributeReferral(userId: string): Promise<void> {
  try {
    const store = await cookies()
    const code = store.get('ref_code')?.value
    if (!code) return

    const db = createAdminClient()
    const { data: ref } = await db
      .from('referrers').select('code').eq('code', code).eq('is_active', true).maybeSingle()
    if (!ref) return

    const { data: prof } = await db
      .from('profiles').select('referred_by').eq('id', userId).maybeSingle()
    if (prof && !prof.referred_by) {
      await db.from('profiles')
        .update({ referred_by: ref.code, referred_at: new Date().toISOString() })
        .eq('id', userId)
    }
  } catch (e) {
    console.error('[referral] attribution failed', e)
  }
}
