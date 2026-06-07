import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

function getOrigin(request: NextRequest): string {
  // On Vercel (and any reverse-proxy), the public-facing host is in x-forwarded-host.
  // Fall back to the raw URL origin in local dev where there is no proxy.
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    return `${proto}://${forwardedHost}`
  }
  return new URL(request.url).origin
}

// Only allow same-origin absolute paths after login. Rejects absolute URLs and
// protocol-relative paths (`//evil.com`) so `?next=` can't be an open redirect.
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/dashboard'
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = getOrigin(request)

  // OAuth providers can redirect back with an error instead of a code
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')
  if (oauthError) {
    console.error('[auth/callback] OAuth provider error:', oauthError, oauthErrorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthErrorDescription ?? oauthError)}`
    )
  }

  const code = searchParams.get('code')
  const mode = searchParams.get('mode') // 'signin' | 'signup' | null
  const next = safeNext(searchParams.get('next'))

  if (!code) {
    console.error('[auth/callback] No code in callback — redirecting to login')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message, error)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      )
    }

    // If this came from the Sign In page, block users who haven't completed onboarding
    if (mode === 'signin') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const service = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const { data: profile } = await service
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()

        if (!profile?.onboarding_completed) {
          // Sign the user out and send them back with a clear error
          await supabase.auth.signOut()
          return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent('Account not found. Please sign up and complete the initial setup before signing in.')}`
          )
        }
      }
    }

    return NextResponse.redirect(`${origin}${next}`)
  } catch (err) {
    console.error('[auth/callback] Unexpected error:', err)
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }
}
