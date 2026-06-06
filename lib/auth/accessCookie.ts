// Edge-safe, HMAC-signed cookie that caches "this user currently has access"
// for a short window, so the middleware can skip the per-request `profiles` read
// for active subscribers (the hot path on every protected navigation).
//
// Fail-open by design: if the secret is missing or anything looks off, the
// helpers report "no valid cache" and the caller falls back to the DB — i.e.
// exactly today's behaviour. The cookie only ever asserts a positive result, is
// bound to the user id, and is signed with a server-only secret, so a client
// can't forge access by setting it.

const COOKIE = 'sub_ok'
const TTL_SECONDS = 300 // 5 min — short enough that a downgrade lingers only briefly

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return base64url(sig)
}

function secret(): string | null {
  // Server-only secret (never shipped to the client); available in the Edge
  // middleware runtime. Absent → caching disabled, always hit the DB.
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

export const ACCESS_COOKIE = COOKIE

/** Cookie value asserting `userId` has access until now + TTL, or null if disabled. */
export async function signAccessCookie(
  userId: string,
): Promise<{ name: string; value: string; maxAge: number } | null> {
  const s = secret()
  if (!s) return null
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
  const payload = `${userId}.${exp}`
  const sig = await hmac(payload, s)
  return { name: COOKIE, value: `${payload}.${sig}`, maxAge: TTL_SECONDS }
}

/** True only for a valid, unexpired, correctly-signed cookie for this user. */
export async function hasValidAccessCookie(raw: string | undefined, userId: string): Promise<boolean> {
  const s = secret()
  if (!s || !raw) return false
  const parts = raw.split('.')
  if (parts.length !== 3) return false
  const [uid, expStr, sig] = parts
  if (uid !== userId) return false
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
  const expected = await hmac(`${uid}.${expStr}`, s)
  return timingSafeEqual(sig, expected)
}
