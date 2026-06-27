import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/types/database'
import { isSubscriptionActive } from '@/lib/subscription'

// Paths whose access depends on the paywall — we only read the profile for these,
// keeping every other navigation a single auth check. Results stay readable and
// the dashboard home/settings are always open.
function isPaywalledPath(p: string): boolean {
  if (p.includes('/results')) return false
  if (p === '/dashboard' || p.startsWith('/dashboard/settings')) return false
  return (
    p.startsWith('/reading') || p.startsWith('/listening') || p.startsWith('/writing') ||
    p.startsWith('/vocabulary') || p.startsWith('/dashboard/writing') ||
    p.startsWith('/dashboard/speaking') || p.startsWith('/dashboard/study-plan') ||
    p.startsWith('/dashboard/roast') || p.startsWith('/mock-tests')
  )
}

// For a free (non-subscribed) user on a paywalled path: block everything except
// running the single mock. The composer is open only until the free mock is claimed.
function blockFreeUser(p: string, freeMockUsed: boolean): boolean {
  if (p.startsWith('/mock-tests/run')) return false // the one free mock (and resume)
  if (p.startsWith('/mock-tests')) return freeMockUsed // composer: closed once used
  return true // standalone skills, practice, vocabulary, study plan, AI coach
}

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
  // So every app route below only requires being logged in. The landing page
  // stays fully public; new users sign up, do a 3-question onboarding, then land
  // on the dashboard.
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

  // Authoritative server-side paywall. The free tier is exactly one mock (taken
  // inside /mock-tests/run); everything else is paid. Read the profile only on
  // paywalled paths, then redirect free users to /subscription. The client guard
  // in layout.tsx is now just snappy UX backup, not the gate.
  if (user && isPaywalledPath(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_expires_at, lifetime_access, free_mock_used')
      .eq('id', user.id)
      .single()
    if (!isSubscriptionActive(profile) && blockFreeUser(pathname, profile?.free_mock_used === true)) {
      return NextResponse.redirect(new URL('/subscription', request.url))
    }
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
