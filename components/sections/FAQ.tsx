'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const FAQ_KEYS = ['1','2','3','4','5','6','7']

export function FAQ() {
  const { t } = useLanguage()
  const [open, setOpen] = useState<string | null>('1')

  return (
    <section id="faq" className="py-28 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500 dark:text-indigo-400 mb-4">
            {t('faq.sectionBadge')}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            {t('faq.sectionTitle')}
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed">
            {t('faq.sectionSubtitle')}
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-px">
          {FAQ_KEYS.map((key, i) => {
            const isOpen = open === key
            return (
              <div
                key={key}
                className={`border-b transition-colors duration-200 ${
                  i === 0 ? 'border-t' : ''
                } ${isOpen
                  ? 'border-gray-200 dark:border-gray-800'
                  : 'border-gray-100 dark:border-gray-800/60'
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : key)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                >
                  <span className={`text-sm font-medium transition-colors ${
                    isOpen ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                  }`}>
                    {t(`faq.q${key}`)}
                  </span>
                  <ChevronDown
                    size={16}
                    strokeWidth={2}
                    className={`shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="pb-5 animate-slide-down">
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {t(`faq.a${key}`)}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
