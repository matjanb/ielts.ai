'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Zap, ArrowLeft, Star } from 'lucide-react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider, useLanguage } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

const FREE_FEATURES = ['limitedMockTests', 'basicFeedback', 'studyGuides', 'communityAccess']
const PRO_FEATURES = ['unlimitedMockTests', 'aiWritingFeedback', 'aiSpeakingFeedback', 'personalizedPlan', 'progressAnalytics', 'prioritySupport']

async function handleCheckout(plan: 'monthly' | 'yearly') {
  // Stripe integration placeholder — replace with real Stripe Checkout session
  console.log('Initiating checkout for plan:', plan)
  alert('Stripe integration coming soon. Add your Stripe keys to enable payments.')
}

function SubscriptionContent() {
  const { t } = useLanguage()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  const monthlyPrice = 19
  const yearlyMonthly = Math.round(monthlyPrice * 0.7)
  const yearlyTotal = yearlyMonthly * 12

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#06060f]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#080812]">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={16} />
          {t('common.back')}
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20 text-sm font-semibold mb-5">
            <Star size={14} />
            {t('subscription.proName')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t('subscription.title')}
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            {t('subscription.subtitle')}
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                billing === 'monthly'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t('subscription.monthly')}
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                billing === 'yearly'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t('subscription.yearly')}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                {t('subscription.saveLabel')}
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* Free plan */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('subscription.freeName')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('subscription.freeDesc')}</p>
            </div>
            <div className="flex items-end gap-1 mb-7">
              <span className="text-5xl font-bold text-gray-900 dark:text-white">$0</span>
              <span className="text-sm text-gray-400 mb-2">{t('subscription.perMonth')}</span>
            </div>
            <ul className="space-y-3 mb-7">
              {FREE_FEATURES.map(key => (
                <li key={key} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <Check size={14} className="text-gray-400 shrink-0" />
                  {t(`subscription.${key}`)}
                </li>
              ))}
            </ul>
            <div className="block text-center py-3 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 cursor-default">
              {t('subscription.currentPlan')}
            </div>
          </div>

          {/* Pro plan */}
          <div className="relative rounded-2xl bg-gray-900 dark:bg-white p-7 shadow-2xl shadow-gray-900/25 dark:shadow-black/40">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold">
              <Zap size={11} />
              {t('subscription.proName')}
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white dark:text-gray-900 mb-1">{t('subscription.proName')}</h2>
              <p className="text-sm text-gray-400 dark:text-gray-600">{t('subscription.proDesc')}</p>
            </div>
            <div className="flex items-end gap-1 mb-7">
              <span className="text-5xl font-bold text-white dark:text-gray-900">
                ${billing === 'yearly' ? yearlyMonthly : monthlyPrice}
              </span>
              <span className="text-sm text-gray-400 dark:text-gray-500 mb-2">{t('subscription.perMonth')}</span>
            </div>
            {billing === 'yearly' && (
              <p className="text-xs text-indigo-400 dark:text-indigo-500 -mt-5 mb-6">
                ${yearlyTotal}{t('subscription.perYear')} — billed annually
              </p>
            )}
            <ul className="space-y-3 mb-7">
              {PRO_FEATURES.map(key => (
                <li key={key} className="flex items-center gap-3 text-sm text-gray-200 dark:text-gray-700">
                  <Check size={14} className="text-indigo-400 dark:text-indigo-500 shrink-0" />
                  {t(`subscription.${key}`)}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(billing)}
              className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 transition-opacity"
            >
              {t('subscription.proBtn')}
            </button>
          </div>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-gray-400 dark:text-gray-600">
          <span>✓ Cancel anytime</span>
          <span>✓ Secure payment</span>
          <span>✓ Instant access</span>
          <span>✓ 7-day money-back</span>
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SubscriptionContent />
      </LanguageProvider>
    </ThemeProvider>
  )
}
