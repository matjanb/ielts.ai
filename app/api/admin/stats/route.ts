import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { err } from '@/lib/api/helpers'

export const runtime = 'nodejs'

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  const db = createAdminClient()
  const { data, error } = await db.rpc('admin_stats', {})
  if (error) {
    console.error('[admin/stats]', error)
    return err('Failed to load stats', 500)
  }
  return NextResponse.json({ stats: data?.[0] ?? null })
}
