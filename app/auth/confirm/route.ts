import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

function getOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    return `${proto}://${forwardedHost}`
  }
  return new URL(request.url).origin
}

// Only allow same-origin absolute paths. Rejects absolute URLs and
// protocol-relative paths (`//evil.com`) so `?next=` can't be an open redirect.
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/dashboard'
  return raw
}

// Email confirmation via token_hash + verifyOtp (no PKCE verifier needed, so it
// works even when the link is opened on a different device than sign-up).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = getOrigin(request)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNext(searchParams.get('next'))

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_confirmation_link`)
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (error) {
      console.error('[auth/confirm] verifyOtp error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    return NextResponse.redirect(`${origin}${next}`)
  } catch (err) {
    console.error('[auth/confirm] Unexpected error:', err)
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }
}
