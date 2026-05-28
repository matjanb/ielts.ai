'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { Question, TestSection } from '@/lib/types/database'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'
import { getSectionsByTestId, getQuestionsBySectionIds } from '@/lib/services/tests'
import { getAttemptWithAnswers } from '@/lib/services/attempts'

type QuestionWithSection = Question & { sectionNumber: number; sectionTitle: string }
interface SectionScore { correct: number; total: number }

export default function ListeningResultsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams<{ testId: string }>()
  const searchParams = useSearchParams()

  const testId    = params?.testId ?? ''
  const rawScore  = Number(searchParams.get('score') ?? 0)
  const band      = Number(searchParams.get('band') ?? 0)
  const attemptId = searchParams.get('attempt') ?? ''

  let sectionScores: Record<string, SectionScore> = {}
  try { sectionScores = JSON.parse(decodeURIComponent(searchParams.get('sections') ?? '{}')) } catch { /* use empty */ }
  const sectionNums = Object.keys(sectionScores).map(Number).sort((a, b) => a - b)

  const [questions, setQuestions]   = useState<QuestionWithSection[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [sections, setSections]     = useState<TestSection[]>([])
  const [reviewLoading, setReviewLoading] = useState(true)

  useEffect(() => {
    if (!testId) { setReviewLoading(false); return }
    async function load() {
      try {
        const secs = await getSectionsByTestId(testId)
        setSections(secs)
        if (secs.length > 0) {
          const sectionIds = secs.map((s: TestSection) => s.id)
          const questionsData = await getQuestionsBySectionIds(sectionIds)
          const sectionMap = new Map(secs.map((s: TestSection) => [s.id, s]))
          const enriched: QuestionWithSection[] = (questionsData as Question[]).map(q => ({
            ...q,
            sectionNumber: (sectionMap.get(q.section_id) as TestSection | undefined)?.section_number ?? 0,
            sectionTitle:  (sectionMap.get(q.section_id) as TestSection | undefined)?.title ?? '',
          }))
          setQuestions(enriched)
        }
        if (attemptId) {
          const { answers } = await getAttemptWithAnswers(attemptId)
          const map: Record<string, string> = {}
          for (const a of answers) map[a.question_id] = a.user_answer ?? ''
          setUserAnswers(map)
        }
      } catch { /* review is best-effort */ }
      finally { setReviewLoading(false) }
    }
    load()
  }, [testId, attemptId])

  const bandColor = band >= 7 ? 'var(--accent)' : band >= 6 ? 'var(--info)' : band >= 5 ? 'var(--warn)' : 'var(--danger)'

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '3px 12px', borderRadius: 999, display: 'inline-block', marginBottom: 14 }}>
          Listening
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', margin: 0, color: 'var(--text)' }}>
          {t('listening.resultsTitle')}
        </h1>
      </div>

      {/* Score card */}
      <div className="card" style={{ padding: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginBottom: 20, boxShadow: 'var(--shadow-lg)' }}>
        {/* Band badge */}
        <div style={{
          width: 128, height: 128, borderRadius: 24,
          background: `color-mix(in srgb, ${bandColor} 15%, transparent)`,
          border: `2px solid ${bandColor}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 56, lineHeight: 1, fontWeight: 500, color: bandColor }}>
            {band.toFixed(1)}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: bandColor, opacity: 0.7, letterSpacing: '0.06em' }}>BAND</span>
        </div>

        {/* Raw score */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 4px' }}>{t('listening.rawScore')}</p>
          <p style={{ fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums', margin: 0, color: 'var(--text)' }}>
            {rawScore} <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-3)' }}>/ 40</span>
          </p>
        </div>

        {/* Section breakdown */}
        {sectionNums.length > 0 && (
          <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: 20, display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, sectionNums.length)}, 1fr)`, gap: 12 }}>
            {sectionNums.map(n => {
              const sc = sectionScores[String(n)] ?? { correct: 0, total: 0 }
              const pct = sc.total > 0 ? Math.round((sc.correct / sc.total) * 100) : 0
              return (
                <div key={n} style={{ padding: 14, background: 'var(--bg-soft)', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>
                    {t('listening.section')} {n}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                    {sc.correct}
                    <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-3)' }}>/{sc.total}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{pct}%</div>
                  <div style={{ marginTop: 8, height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct >= 75 ? 'var(--accent)' : pct >= 50 ? 'var(--warn)' : 'var(--danger)', borderRadius: 999 }}/>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Answer review */}
      {reviewLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 0', fontSize: 13, color: 'var(--text-3)' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          {t('common.loading')}
        </div>
      ) : questions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{t('listening.allQuestions')}</h2>
          {sectionNums.map(n => {
            const sec = sections.find(s => s.section_number === n)
            const qs = questions.filter(q => q.sectionNumber === n)
            if (qs.length === 0) return null
            return (
              <div key={n} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                    {t('listening.section')} {n}
                  </span>
                  {sec && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{sec.title}</span>}
                </div>
                <div>
                  {qs.map((q, i) => {
                    const userAns = userAnswers[q.id] ?? ''
                    const isCorrect = isAnswerCorrect(userAns, q.correct_answer)
                    return (
                      <div key={q.id} style={{ padding: '14px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flexShrink: 0, marginTop: 1 }}>
                          {isCorrect ? (
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>
                          ) : (
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12M18 6L6 18"/></svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', margin: '0 0 6px' }}>
                            <span style={{ color: 'var(--text-3)', marginRight: 6 }}>Q{q.question_number}.</span>
                            {q.question_text}
                          </p>
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: isCorrect ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>{t('listening.yourAnswer2')}:</span>
                            <span style={{ color: isCorrect ? 'var(--accent)' : 'var(--danger)', marginLeft: 6 }}>{userAns || '—'}</span>
                            {!isCorrect && (
                              <span style={{ marginLeft: 14, color: 'var(--accent)' }}>
                                <span style={{ fontWeight: 600 }}>{t('listening.correctAnswer')}:</span>
                                <span style={{ marginLeft: 6 }}>{q.correct_answer}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button onClick={() => router.push('/dashboard')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 600,
          border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text)', cursor: 'pointer',
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>
          {t('listening.backToDashboard')}
        </button>
        <button onClick={() => router.push(`/listening/${testId}`)} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer',
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.5 8A9 9 0 0 0 5.2 5.2L1 10M23 14l-4.2 4.8A9 9 0 0 1 3.5 16"/></svg>
          {t('listening.retakeTest')}
        </button>
      </div>
    </div>
  )
}
