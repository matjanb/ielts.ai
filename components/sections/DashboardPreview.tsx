'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import { DashboardMockup } from './DashboardMockup'

export function DashboardPreview() {
  const { t } = useLanguage()

  return (
    <section id="dashboard" className="py-28 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500 dark:text-indigo-400 mb-4">
            {t('dashboardPreview.sectionBadge')}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            {t('dashboardPreview.sectionTitle')}
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            {t('dashboardPreview.sectionSubtitle')}
          </p>
        </div>

        {/* Mockup with ambient glow */}
        <div className="relative animate-fade-in-up">
          <div className="absolute -inset-8 bg-indigo-500/5 dark:bg-indigo-500/8 rounded-3xl blur-3xl -z-10" />
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}
