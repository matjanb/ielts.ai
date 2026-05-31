'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { signIn, signInWithGoogle, resendConfirmation } from '@/lib/services/auth'
import { createClient } from '@/lib/supabase/client'

export default function LoginClient() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) setError(decodeURIComponent(urlError))
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setEmailNotConfirmed(false)
    setResendSuccess(false)
    setLoading(true)

    const { error: authError } = await signIn(email, password)

    if (authError) {
      console.error('[login] signIn error:', authError)
      setLoading(false)
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        setEmailNotConfirmed(true)
      } else {
        setError(authError.message)
      }
      return
    }

    // Check if diagnostic/onboarding was completed and redirect accordingly
    router.refresh()
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
        if (!profile?.onboarding_completed) {
          router.replace('/diagnostic/start')
          return
        }
      }
    } catch {
      // ignore profile check errors — fall through to dashboard
    }
    router.replace('/dashboard')
    // Keep loading=true so button stays disabled during navigation
  }

  async function handleResend() {
    setResendLoading(true)
    setResendSuccess(false)
    await resendConfirmation(email)
    setResendLoading(false)
    setResendSuccess(true)
  }

  async function handleGoogleSignIn() {
    const { error: authError } = await signInWithGoogle()
    if (authError) {
      console.error('[login] Google signIn error:', authError)
      setError(authError.message)
    }
    // On success, Google OAuth redirects the browser — no manual navigation needed
  }

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 18, marginBottom: 20 }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <path d="M4 19L10 5l3 7 2.5-4L20 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="20" cy="6" r="2" fill="var(--accent)"/>
          </svg>
          ielts<span style={{ color: 'var(--accent)' }}>.</span>camp
        </div>
      </div>

      <div className="card" style={{ padding: 32, boxShadow: 'var(--shadow-lg)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--text)' }}>
            {t('auth.loginTitle')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Google button */}
        <button onClick={handleGoogleSignIn} disabled={loading} style={{
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{t('auth.orContinueWith')}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'color-mix(in srgb, var(--danger) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', fontSize: 13, color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {emailNotConfirmed && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'color-mix(in srgb, var(--warn) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)', fontSize: 13, color: 'var(--warn)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0 }}>{t('auth.errorEmailNotConfirmed')}</p>
              {resendSuccess ? (
                <p style={{ margin: 0, color: 'var(--accent)' }}>{t('auth.resendEmailSent')}</p>
              ) : (
                <button type="button" onClick={handleResend} disabled={resendLoading} style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13, color: 'inherit', opacity: resendLoading ? 0.6 : 1 }}>
                  {resendLoading ? t('auth.resendEmailLoading') : t('auth.resendEmail')}
                </button>
              )}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 6 }}>
              {t('auth.emailLabel').toUpperCase()}
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@example.com"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 8, fontSize: 14, border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                {t('auth.passwordLabel').toUpperCase()}
              </label>
              <button type="button" style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {t('auth.forgotPassword')}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width: '100%', padding: '11px 42px 11px 14px', borderRadius: 8, fontSize: 14, border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              />
              <button type="button" onClick={() => setShowPassword(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer',
            opacity: loading ? 0.6 : 1, marginTop: 4, transition: 'background .15s',
          }}>
            {loading ? t('auth.loginLoading') : t('auth.loginBtn')}
          </button>
        </form>

        {/* Sign up link */}
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-2)', marginTop: 20, marginBottom: 0 }}>
          {t('auth.noAccount')}{' '}
          <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            {t('auth.signUpLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
