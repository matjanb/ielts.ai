import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getApiUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single()

  // Subscription-only — there is no free tier. Access requires an active paid plan.
  return profile?.subscription_status === 'pro' || profile?.subscription_status === 'expert'
}

export async function recordUsage(userId: string, feature: string) {
  const admin = createAdminClient()
  await admin.from('ai_usage').insert({ user_id: userId, feature })
}

export function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
