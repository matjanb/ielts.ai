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

  // ── Analytics ────────────────────────────────────────────────────────────────
  const secure = process.env.NODE_ENV === 'production'

  // Stable anonymous id so the pre-signup → signed-up journey can be stitched.
  if (!request.cookies.get('anon_id')) {
    supabaseResponse.cookies.set('anon_id', crypto.randomUUID(), {
      httpOnly: true, secure, sameSite: 'lax', maxAge: 365 * 24 * 60 * 60, path: '/',
    })
  }

  // First-touch UTM attribution from the landing URL (don't overwrite if set).
  const sp = request.nextUrl.searchParams
  const utmSource = sp.get('utm_source')
  if (utmSource && !request.cookies.get('ielts_attribution')) {
    const cap = (v: string | null) => (v ? v.slice(0, 200) : null)
    const attribution = {
      utm_source: cap(utmSource),
      utm_medium: cap(sp.get('utm_medium')),
      utm_campaign: cap(sp.get('utm_campaign')),
      utm_content: cap(sp.get('utm_content')),
      utm_term: cap(sp.get('utm_term')),
      referrer: cap(request.headers.get('referer')),
      landing_path: pathname,
    }
    supabaseResponse.cookies.set('ielts_attribution', JSON.stringify(attribution), {
      httpOnly: true, secure, sameSite: 'lax', maxAge: 60 * 24 * 60 * 60, path: '/',
    })
  }

  return supabaseResponse
}
