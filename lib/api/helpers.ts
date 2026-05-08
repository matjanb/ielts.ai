import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Monthly free tier limits per feature
export const FREE_LIMITS: Record<string, number> = {
  writing:          3,
  speaking:         3,
  study_plan:       2,
  test_explanation: 5,
  band_estimate:    50,
}

export async function getApiUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function canUseFeature(userId: string, feature: string): Promise<boolean> {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single()

  if (profile?.subscription_status === 'pro' || profile?.subscription_status === 'expert') {
    return true
  }

  const limit = FREE_LIMITS[feature] ?? 3
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', startOfMonth.toISOString())

  return (count ?? 0) < limit
}

export async function recordUsage(userId: string, feature: string) {
  const admin = createAdminClient()
  await admin.from('ai_usage').insert({ user_id: userId, feature })
}

export function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
