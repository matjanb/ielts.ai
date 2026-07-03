import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runDailyDigest } from '@/lib/agent/digest.server'

export const runtime = 'nodejs'
// One cheap completion per user, small concurrent batches; 200-user cap fits.
export const maxDuration = 300

// Evening coach digest, fired by Vercel cron (vercel.json, 15:00 UTC = 20:00
// Almaty). Auth: cron requests carry `Authorization: Bearer ${CRON_SECRET}`.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  try {
    const stats = await runDailyDigest(createAdminClient())
    console.log('[agent/digest]', stats)
    return NextResponse.json({ ok: true, ...stats })
  } catch (e) {
    console.error('[agent/digest] run failed', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
