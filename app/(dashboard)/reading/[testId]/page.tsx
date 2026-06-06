'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Send, Clock, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { IeltsTest, TestSection, Question } from '@/lib/types/database'
import { getTestById, getSectionsByTestId, getTestQuestions } from '@/lib/services/tests'
import { createAttempt, saveAnswer as saveAnswerService } from '@/lib/services/attempts'
import { getUser } from '@/lib/services/auth'

type QuestionWithSection = Question & { sectionNumber: number; sectionTitle: string; passageText: string }

// ── Timer ─────────────────────────────────────────────────────────────────────

function Timer({ totalSeconds, onExpire }: { totalSeconds: number; onExpire: () => void }) {
  const [seconds, setSeconds] = useState(totalSeconds)

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { clearInterval(interval); onExpire(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onExpire])

  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const urgent = seconds < 300

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
      background: urgent ? 'color-mix(in srgb, var(--danger) 12%, transparent)' : 'var(--bg-soft)',
      color: urgent ? 'var(--danger)' : 'var(--text-2)',
    }}>
      <Clock size={13} strokeWidth={2} />
      {m}:{String(s).padStart(2, '0')} remaining
    </div>
  )
}

// ── Question Renderer ─────────────────────────────────────────────────────────

function ReadingQuestion({
  question,
  answer,
  onChange,
}: {
  question: QuestionWithSection
  answer: string
  onChange: (v: string) => void
}) {
  const { t } = useLanguage()
  const qText = question.question_text.replace(/^\[.*?\]\s*/, '')

  const selectStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 8, fontSize: 13,
    border: '1px solid var(--border-strong)', background: 'var(--bg-elev)',
    color: 'var(--text)', outline: 'none', cursor: 'pointer',
  }

  if (question.question_type === 'true_false') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <select value={answer} onChange={e => onChange(e.target.value)}
          style={{ ...selectStyle, flexShrink: 0 }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        >
          <option value="">{t('reading.select')}</option>
          <option>TRUE</option><option>FALSE</option><option>NOT GIVEN</option>
        </select>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55, margin: 0 }}>{qText}</p>
      </div>
    )
  }

  if (question.question_type === 'multiple_choice') {
    const text = question.question_text.replace(/^\[.*?\]\s*/, '')
    const questionPart = text.split(/[A-D]\)/)[0].trim()
    const optionMatches = text.match(/[A-D]\) [\s\S]+?(?=[A-D]\)|$)/g) ?? []
    const letters = ['A', 'B', 'C', 'D']
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>{questionPart}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {optionMatches.map((opt, i) => {
            const sel = answer === letters[i]
            return (
              <button key={i} onClick={() => onChange(letters[i])} style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 14px', borderRadius: 10, fontSize: 14,
                border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                background: sel ? 'var(--accent-soft)' : 'var(--bg-elev)',
                color: sel ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', transition: 'all .15s',
              }}>
                <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginTop: 1, background: sel ? 'var(--accent)' : 'var(--bg-soft)', color: sel ? 'var(--accent-fg)' : 'var(--text-2)' }}>
                  {letters[i]}
                </span>
                <span>{opt.replace(/^[A-D]\)\s*/, '')}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (question.question_type === 'matching') {
    const bracketMatch = question.question_text.match(/^\[(.+?)\]/)
    const allOptions = bracketMatch ? bracketMatch[1].match(/[A-H]=[^ ].*?(?= [A-H]=|\]|$)/g) ?? [] : []
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55, margin: 0 }}>{qText}</p>
        <select value={answer} onChange={e => onChange(e.target.value)} style={selectStyle}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        >
          <option value="">{t('reading.selectDash')}</option>
          {(allOptions.length > 0 ? allOptions.map(o => o.split('=')[0].trim()) : ['A','B','C','D','E','F','G','H']).map(l => {
            const desc = allOptions.find(o => o.startsWith(l + '='))?.replace(l + '=', '').trim() ?? ''
            return <option key={l} value={l}>{desc ? `${l} — ${desc}` : l}</option>
          })}
        </select>
      </div>
    )
  }

  // fill_blank
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {question.image_url && (
        <img src={question.image_url} alt="Question diagram"
          style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)' }} />
      )}
      <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55, margin: 0 }}>{qText}</p>
      <input type="text" value={answer} onChange={e => onChange(e.target.value)}
        placeholder={t('reading.typeAnswer')}
        style={{ padding: '9px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', color: 'var(--text)', outline: 'none' }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      />
    </div>
  )
}

// ── Passage Renderer ──────────────────────────────────────────────────────────

function PassageText({ text }: { text: string }) {
  const normalized = text.replace(/\\n/g, '\n')
  const hasParagraphs = /\n[A-H]\s{1,3}[A-Z]/.test(normalized) || /^[A-H]\s{1,3}[A-Z]/m.test(normalized)
  const lines = normalized.split('\n').filter(Boolean)

  return (
    <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim()

        if (i === 0 || i === 1) {
          return <p key={i} style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, margin: 0 }}>{trimmed}</p>
        }

        if (hasParagraphs) {
          const match = trimmed.match(/^([A-H])\s{1,3}(.+)/)
          if (match) {
            return (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                  {match[1]}
                </span>
                <p style={{ flex: 1, margin: 0 }}>{match[2].trim()}</p>
              </div>
            )
          }
        }

        return <p key={i} style={{ color: 'var(--text-2)', fontStyle: 'italic', margin: 0 }}>{trimmed}</p>
      })}
    </div>
  )
}

// ── Start Screen ──────────────────────────────────────────────────────────────

function StartScreen({ test, onStart }: { test: IeltsTest; onStart: () => void }) {
  const { t } = useLanguage()
  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="card" style={{ padding: 40, textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <BookOpen size={24} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
        </div>
        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '3px 10px', borderRadius: 999, marginBottom: 14 }}>{t('dashboard.reading')}</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{test.title}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28 }}>{t('reading.startSubtitle')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
          {[{ value: '40', label: t('reading.questions') }, { value: '60', label: t('reading.minutesFull') }, { value: '3', label: t('reading.passages') }].map(({ value, label }) => (
            <div key={label} style={{ padding: '12px 8px', background: 'var(--bg-soft)', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        <button onClick={onStart} style={{ width: '100%', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer' }}>
          {t('reading.startTest')}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReadingTestPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams<{ testId: string }>()
  const testId = params.testId

  const [test, setTest] = useState<IeltsTest | null>(null)
  const [sections, setSections] = useState<TestSection[]>([])
  const [questions, setQuestions] = useState<QuestionWithSection[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [started, setStarted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePassage, setActivePassage] = useState(1)
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const startedAtRef = useRef<number | null>(null)
  const [leftWidth, setLeftWidth] = useState(50)
  const isResizing = useRef(false)

  const startResize = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    e.preventDefault()
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newLeft = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(75, Math.max(25, newLeft)))
    }
    const onUp = () => { isResizing.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp, { once: true })
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const testData = await getTestById(testId)
        if (!testData) { setError(t('reading.testNotFound')); return }
        setTest(testData)

        const secs = await getSectionsByTestId(testId)
        setSections(secs)

        const sectionIds = secs.map((s: TestSection) => s.id)
        const rawQ = await getTestQuestions(sectionIds)

        const sectionMap = new Map(secs.map((s: TestSection) => [s.id, s]))
        const enriched: QuestionWithSection[] = rawQ.map((q: Question) => ({
          ...q,
          sectionNumber: sectionMap.get(q.section_id)?.section_number ?? 0,
          sectionTitle: sectionMap.get(q.section_id)?.title ?? '',
          passageText: sectionMap.get(q.section_id)?.instructions ?? '',
        }))
        setQuestions(enriched)
        if (enriched.length > 0) setActiveQuestion(enriched[0].id)
      } catch {
        setError(t('reading.failedToLoad'))
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId])

  async function handleStart() {
    try {
      const { user } = await getUser()
      if (!user) { router.push('/login'); return }
      const id = await createAttempt(user.id, testId)
      if (id) setAttemptId(id)
    } catch { /* no-op */ }
    startedAtRef.current = Date.now()
    setStarted(true)
  }

  const saveAnswer = useCallback(async (questionId: string, value: string) => {
    if (!attemptId) return
    try {
      await saveAnswerService(attemptId, questionId, value)
    } catch { /* silent */ }
  }, [attemptId])

  function setAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    saveAnswer(questionId, value)
  }

  const handleTimeExpire = useCallback(() => { handleSubmit() }, [answers]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    const durationSeconds = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : undefined

    // Grading is server-side: the browser never holds the correct answers and
    // the score can't be forged. We send only the user's answers.
    let score = 0
    let band = 0
    let sections: Record<string, { correct: number; total: number }> = {}
    let finalAttempt = attemptId

    try {
      const res = await fetch('/api/attempts/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, skill: 'reading', answers, attemptId, durationSeconds }),
      })
      if (res.ok) {
        const data = await res.json()
        score = data.score ?? 0
        band = data.band ?? 0
        sections = data.sections ?? {}
        finalAttempt = data.attemptId ?? attemptId
      }
    } catch { /* fall through to results; the attempt is still recoverable */ }

    router.push(`/reading/${testId}/results?score=${score}&band=${band}&sections=${encodeURIComponent(JSON.stringify(sections))}&attempt=${finalAttempt ?? ''}`)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (error || !test) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, gap: 12 }}>
      <div style={{ fontSize: 14, color: 'var(--danger)' }}>{error ?? t('reading.testNotFound')}</div>
      <button onClick={() => router.back()} style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>{t('common.back')}</button>
    </div>
  )

  if (!started) return <StartScreen test={test} onStart={handleStart} />

  const passageQuestions = questions.filter(q => q.sectionNumber === activePassage)
  const currentPassage = sections.find(s => s.section_number === activePassage)
  const passageText = currentPassage?.instructions ?? ''
  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length

  function groupQuestions(qs: QuestionWithSection[]) {
    const groups: { label: string; questions: QuestionWithSection[] }[] = []
    let currentGroup: QuestionWithSection[] = []
    let currentType = ''
    for (const q of qs) {
      if (q.question_type !== currentType) {
        if (currentGroup.length > 0) groups.push({ label: getGroupLabel(currentType, currentGroup), questions: currentGroup })
        currentGroup = [q]
        currentType = q.question_type
      } else {
        currentGroup.push(q)
      }
    }
    if (currentGroup.length > 0) groups.push({ label: getGroupLabel(currentType, currentGroup), questions: currentGroup })
    return groups
  }

  function getGroupLabel(type: string, qs: QuestionWithSection[]) {
    const nums = `${t('reading.questions')} ${qs[0].question_number}${qs.length > 1 ? `-${qs[qs.length-1].question_number}` : ''}`
    if (type === 'true_false') return `${nums} — TRUE / FALSE / NOT GIVEN`
    if (type === 'multiple_choice') return `${nums} — ${t('reading.gChoose')}`
    if (type === 'matching') return `${nums} — ${t('reading.gMatch')}`
    if (type === 'fill_blank') return `${nums} — ${t('reading.gComplete')}`
    return nums
  }

  const questionGroups = groupQuestions(passageQuestions)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* IELTS dark header */}
      <div style={{ background: '#2b2b2b', color: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 700 }}>
          <span style={{ background: '#ffcb05', color: '#000', padding: '3px 8px', borderRadius: 2, fontSize: 11 }}>IELTS</span>
          ielts.camp · {t('reading.practiceTag')}
          <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>{test?.title ?? ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 11, opacity: 0.7 }}>{answeredCount}/{totalQuestions} {t('reading.answered')}</span>
          <Timer totalSeconds={3600} onExpire={handleTimeExpire} />
          <button onClick={handleSubmit} disabled={submitting}
            style={{ padding: '5px 14px', background: '#0066b3', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 2, border: 'none', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? t('reading.submitting') : t('reading.reviewSubmit')}
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }} ref={containerRef}>
        {/* Passage (left) */}
        <div style={{ width: `${leftWidth}%`, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg-elev)', borderRight: '2px solid var(--border)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
              {t('reading.readingPassage')} {activePassage}
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{currentPassage?.title}</h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
            <PassageText text={passageText} />
          </div>
        </div>

        {/* Drag divider */}
        <div onMouseDown={startResize} style={{ width: 6, background: 'var(--border)', cursor: 'col-resize', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 3, height: 40, borderRadius: 999, background: 'var(--border-strong)' }}/>
        </div>

        {/* Questions (right) */}
        <div style={{ width: `${100 - leftWidth}%`, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg-elev)' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {questionGroups.map((group, gi) => (
              <div key={gi}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {group.questions.map(q => (
                    <div key={q.id}
                      onClick={() => setActiveQuestion(q.id)}
                      style={{
                        padding: '14px 16px', borderRadius: 10, border: `1px solid ${activeQuestion === q.id ? 'var(--accent)' : 'transparent'}`,
                        background: activeQuestion === q.id ? 'var(--accent-soft)' : 'transparent',
                        cursor: 'pointer', transition: 'all .15s',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                          background: answers[q.id] ? 'var(--accent)' : 'var(--bg-soft)',
                          color: answers[q.id] ? 'var(--accent-fg)' : 'var(--text-3)',
                        }}>
                          {q.question_number}
                        </span>
                      </div>
                      <ReadingQuestion question={q} answer={answers[q.id] ?? ''} onChange={v => setAnswer(q.id, v)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Passage navigation bottom bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <button onClick={() => setActivePassage(p => Math.max(1, p - 1))} disabled={activePassage === 1}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', opacity: activePassage === 1 ? 0.3 : 1 }}>
          <ChevronLeft size={14} strokeWidth={2} /> {t('reading.previous')}
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          {sections.map(sec => {
            const secQs = questions.filter(q => q.sectionNumber === sec.section_number)
            const answered = secQs.filter(q => answers[q.id]).length
            const active = activePassage === sec.section_number
            return (
              <button key={sec.id} onClick={() => setActivePassage(sec.section_number)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '7px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: active ? 'var(--accent)' : 'var(--bg-soft)',
                color: active ? 'var(--accent-fg)' : 'var(--text-2)',
                border: 'none', cursor: 'pointer', transition: 'all .15s',
              }}>
                <span>{t('reading.passage')} {sec.section_number}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{answered}/{secQs.length}</span>
              </button>
            )
          })}
        </div>

        <button onClick={() => setActivePassage(p => Math.min(sections.length, p + 1))} disabled={activePassage === sections.length}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', opacity: activePassage === sections.length ? 0.3 : 1 }}>
          {t('reading.next')} <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}