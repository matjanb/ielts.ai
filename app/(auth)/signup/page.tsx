'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { signUp, signInWithGoogle, resendConfirmation } from '@/lib/services/auth'

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
      // Email confirmation disabled — go straight to onboarding
      router.push('/onboarding')
    } else {
      // Email confirmation required — show check-your-email screen
      setEmailSent(true)
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
        <div className="bg-white dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-xl shadow-black/5 dark:shadow-black/30 text-center">
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
      <div className="bg-white dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-xl shadow-black/5 dark:shadow-black/30">

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
          onClick={() => signInWithGoogle()}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 mb-6"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('auth.googleBtn')}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-gray-400">{t('auth.orContinueWith')}</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('auth.nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              placeholder="Alex Johnson"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('auth.emailLabel')}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('auth.passwordLabel')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 pr-11 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('auth.confirmPasswordLabel')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-60 mt-2"
          >
            {loading ? t('auth.signupLoading') : t('auth.signupBtn')}
          </button>
        </form>

        {/* Terms */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          {t('auth.agreeToTerms')}{' '}
          <Link href="/terms" className="text-indigo-500 hover:underline">{t('auth.termsLink')}</Link>
          {' '}{t('auth.andWord')}{' '}
          <Link href="/privacy" className="text-indigo-500 hover:underline">{t('auth.privacyLink')}</Link>
        </p>

        {/* Sign in link */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          {t('auth.hasAccount')}{' '}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            {t('auth.signInLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
