'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, RotateCcw, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function ResultsContent({ id }: { id: string }) {
  const { t } = useLanguage()
  const params = useSearchParams()
  const score   = parseFloat(params.get('score')   ?? '0')
  const correct = parseInt(params.get('correct')   ?? '0')
  const total   = parseInt(params.get('total')     ?? '1')
  const graded  = parseInt(params.get('graded')    ?? String(total))
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0

  const accent  = score >= 7 ? 'var(--accent)' : score >= 6 ? 'var(--warn)' : 'var(--danger)'

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
    <div className="space-y-6">
      {/* Overall score card */}
      <div className="card p-8 text-center" style={{ background: `color-mix(in srgb, ${accent} 10%, var(--bg-elev))` }}>
        <div className="flex justify-center mb-4">
          <Trophy size={36} style={{ color: accent }} />
        </div>
        <h1 className="text-lg font-semibold text-[var(--text-2)] mb-2">{t('mockTest.testComplete')}</h1>
        <div className="text-8xl font-bold tracking-tight mb-2" style={{ color: accent }}>{score}</div>
        <p className="text-sm text-[var(--text-2)]">{t('mockTest.overallScore')}</p>
        <div className="flex items-center justify-center gap-4 mt-6 text-sm">
          <div className="flex items-center gap-1.5 text-[var(--text-2)]">
            <CheckCircle2 size={14} className="text-[var(--accent)]" />
            {correct} {t('mockTest.correctAnswers')}
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-2)]">
            <XCircle size={14} style={{ color: "var(--danger)" }} />
            {total - correct} incorrect
          </div>
        </div>
      </div>

      {/* Section scores */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-[var(--text)] mb-5">{t('mockTest.sectionScores')}</h2>
        <div className="space-y-4">
          {skillScores.map(({ label, score: s, pct: p, graded: g }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-[var(--text-2)]">{label}</span>
                {g && s != null
                  ? <span className="text-sm font-bold text-[var(--text)] tabular-nums">{s.toFixed(1)}</span>
                  : <span className="text-xs text-[var(--text-3)]">essay — not auto-graded</span>
                }
              </div>
              <div className="h-1.5 rounded-full bg-[var(--bg-soft)]">
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: g ? `${Math.min(p, 100)}%` : '0%', background: 'var(--accent)' }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-3)] mt-3">
          Writing and Speaking essays require manual or AI evaluation via the practice sections.
        </p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href={`/mock-tests/${id}`}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
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

export default function ResultsClient({ id }: { id: string }) {
  return <ResultsContent id={id} />
}
