import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // The paywall is now enforced per-action at the API layer, not per-route: free
  // users may browse the dashboard and run unlimited Reading/Listening plus one
  // full mock with AI grading, and only hit "Subscription required" when they
  // reach for a token-spending action beyond that (see lib/api/helpers.ts).
  // So every app route below only requires being logged in. The landing page and
  // the /diagnostic funnel stay fully public for the pre-signup placement test.
  const AUTH_ONLY_ROUTES = [
    '/dashboard', '/mock-tests', '/listening', '/reading', '/writing', '/vocabulary',
    '/onboarding', '/subscription', '/admin',
  ]

  const matches = (routes: string[]) =>
    routes.some(r => pathname === r || pathname.startsWith(r + '/'))

  const needsAuth   = matches(AUTH_ONLY_ROUTES)
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  if (needsAuth && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Referral capture: first visit with ?ref=<code> drops a 60-day cookie that the
  // auth callback later reads to stamp the new account (first-touch attribution).
  const ref = request.nextUrl.searchParams.get('ref')
  if (ref && /^[a-z0-9_-]{2,40}$/i.test(ref) && !request.cookies.get('ref_code')) {
    supabaseResponse.cookies.set('ref_code', ref.toLowerCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 24 * 60 * 60, // 60 days
      path: '/',
    })
  }

  return supabaseResponse
}
