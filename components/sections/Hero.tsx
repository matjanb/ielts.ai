'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { DashboardMockup } from './DashboardMockup'

export function Hero() {
  const { t } = useLanguage()

  return (
    <section id="home" className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-28 px-4 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-indigo-500/8 dark:bg-indigo-500/6 blur-[130px]" />
        <div className="absolute top-[25%] left-[8%] w-[350px] h-[350px] rounded-full bg-violet-500/5 dark:bg-violet-500/4 blur-[100px]" />
        <div className="absolute top-[35%] right-[8%] w-[280px] h-[280px] rounded-full bg-blue-500/5 dark:bg-blue-500/4 blur-[90px]" />
      </div>

      {/* Badge */}
      <div className="animate-fade-in-up mb-7">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          {t('hero.badge')}
        </span>
      </div>

      {/* Headline */}
      <h1 className="animate-fade-in-up delay-100 text-center text-[2.75rem] sm:text-6xl md:text-7xl font-bold tracking-tight text-gray-900 dark:text-white max-w-4xl mb-5 leading-[1.08]">
        {t('hero.headline')}{' '}
        <span className="gradient-text">{t('hero.headlineAccent')}</span>
      </h1>

      {/* Subtitle */}
      <p className="animate-fade-in-up delay-200 text-center text-lg text-gray-500 dark:text-gray-400 max-w-xl mb-10 leading-relaxed">
        {t('hero.subtitle')}
      </p>

      {/* CTAs */}
      <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row items-center gap-3 mb-20">
        <Link
          href="/diagnostic/start"
          className="btn-primary text-white font-semibold px-7 py-3.5 rounded-2xl text-sm flex items-center gap-2"
        >
          {t('hero.cta')}
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
        <button
          onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
          className="px-6 py-3.5 rounded-2xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
        >
          {t('hero.ctaSecondary')}
        </button>
      </div>

      {/* Stats */}
      <div className="animate-fade-in-up delay-400 flex items-center gap-px mb-20">
        {[
          { value: t('hero.stat1Value'), label: t('hero.stat1Label') },
          { value: t('hero.stat2Value'), label: t('hero.stat2Label') },
          { value: t('hero.stat3Value'), label: t('hero.stat3Label') },
        ].map((stat, i) => (
          <div key={i} className={`text-center px-8 ${i < 2 ? 'border-r border-gray-200 dark:border-gray-800' : ''}`}>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Dashboard preview */}
      <div className="animate-fade-in-up delay-500 w-full max-w-4xl relative">
        <div className="absolute -inset-6 bg-indigo-500/6 dark:bg-indigo-500/8 rounded-3xl blur-2xl -z-10" />
        <DashboardMockup />
      </div>
    </section>
  )
}
