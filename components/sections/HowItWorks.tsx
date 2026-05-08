'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

const STEPS = [
  { numKey: 'step1Number', titleKey: 'step1Title', descKey: 'step1Desc' },
  { numKey: 'step2Number', titleKey: 'step2Title', descKey: 'step2Desc' },
  { numKey: 'step3Number', titleKey: 'step3Title', descKey: 'step3Desc' },
]

export function HowItWorks() {
  const { t } = useLanguage()

  return (
    <section id="how" className="py-28 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500 dark:text-indigo-400 mb-4">
            {t('howItWorks.sectionBadge')}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            {t('howItWorks.sectionTitle')}
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            {t('howItWorks.sectionSubtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent" />

          {STEPS.map(({ numKey, titleKey, descKey }, i) => (
            <div
              key={numKey}
              className="relative flex flex-col items-center text-center animate-fade-in-up"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="relative mb-7 w-16 h-16 rounded-2xl flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-black/4 dark:shadow-black/20">
                <span className="text-xl font-bold gradient-text">{t(`howItWorks.${numKey}`)}</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                {t(`howItWorks.${titleKey}`)}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
                {t(`howItWorks.${descKey}`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
