import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { err } from '@/lib/api/helpers'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return err('Forbidden', 403)

  const q = request.nextUrl.searchParams.get('q')?.trim() || null
  const db = createAdminClient()
  const { data, error } = await db.rpc('admin_list_users', { search: q, lim: 100 })
  if (error) {
    console.error('[admin/users]', error)
    return err('Failed to load users', 500)
  }
  return NextResponse.json({ users: data ?? [] })
}
