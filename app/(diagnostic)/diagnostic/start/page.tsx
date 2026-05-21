'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Brain, Target } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'

export default function DiagnosticStartPage() {
  const { t } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    // Logged-in users who already completed diagnostic → dashboard
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await (createClient() as any)
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()
      if (profile?.onboarding_completed) {
        router.replace('/dashboard')
      }
    })
  }, [router])

  const features = [
    { icon: Brain, text: t('diagnostic.startFeature1') },
    { icon: Target, text: t('diagnostic.startFeature2') },
    { icon: CheckCircle2, text: t('diagnostic.startFeature3') },
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-indigo-500/6 dark:bg-indigo-500/5 blur-[100px]" />
        <div className="absolute top-[40%] right-[10%] w-[250px] h-[250px] rounded-full bg-violet-500/5 dark:bg-violet-500/4 blur-[80px]" />
      </div>

      <div className="w-full max-w-lg text-center animate-fade-in-up">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          {t('diagnostic.startBadge')}
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-5 tracking-tight leading-[1.1]">
          {t('diagnostic.startTitle')}
        </h1>

        {/* Subtitle */}
        <p className="text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-12 leading-relaxed">
          {t('diagnostic.startSubtitle')}
        </p>

        {/* Features */}
        <div className="flex flex-col gap-3 mb-12 text-left max-w-sm mx-auto">
          {features.map(({ icon: Icon, text }, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 animate-fade-in-up"
              style={{ animationDelay: `${(i + 1) * 80}ms` }}
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Icon size={15} strokeWidth={2} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/diagnostic/background"
          className="inline-flex items-center gap-2.5 btn-primary text-white font-semibold px-8 py-4 rounded-2xl text-base"
        >
          {t('diagnostic.startCta')}
          <ArrowRight size={18} strokeWidth={2.5} />
        </Link>

        {/* Note */}
        <p className="mt-5 text-xs text-gray-400 dark:text-gray-600">
          {t('diagnostic.startNoteAccount')}
        </p>

        {/* Sign in link for existing users */}
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t('auth.hasAccount')}{' '}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            {t('auth.signInLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
