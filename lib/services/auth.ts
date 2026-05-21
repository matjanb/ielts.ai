import { createClient } from '@/lib/supabase/client'

export async function signUp(email: string, password: string, fullName: string) {
  console.log('[auth] signUp — Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(missing)')
  console.log('[auth] signUp — anon key present:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const supabase = createClient()

  // auth.signUp creates the user in auth.users.
  // The handle_new_user DB trigger automatically inserts a row in public.profiles.
  // No manual profile insert needed here.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) {
    console.error('[auth] signUp — auth error:', error)
  } else {
    console.log('[auth] signUp — auth success, user id:', data.user?.id)
    if (!data.session) {
      console.log('[auth] signUp — no session yet (email confirmation may be required)')
    }
  }

  return { data, error }
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signInWithGoogle() {
  const supabase = createClient()

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  return { data, error }
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export async function resendConfirmation(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  return { error }
}

export async function resetPassword(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  return { error }
}
