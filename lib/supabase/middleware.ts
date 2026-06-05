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

  // Routes that require the user to be logged in. The dashboard and tests are
  // reachable without a subscription — non-subscribers see them behind a paywall
  // overlay (rendered in the dashboard layout). The actual AI endpoints are
  // enforced server-side (hasActiveSubscription → 403).
  // The landing page and the /diagnostic funnel stay fully public so anonymous
  // visitors can run the placement test before signing up.
  const AUTH_ROUTES = [
    '/dashboard', '/mock-tests', '/listening', '/reading', '/writing', '/vocabulary',
    '/onboarding', '/subscription',
  ]

  const matches = (routes: string[]) =>
    routes.some(r => pathname === r || pathname.startsWith(r + '/'))

  const needsAuth   = matches(AUTH_ROUTES)
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  if (needsAuth && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}
