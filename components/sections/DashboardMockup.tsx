'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import {
  BookOpen, Mic, FileText, BarChart3, BrainCircuit,
  CheckCircle2, Clock, Flame
} from 'lucide-react'

export function DashboardMockup() {
  const { t } = useLanguage()

  const scores = [
    { label: t('dashboardPreview.overall'),  score: 7.0, pct: 78, color: 'bg-indigo-500' },
    { label: t('dashboardPreview.writing'),  score: 6.5, pct: 72, color: 'bg-violet-500' },
    { label: t('dashboardPreview.speaking'), score: 7.0, pct: 78, color: 'bg-blue-500'   },
    { label: t('dashboardPreview.reading'),  score: 7.5, pct: 83, color: 'bg-emerald-500' },
  ]

  const barData = [40, 65, 50, 80, 70, 90, 75]
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl shadow-black/15 dark:shadow-black/70 border border-gray-200/80 dark:border-gray-800">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200/80 dark:border-gray-800">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        <div className="flex-1 mx-4 h-5 rounded-md bg-gray-200/80 dark:bg-gray-800 flex items-center px-3">
          <span className="text-[11px] text-gray-400 font-medium">ielts.camp/dashboard</span>
        </div>
      </div>

      {/* Dashboard body */}
      <div className="flex bg-gray-50 dark:bg-[#0a0a18] min-h-[400px]">

        {/* Sidebar */}
        <div className="hidden sm:flex flex-col w-48 border-r border-gray-100 dark:border-gray-800/80 bg-white dark:bg-[#07070f] p-3 gap-0.5">
          <div className="flex items-center gap-2 px-3 py-3 mb-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
              <span className="text-white text-[9px] font-bold">i</span>
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">IELTS Camp</span>
          </div>
          {[
            { icon: BarChart3,    label: t('dashboard.overviewLabel'),  active: true  },
            { icon: BookOpen,     label: t('dashboard.writing'),   active: false },
            { icon: Mic,          label: t('dashboard.speaking'),  active: false },
            { icon: FileText,     label: t('dashboard.mockTests'), active: false },
            { icon: BrainCircuit, label: t('dashboard.studyPlan'), active: false },
          ].map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] transition-all ${
                active
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <Icon size={13} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-5 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">{t('dashboardPreview.greeting')}, Alex</p>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('dashboardPreview.targetBand')}: 7.5
              </h2>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1.5 rounded-xl">
              <Flame size={11} strokeWidth={2} />
              <span className="text-[11px] font-semibold">12 {t('dashboardPreview.days')}</span>
            </div>
          </div>

          {/* Score cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {scores.map(({ label, score, pct, color }) => (
              <div key={label} className="bg-white dark:bg-gray-900/70 rounded-xl p-3 border border-gray-100/80 dark:border-gray-800">
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 font-medium">{label}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">{score}</div>
                <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className={`h-1 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Weekly progress */}
          <div className="bg-white dark:bg-gray-900/70 rounded-xl p-4 border border-gray-100/80 dark:border-gray-800 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-gray-900 dark:text-white">{t('dashboardPreview.weeklyProgress')}</span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Clock size={10} /> 7h 30m
              </span>
            </div>
            <div className="flex items-end gap-1.5 h-14">
              {barData.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-sm transition-all duration-500 ${
                      i === 5 ? 'bg-indigo-500' : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[9px] text-gray-400">{days[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="space-y-1.5">
            {[
              { icon: BookOpen, label: t('dashboardPreview.writingTask'),  score: '7.5', done: true  },
              { icon: Mic,      label: t('dashboardPreview.speakingPart'), score: '7.0', done: true  },
              { icon: FileText, label: t('dashboardPreview.readingTest'),  score: '—',   done: false },
            ].map(({ icon: Icon, label, score, done }) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white dark:bg-gray-900/60 border border-gray-100/80 dark:border-gray-800">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  done ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>
                  <Icon size={12} />
                </div>
                <span className="flex-1 text-[11px] text-gray-600 dark:text-gray-400">{label}</span>
                {done && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{score}</span>
                    <CheckCircle2 size={11} className="text-emerald-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
