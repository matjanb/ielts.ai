import { NextResponse } from 'next/server'
import { getApiUser, err } from '@/lib/api/helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import { TELEGRAM_BOT_USERNAME } from '@/lib/telegram/api'

export const runtime = 'nodejs'

const CODE_TTL_MIN = 15
// unambiguous alphabet: no 0/O, 1/I
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  let code = ''
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return code
}

/** Link status for the settings card. */
export async function GET() {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)
  const { data } = await createAdminClient()
    .from('telegram_links')
    .select('telegram_chat_id, linked_at')
    .eq('user_id', user.id)
    .maybeSingle()
  return NextResponse.json({
    linked: !!data?.telegram_chat_id,
    linkedAt: data?.linked_at ?? null,
    bot: TELEGRAM_BOT_USERNAME,
  })
}

/**
 * Issue a fresh link code. Linking is open to every account — the bot is the
 * retention channel (reminders, results, upsells for free users). What gets
 * DELIVERED is gated per message in send.server.ts, not at link time.
 */
export async function POST() {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)

  const code = generateCode()
  const { error } = await createAdminClient().from('telegram_links').upsert({
    user_id: user.id,
    link_code: code,
    link_code_expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
  }, { onConflict: 'user_id' })
  if (error) {
    console.error('[telegram/link]', error)
    return err('Failed to create link code', 500)
  }

  return NextResponse.json({
    code,
    bot: TELEGRAM_BOT_USERNAME,
    // /start deep link delivers the code without the user typing anything
    deepLink: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`,
    expiresInMin: CODE_TTL_MIN,
  })
}

/** Unlink: stop Telegram delivery entirely (in-app messages continue). */
export async function DELETE() {
  const user = await getApiUser()
  if (!user) return err('Unauthorized', 401)
  await createAdminClient().from('telegram_links').delete().eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
