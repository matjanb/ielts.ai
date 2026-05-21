'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const TIERS = [
  {
    nameKey: 'starterName',
    priceKey: 'starterPrice',
    descKey: 'starterDesc',
    featureKeys: ['starterF1','starterF2','starterF3','starterF4','starterF5'],
    ctaKey: 'startFree',
    href: '/diagnostic/start',
    popular: false,
    annualMultiplier: null,
  },
  {
    nameKey: 'proName',
    priceKey: 'proPrice',
    descKey: 'proDesc',
    featureKeys: ['proF1','proF2','proF3','proF4','proF5','proF6'],
    ctaKey: 'choosePlan',
    href: '/diagnostic/start',
    popular: true,
    annualMultiplier: 0.7,
  },
  {
    nameKey: 'expertName',
    priceKey: 'expertPrice',
    descKey: 'expertDesc',
    featureKeys: ['expertF1','expertF2','expertF3','expertF4','expertF5','expertF6'],
    ctaKey: 'choosePlan',
    href: '/diagnostic/start',
    popular: false,
    annualMultiplier: 0.7,
  },
]

export function Pricing() {
  const { t } = useLanguage()
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-28 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500 dark:text-indigo-400 mb-4">
            {t('pricing.sectionBadge')}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            {t('pricing.sectionTitle')}
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-10 leading-relaxed">
            {t('pricing.sectionSubtitle')}
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-px bg-gray-100 dark:bg-gray-800/80 rounded-xl p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                !annual
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                annual
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('pricing.annual')}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {t('pricing.saveLabel')}
              </span>
            </button>
          </div>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map(({ nameKey, priceKey, descKey, featureKeys, ctaKey, href, popular, annualMultiplier }, i) => {
            const basePrice = parseInt(t(`pricing.${priceKey}`))
            const displayPrice = annual && annualMultiplier
              ? Math.round(basePrice * annualMultiplier)
              : basePrice

            return (
              <div
                key={nameKey}
                className={`relative flex flex-col rounded-2xl p-7 transition-all duration-200 animate-fade-in-up ${
                  popular
                    ? 'bg-gray-950 dark:bg-white text-white dark:text-gray-900 shadow-2xl shadow-gray-950/25 dark:shadow-black/30 ring-1 ring-gray-900/10 dark:ring-white/10'
                    : 'bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md hover:shadow-black/4'
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold tracking-wide uppercase">
                    {t('pricing.popular')}
                  </div>
                )}

                <div className="mb-7">
                  <h3 className={`text-sm font-semibold mb-1 ${popular ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                    {t(`pricing.${nameKey}`)}
                  </h3>
                  <div className="flex items-end gap-1 mb-3">
                    <span className={`text-4xl font-bold tracking-tight ${popular ? 'text-white dark:text-gray-900' : 'text-gray-900 dark:text-white'}`}>
                      ${displayPrice}
                    </span>
                    {basePrice > 0 && (
                      <span className={`text-sm mb-1 ${popular ? 'text-gray-500 dark:text-gray-500' : 'text-gray-400'}`}>
                        {t('pricing.perMonth')}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${popular ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {t(`pricing.${descKey}`)}
                  </p>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {featureKeys.map(key => (
                    <li key={key} className="flex items-start gap-2.5 text-sm">
                      <Check size={14} strokeWidth={2.5} className={`mt-0.5 shrink-0 ${popular ? 'text-indigo-400 dark:text-indigo-500' : 'text-indigo-500'}`} />
                      <span className={popular ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}>
                        {t(`pricing.${key}`)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={href}
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    popular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  {t(`pricing.${ctaKey}`)}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
