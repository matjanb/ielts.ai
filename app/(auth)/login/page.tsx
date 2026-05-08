'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { signIn, signInWithGoogle, resendConfirmation } from '@/lib/services/auth'

export default function LoginPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

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

    // Session cookies are now set by the browser Supabase client.
    // router.refresh() re-fetches server components with the new session,
    // then router.replace navigates without adding a history entry.
    router.refresh()
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
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-xl shadow-black/5 dark:shadow-black/30">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('auth.loginTitle')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 mb-6 disabled:opacity-60"
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

          {emailNotConfirmed && (
            <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-700 dark:text-amber-400 space-y-2">
              <p>{t('auth.errorEmailNotConfirmed')}</p>
              {resendSuccess ? (
                <p className="text-green-600 dark:text-green-400">{t('auth.resendEmailSent')}</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="font-medium underline hover:no-underline disabled:opacity-60"
                >
                  {resendLoading ? t('auth.resendEmailLoading') : t('auth.resendEmail')}
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('auth.emailLabel')}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t('auth.passwordLabel')}
              </label>
              <button type="button" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                {t('auth.forgotPassword')}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-11 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold btn-primary text-white disabled:opacity-60 mt-2"
          >
            {loading ? t('auth.loginLoading') : t('auth.loginBtn')}
          </button>
        </form>

        {/* Sign up link */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {t('auth.noAccount')}{' '}
          <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            {t('auth.signUpLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
