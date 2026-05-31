'use client'

import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { Question, TestSection } from '@/lib/types/database'
import { getSectionsByTestId, getQuestionsBySectionIds } from '@/lib/services/tests'
import { getAttemptWithAnswers } from '@/lib/services/attempts'

type QuestionWithSection = Question & { sectionNumber: number; sectionTitle: string }
type UserAnswer = { question_id: string; user_answer: string | null; is_correct: boolean | null }

export default function ReadingResultsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams<{ testId: string }>()
  const searchParams = useSearchParams()

  const testId    = params.testId
  const score     = Number(searchParams.get('score') ?? 0)
  const band      = Number(searchParams.get('band') ?? 0)
  const attemptId = searchParams.get('attempt') ?? ''

  const sectionScores: Record<string, { correct: number; total: number }> = (() => {
    try { return JSON.parse(decodeURIComponent(searchParams.get('sections') ?? '{}')) } catch { return {} }
  })()

  const [questions,   setQuestions]   = useState<QuestionWithSection[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({})
  const [sections,    setSections]    = useState<TestSection[]>([])
  const [loading,     setLoading]     = useState(true)
  const [activePassage, setActivePassage] = useState(1)

  // ── Keep all existing data loading unchanged ──────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const secs = await getSectionsByTestId(testId)
        setSections(secs)
        const sectionIds = secs.map((s: TestSection) => s.id)
        const rawQ = await getQuestionsBySectionIds(sectionIds)
        const sectionMap = new Map(secs.map((s: TestSection) => [s.id, s]))
        const enriched: QuestionWithSection[] = rawQ.map((q: Question) => ({
          ...q,
          sectionNumber: sectionMap.get(q.section_id)?.section_number ?? 0,
          sectionTitle:  sectionMap.get(q.section_id)?.title ?? '',
        }))
        setQuestions(enriched)
        if (attemptId) {
          const { answers } = await getAttemptWithAnswers(attemptId)
          const map: Record<string, UserAnswer> = {}
          for (const a of answers) map[a.question_id] = a
          setUserAnswers(map)
        }
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [testId, attemptId])

  const bandColor = band >= 7 ? 'var(--accent)' : band >= 5.5 ? 'var(--info)' : 'var(--warn)'
  const passageQuestions = questions.filter(q => q.sectionNumber === activePassage)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 32px 80px' }}>

      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <button onClick={() => router.push('/dashboard')} style={{
          display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-2)',
          background: 'none', border: 'none', cursor: 'pointer',
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 19l-7-7 7-7"/></svg>
          {t('reading.backToDashboard')}
        </button>
        <button onClick={() => router.push(`/reading/${testId}`)} style={{
          display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600,
          color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer',
        }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.5 8A9 9 0 0 0 5.2 5.2L1 10M23 14l-4.2 4.8A9 9 0 0 1 3.5 16"/></svg>
          {t('reading.retakeTest')}
        </button>
      </div>

      {/* Score card */}
      <div className="card" style={{ padding: 32, marginBottom: 20, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Band badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 120, height: 120, borderRadius: 22,
              background: `color-mix(in srgb, ${bandColor} 12%, transparent)`,
              border: `2px solid ${bandColor}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 52, lineHeight: 1, fontWeight: 500, color: bandColor }}>
                {band.toFixed(1)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: bandColor, opacity: 0.7, marginTop: 2 }}>BAND</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{t('reading.rawScore')}</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                {score} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-3)' }}>/ 40</span>
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div style={{ width: '100%', maxWidth: 500 }}>
            <div style={{ height: 8, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${(score / 40) * 100}%`, height: '100%', background: bandColor, borderRadius: 999, transition: 'width .6s' }}/>
            </div>
          </div>

          {/* Passage breakdown */}
          {sections.length > 0 && (
            <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: 20, display: 'grid', gridTemplateColumns: `repeat(${sections.length}, 1fr)`, gap: 12 }}>
              {sections.map(sec => {
                const s = sectionScores[sec.section_number] ?? { correct: 0, total: 0 }
                const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
                return (
                  <div key={sec.id} style={{ padding: 14, background: 'var(--bg-soft)', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 6 }}>
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h7a3 3 0 0 1 3 3v13"/><path d="M20 4h-7a3 3 0 0 0-3 3"/><path d="M4 4v15a1 1 0 0 0 1 1h15"/>
                      </svg>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)' }}>P{sec.section_number}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                      {s.correct}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>/{s.total}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{pct}%</div>
                    <div style={{ marginTop: 8, height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 75 ? 'var(--accent)' : pct >= 50 ? 'var(--warn)' : 'var(--danger)', borderRadius: 999 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Passage tabs */}
      {sections.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {sections.map(sec => (
            <button key={sec.id} onClick={() => setActivePassage(sec.section_number)} style={{
              padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: activePassage === sec.section_number ? 'var(--accent)' : 'var(--bg-soft)',
              color: activePassage === sec.section_number ? 'var(--accent-fg)' : 'var(--text-2)',
              border: 'none', cursor: 'pointer', transition: 'all .15s',
            }}>
              {t('reading.passage')} {sec.section_number}
            </button>
          ))}
        </div>
      )}

      {/* Question breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {passageQuestions.map(q => {
          const ua = userAnswers[q.id]
          const isCorrect = ua?.is_correct ?? false
          const userAns = ua?.user_answer ?? '—'
          const accentColor = isCorrect ? 'var(--accent)' : 'var(--danger)'

          return (
            <div key={q.id} className="card" style={{
              padding: '16px 20px',
              borderColor: isCorrect
                ? 'color-mix(in srgb, var(--accent) 30%, var(--border))'
                : 'color-mix(in srgb, var(--danger) 30%, var(--border))',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flexShrink: 0, marginTop: 1 }}>
                  {isCorrect ? (
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>
                  ) : (
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12M18 6L6 18"/></svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.45 }}>
                    <span style={{ color: 'var(--text-3)', marginRight: 6 }}>Q{q.question_number}.</span>
                    {q.question_text}
                  </p>
                  <div style={{ fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <span>
                      <span style={{ color: accentColor, fontWeight: 600 }}>Your answer:</span>
                      <span style={{ color: accentColor, marginLeft: 6 }}>{userAns}</span>
                    </span>
                    {!isCorrect && (
                      <span>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Correct:</span>
                        <span style={{ color: 'var(--accent)', marginLeft: 6 }}>{q.correct_answer}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
