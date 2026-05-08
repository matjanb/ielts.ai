'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, RotateCcw, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { Suspense } from 'react'

function ResultsContent({ id }: { id: string }) {
  const { t } = useLanguage()
  const params = useSearchParams()
  const score   = parseFloat(params.get('score')   ?? '0')
  const correct = parseInt(params.get('correct')   ?? '0')
  const total   = parseInt(params.get('total')     ?? '1')
  const graded  = parseInt(params.get('graded')    ?? String(total))
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0

  const color   = score >= 7 ? 'text-emerald-500' : score >= 6 ? 'text-amber-500' : 'text-red-500'
  const bgColor = score >= 7 ? 'bg-emerald-50 dark:bg-emerald-500/10' : score >= 6 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-red-50 dark:bg-red-500/10'

  // Reading is auto-graded from the sample questions.
  // Writing, Speaking, and Listening are essays in the sample test — not auto-gradeable.
  // Show '—' for those to avoid displaying fake scores.
  const skillScores = [
    { label: t('mockTest.reading'),   score: graded > 0 ? score : null, pct: graded > 0 ? pct : 0, graded: graded > 0 },
    { label: t('mockTest.writing'),   score: null, pct: 0, graded: false },
    { label: t('mockTest.speaking'),  score: null, pct: 0, graded: false },
    { label: t('mockTest.listening'), score: null, pct: 0, graded: false },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Overall score card */}
      <div className={`rounded-3xl ${bgColor} border border-gray-100 dark:border-gray-800 p-8 text-center`}>
        <div className="flex justify-center mb-4">
          <Trophy size={36} className={color} />
        </div>
        <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('mockTest.testComplete')}</h1>
        <div className={`text-8xl font-bold tracking-tight mb-2 ${color}`}>{score}</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('mockTest.overallScore')}</p>
        <div className="flex items-center justify-center gap-4 mt-6 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <CheckCircle2 size={14} className="text-emerald-500" />
            {correct} {t('mockTest.correctAnswers')}
          </div>
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <XCircle size={14} className="text-red-400" />
            {total - correct} incorrect
          </div>
        </div>
      </div>

      {/* Section scores */}
      <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">{t('mockTest.sectionScores')}</h2>
        <div className="space-y-4">
          {skillScores.map(({ label, score: s, pct: p, graded: g }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                {g && s != null
                  ? <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{s.toFixed(1)}</span>
                  : <span className="text-xs text-gray-400 dark:text-gray-600">essay — not auto-graded</span>
                }
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                  style={{ width: g ? `${Math.min(p, 100)}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-3">
          Writing and Speaking essays require manual or AI evaluation via the practice sections.
        </p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href={`/mock-tests/${id}`}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
        >
          <RotateCcw size={14} />
          {t('mockTest.retakeTest')}
        </Link>
        <Link
          href="/mock-tests"
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold btn-primary text-white"
        >
          {t('mockTest.backToTests')}
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  )
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /></div>}>
      <ResultsContent id={params.id} />
    </Suspense>
  )
}
