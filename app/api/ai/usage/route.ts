import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiUser, FREE_LIMITS, err } from '@/lib/api/helpers'

export async function GET() {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const isPro = profile?.subscription_status === 'pro' || profile?.subscription_status === 'expert'

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const features = ['writing', 'speaking', 'test_explanation'] as const

  const counts: Record<string, number> = {}
  for (const feature of features) {
    const { count } = await admin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('feature', feature)
      .gte('created_at', startOfMonth.toISOString())
    counts[feature] = count ?? 0
  }

  return NextResponse.json({
    is_pro: isPro,
    writing:          { used: counts.writing,          limit: isPro ? null : FREE_LIMITS.writing },
    speaking:         { used: counts.speaking,         limit: isPro ? null : FREE_LIMITS.speaking },
    test_explanation: { used: counts.test_explanation, limit: isPro ? null : FREE_LIMITS.test_explanation },
  })
}
