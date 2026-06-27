'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { track } from '@/lib/analytics/track'
import { signUp, signInWithGoogle, resendConfirmation } from '@/lib/services/auth'
import { saveDiagnosticData } from '@/lib/services/diagnostic'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => { track('signup_started') }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(t('auth.errorWeakPassword'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.errorPasswordMismatch'))
      return
    }

    setLoading(true)
    const { data, error: authError } = await signUp(email, password, name)
    setLoading(false)

    if (authError) {
      console.error('[signup] auth.signUp error:', authError)
      if (authError.message.toLowerCase().includes('already registered') ||
          authError.message.toLowerCase().includes('already exists')) {
        setError(t('auth.errorEmailExists'))
      } else {
        setError(authError.message)
      }
      return
    }

    console.log('[signup] success, user:', data?.user?.id, 'session:', data?.session ? 'present' : 'null (email confirmation pending)')

    if (data?.session) {
      // Email confirmation disabled — save diagnostic data then go to dashboard
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await saveDiagnosticData(user.id)
        }
        // This path skips /auth/callback, so attribute the referral here.
        await fetch('/api/referral/claim', { method: 'POST' })
      } catch {
        // non-fatal — proceed to dashboard anyway
      }
      router.push('/dashboard')
    } else {
      // Email confirmation required — show check-your-email screen
      setEmailSent(true)
    }
  }

  async function handleGoogleSignUp() {
    const { error: authError } = await signInWithGoogle()
    if (authError) {
      console.error('[signup] Google signIn error:', authError)
      setError(authError.message)
    }
  }

  async function handleResend() {
    setResendLoading(true)
    setResendSuccess(false)
    await resendConfirmation(email)
    setResendLoading(false)
    setResendSuccess(true)
  }

  if (emailSent) {
    return (
      <div className="w-full max-w-md">
        <div className="card text-center" style={{ padding: 32, boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 mx-auto mb-6">
            <Mail className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('auth.confirmEmailTitle')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {t('auth.confirmEmailSubtitle', { email })}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            {t('auth.confirmEmailBody')}
          </p>

          <Link
            href="/login"
            className="block w-full py-3 rounded-xl text-sm font-semibold btn-primary text-white text-center mb-4"
          >
            {t('auth.confirmEmailSignIn')}
          </Link>

          {resendSuccess ? (
            <p className="text-sm text-green-600 dark:text-green-400">{t('auth.resendEmailSent')}</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-60"
            >
              {resendLoading ? t('auth.resendEmailLoading') : t('auth.resendEmail')}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="card" style={{ padding: 32, boxShadow: 'var(--shadow-lg)' }}>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('auth.signupTitle')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('auth.signupSubtitle')}
          </p>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', color: 'var(--text)',
            cursor: 'pointer', marginBottom: 20, opacity: loading ? 0.6 : 1, transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elev)')}
        >
          <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('auth.googleBtn')}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-3)]">{t('auth.orContinueWith')}</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'var(--danger-soft, rgba(220,38,38,0.1))', color: 'var(--danger, #dc2626)', border: '1px solid var(--danger, #dc2626)' }}
            >
              {error}
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
              {t('auth.nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="input"
              placeholder="Alex Johnson"
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
              {t('auth.emailLabel')}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
              {t('auth.passwordLabel')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="input" style={{ paddingRight: 44 }}
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
              {t('auth.confirmPasswordLabel')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer',
              opacity: loading ? 0.6 : 1, marginTop: 4, transition: 'background .15s',
            }}
          >
            {loading ? t('auth.signupLoading') : t('auth.signupBtn')}
          </button>
        </form>

        {/* Terms */}
        <p className="text-center text-xs text-[var(--text-3)] dark:text-gray-500 mt-4">
          {t('auth.agreeToTerms')}{' '}
          <Link href="/terms" className="text-indigo-500 hover:underline">{t('auth.termsLink')}</Link>
          {' '}{t('auth.andWord')}{' '}
          <Link href="/privacy" className="text-indigo-500 hover:underline">{t('auth.privacyLink')}</Link>
        </p>

        {/* Sign in link */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          {t('auth.hasAccount')}{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', transition: 'opacity .15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {t('auth.signInLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
