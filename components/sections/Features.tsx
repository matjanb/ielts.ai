'use client'

import { PenLine, Mic, FileText, Calendar, TrendingUp, Sparkles } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const ICONS = [PenLine, Mic, FileText, Calendar, TrendingUp, Sparkles]

const ICON_COLORS = [
  'text-indigo-500',
  'text-violet-500',
  'text-blue-500',
  'text-emerald-500',
  'text-rose-500',
  'text-amber-500',
]

const ICON_BG = [
  'bg-indigo-50 dark:bg-indigo-500/8',
  'bg-violet-50 dark:bg-violet-500/8',
  'bg-blue-50 dark:bg-blue-500/8',
  'bg-emerald-50 dark:bg-emerald-500/8',
  'bg-rose-50 dark:bg-rose-500/8',
  'bg-amber-50 dark:bg-amber-500/8',
]

const FEATURE_KEYS = [
  ['writingTitle', 'writingDesc'],
  ['speakingTitle', 'speakingDesc'],
  ['mockTestsTitle', 'mockTestsDesc'],
  ['studyPlanTitle', 'studyPlanDesc'],
  ['trackingTitle', 'trackingDesc'],
  ['recommendationsTitle', 'recommendationsDesc'],
]

export function Features() {
  const { t } = useLanguage()

  return (
    <section id="features" className="py-28 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-20">
          <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500 dark:text-indigo-400 mb-4">
            {t('features.sectionBadge')}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            {t('features.sectionTitle')}
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
            {t('features.sectionSubtitle')}
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURE_KEYS.map(([titleKey, descKey], i) => {
            const Icon = ICONS[i]
            return (
              <div
                key={titleKey}
                className="group p-7 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/3 hover:shadow-lg hover:shadow-black/4 dark:hover:shadow-black/20 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${ICON_BG[i]} ${ICON_COLORS[i]}`}>
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  {t(`features.${titleKey}`)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t(`features.${descKey}`)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
