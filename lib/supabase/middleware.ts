import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/types/database'
import { isSubscriptionActive } from '@/lib/subscription'

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
  const AUTH_ONLY_ROUTES = ['/onboarding', '/subscription']

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_expires_at')
      .eq('id', user.id)
      .single<{ subscription_status: string; subscription_expires_at: string | null }>()

    if (!isSubscriptionActive(profile)) {
      return NextResponse.redirect(new URL('/subscription', request.url))
    }
  }

  return supabaseResponse
}
