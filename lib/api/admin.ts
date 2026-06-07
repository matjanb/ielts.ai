import 'server-only'
import type { User } from '@supabase/supabase-js'
import { getApiUser } from '@/lib/api/helpers'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Returns the signed-in user ONLY if their profile has is_admin = true,
 * otherwise null. The single gate for every admin page and admin API route —
 * checked server-side with the service-role key so it can't be bypassed.
 */
export async function getAdminUser(): Promise<User | null> {
  const user = await getApiUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  return data?.is_admin ? user : null
}
