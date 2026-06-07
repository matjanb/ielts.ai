import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/types/database'
import { isSubscriptionActive } from '@/lib/subscription'
import { ACCESS_COOKIE, hasValidAccessCookie, signAccessCookie } from '@/lib/auth/accessCookie'

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

  // Routes that require an ACTIVE paid subscription (dashboard + all practice/tests).
  const SUBSCRIPTION_ROUTES = ['/dashboard', '/mock-tests', '/listening', '/reading', '/writing', '/vocabulary']
  // Routes that only require being logged in (the paywall page + account settings).
  // The landing page and the /diagnostic funnel stay fully public so anonymous
  // visitors can run the placement test before signing up.
  const AUTH_ONLY_ROUTES = ['/onboarding', '/subscription', '/admin']

  const matches = (routes: string[]) =>
    routes.some(r => pathname === r || pathname.startsWith(r + '/'))

  // Settings stays reachable without a subscription (account / sign out).
  const isSettings        = pathname.startsWith('/dashboard/settings')
  const needsSubscription = matches(SUBSCRIPTION_ROUTES) && !isSettings
  const needsAuth         = needsSubscription || isSettings || matches(AUTH_ONLY_ROUTES)
  const isAuthRoute       = pathname === '/login' || pathname === '/signup'

  if (needsAuth && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Paywall: logged-in users without an active subscription are sent to the
  // subscription page (which lets them buy, then drops them into the dashboard).
  if (needsSubscription && user) {
    // Fast path: a valid signed cookie means we already confirmed access within
    // the last few minutes — skip the profiles DB read on the hot path. Cache
    // miss falls back to the DB (source of truth) and re-primes the cookie.
    let active = await hasValidAccessCookie(request.cookies.get(ACCESS_COOKIE)?.value, user.id)
    if (!active) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_expires_at, lifetime_access')
        .eq('id', user.id)
        .single<{ subscription_status: string; subscription_expires_at: string | null; lifetime_access: boolean | null }>()
      active = isSubscriptionActive(profile)
      if (active) {
        const c = await signAccessCookie(user.id)
        if (c) {
          supabaseResponse.cookies.set(c.name, c.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: c.maxAge,
            path: '/',
          })
        }
      }
    }

    if (!active) {
      return NextResponse.redirect(new URL('/subscription', request.url))
    }
  }

  return supabaseResponse
}
