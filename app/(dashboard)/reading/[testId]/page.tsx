'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Send, Clock, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import type { IeltsTest, TestSection, Question } from '@/lib/types/database'

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
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold tabular-nums ${
      urgent ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }`}>
      <Clock size={14} strokeWidth={2} />
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
  const qText = question.question_text.replace(/^\[.*?\]\s*/, '')

  if (question.question_type === 'true_false') {
    return (
      <div className="flex items-start gap-3">
        <select
          value={answer}
          onChange={e => onChange(e.target.value)}
          className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
        >
          <option value="">Select</option>
          <option value="YES">YES</option>
          <option value="NO">NO</option>
          <option value="NOT GIVEN">NOT GIVEN</option>
        </select>
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{qText}</p>
      </div>
    )
  }

  if (question.question_type === 'multiple_choice') {
    const text = question.question_text.replace(/^\[.*?\]\s*/, '')
    const questionPart = text.split(/[A-D]\)/)[0].trim()
    const optionMatches = text.match(/[A-D]\) [\s\S]+?(?=[A-D]\)|$)/g) ?? []
    const letters = ['A', 'B', 'C', 'D']
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">{questionPart}</p>
        <div className="space-y-2">
          {optionMatches.map((opt, i) => (
            <button
              key={i}
              onClick={() => onChange(letters[i])}
              className={`w-full text-left flex items-start gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                answer === letters[i]
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-200'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-300'
              }`}
            >
              <span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                answer === letters[i] ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>{letters[i]}</span>
              <span>{opt.replace(/^[A-D]\)\s*/, '')}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (question.question_type === 'matching') {
    const bracketMatch = question.question_text.match(/^\[(.+?)\]/)
    const allOptions = bracketMatch ? bracketMatch[1].match(/[A-H]=[^ ].*?(?= [A-H]=|\]|$)/g) ?? [] : []
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{qText}</p>
        <select
          value={answer}
          onChange={e => onChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
        >
          <option value="">— Select —</option>
          {['A','B','C','D','E','F','G','H'].map(l => {
            const desc = allOptions.find(o => o.startsWith(l + '='))?.replace(l + '=', '').trim() ?? ''
            return <option key={l} value={l}>{desc ? `${l} — ${desc}` : l}</option>
          })}
        </select>
      </div>
    )
  }

  // fill_blank
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{qText}</p>
      <input
        type="text"
        value={answer}
        onChange={e => onChange(e.target.value)}
        placeholder="Type your answer..."
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
      />
    </div>
  )
}

// ── Start Screen ──────────────────────────────────────────────────────────────

function StartScreen({ test, onStart }: { test: IeltsTest; onStart: () => void }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800 p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
          <BookOpen size={24} strokeWidth={1.8} className="text-blue-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{test.title}</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">40 questions · 60 minutes · 3 passages</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[{ value: '40', label: 'Questions' }, { value: '60', label: 'Minutes' }, { value: '3', label: 'Passages' }].map(({ value, label }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl py-3">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
        <button onClick={onStart} className="w-full py-3.5 rounded-2xl font-semibold text-sm bg-blue-500 hover:bg-blue-400 text-white transition-colors">
          Start Test
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any
        const { data: testData } = await supabase.from('tests').select('*').eq('id', testId).single()
        if (!testData) { setError('Test not found'); return }
        setTest(testData)

        const { data: sectionsData } = await supabase
          .from('test_sections').select('*').eq('test_id', testId).order('section_number')
        const secs: TestSection[] = sectionsData ?? []
        setSections(secs)

        const sectionIds = secs.map((s: TestSection) => s.id)
        const { data: rawQ } = await supabase
          .from('questions').select('*').in('section_id', sectionIds).order('question_number')

        const sectionMap = new Map(secs.map((s: TestSection) => [s.id, s]))
        const enriched: QuestionWithSection[] = (rawQ ?? []).map((q: Question) => ({
          ...q,
          sectionNumber: sectionMap.get(q.section_id)?.section_number ?? 0,
          sectionTitle: sectionMap.get(q.section_id)?.title ?? '',
          passageText: sectionMap.get(q.section_id)?.instructions ?? '',
        }))
        setQuestions(enriched)
        if (enriched.length > 0) setActiveQuestion(enriched[0].id)
      } catch {
        setError('Failed to load test')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [testId])

  async function handleStart() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('user_attempts').insert({ user_id: user.id, test_id: testId }).select('id').single()
      if (data) setAttemptId(data.id)
    } catch { /* no-op */ }
    setStarted(true)
  }

  const saveAnswer = useCallback(async (questionId: string, value: string) => {
    if (!attemptId) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      await supabase.from('user_answers').upsert({ attempt_id: attemptId, question_id: questionId, user_answer: value })
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

    let totalCorrect = 0
    const sectionCorrect: Record<number, { correct: number; total: number }> = {}

    for (const q of questions) {
      const n = q.sectionNumber
      if (!sectionCorrect[n]) sectionCorrect[n] = { correct: 0, total: 0 }
      sectionCorrect[n].total++
      const isCorrect = (answers[q.id] ?? '').trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
      if (isCorrect) { totalCorrect++; sectionCorrect[n].correct++ }
      if (attemptId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const supabase = createClient() as any
          await supabase.from('user_answers').upsert({ attempt_id: attemptId, question_id: q.id, user_answer: answers[q.id] ?? null, is_correct: isCorrect })
        } catch { /* silent */ }
      }
    }

    const rawToBand = (raw: number) => {
      if (raw >= 39) return 9.0; if (raw >= 37) return 8.5; if (raw >= 35) return 8.0
      if (raw >= 32) return 7.5; if (raw >= 30) return 7.0; if (raw >= 26) return 6.5
      if (raw >= 23) return 6.0; if (raw >= 18) return 5.5; if (raw >= 16) return 5.0
      if (raw >= 13) return 4.5; if (raw >= 10) return 4.0; if (raw >= 8) return 3.5
      if (raw >= 6) return 3.0; return 2.5
    }
    const band = rawToBand(totalCorrect)

    if (attemptId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any
        await supabase.from('user_attempts').update({ completed_at: new Date().toISOString(), total_score: totalCorrect, band_score: band, section_scores: sectionCorrect }).eq('id', attemptId)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) await supabase.from('band_score_history').insert({ user_id: user.id, skill: 'reading', score: band, source: 'mock_test', source_id: attemptId })
      } catch { /* silent */ }
    }

    router.push(`/reading/${testId}/results?score=${totalCorrect}&band=${band}&sections=${encodeURIComponent(JSON.stringify(sectionCorrect))}&attempt=${attemptId ?? ''}`)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-sm text-gray-400">{t('common.loading')}</div></div>
  if (error || !test) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="text-sm text-red-500">{error ?? 'Test not found'}</div>
      <button onClick={() => router.back()} className="text-sm text-blue-500 hover:underline">{t('common.back')}</button>
    </div>
  )

  if (!started) return <StartScreen test={test} onStart={handleStart} />

  const passageQuestions = questions.filter(q => q.sectionNumber === activePassage)
  const currentPassage = sections.find(s => s.section_number === activePassage)
  const passageText = currentPassage?.instructions ?? ''
  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length

  // Group questions by type for display
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
    const nums = `Questions ${qs[0].question_number}${qs.length > 1 ? `-${qs[qs.length-1].question_number}` : ''}`
    if (type === 'true_false') return `${nums} — YES / NO / NOT GIVEN`
    if (type === 'multiple_choice') return `${nums} — Choose the correct answer`
    if (type === 'matching') return `${nums} — Match the descriptions`
    if (type === 'fill_blank') return `${nums} — Complete the summary`
    return nums
  }

  const questionGroups = groupQuestions(passageQuestions)

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-2 pb-3 shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <span className="font-medium text-gray-700 dark:text-gray-300">{answeredCount}</span> / {totalQuestions} answered
        </div>
        <Timer totalSeconds={3600} onExpire={handleTimeExpire} />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white transition-colors disabled:opacity-60"
        >
          <Send size={13} strokeWidth={2} />
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>

      {/* Main content */}
      <div className="flex gap-0 flex-1 min-h-0" ref={containerRef}>
        <div style={{ width: `${leftWidth}%` }} className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col min-w-0 mr-1">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-0.5">Reading Passage {activePassage}</div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{currentPassage?.title}</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
              {passageText.replace(/\\n/g, '\n').split('\n\n').filter(Boolean).map((para, i) => (
                <p key={i} className={i === 0 || i === 1 ? 'font-bold text-gray-900 dark:text-white text-base' : ''}>{para.replace(/\\n/g, ' ').trim()}</p>
              ))}
            </div>
          </div>
        </div>

        <div
          className="w-2 cursor-col-resize flex items-center justify-center group shrink-0"
          onMouseDown={startResize}
        >
          <div className="w-1 h-16 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-400 transition-colors" />
        </div>

        <div style={{ width: `${100 - leftWidth}%` }} className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col ml-1">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {questionGroups.map((group, gi) => (
              <div key={gi}>
                <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                  {group.label}
                </div>
                <div className="space-y-5">
                  {group.questions.map(q => (
                    <div key={q.id} className={`rounded-xl p-4 border transition-all ${
                      activeQuestion === q.id
                        ? 'border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5'
                        : 'border-transparent'
                    }`} onClick={() => setActiveQuestion(q.id)}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          answers[q.id]
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>{q.question_number}</span>
                      </div>
                      <ReadingQuestion
                        question={q}
                        answer={answers[q.id] ?? ''}
                        onChange={v => setAnswer(q.id, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom — Passage navigation */}
      <div className="flex items-center justify-between pt-3 shrink-0">
        <button
          onClick={() => setActivePassage(p => Math.max(1, p - 1))}
          disabled={activePassage === 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
        >
          <ChevronLeft size={15} strokeWidth={2} /> Previous Passage
        </button>

        <div className="flex gap-2">
          {sections.map(sec => {
            const secQs = questions.filter(q => q.sectionNumber === sec.section_number)
            const answered = secQs.filter(q => answers[q.id]).length
            return (
              <button
                key={sec.id}
                onClick={() => setActivePassage(sec.section_number)}
                className={`flex flex-col items-center px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activePassage === sec.section_number
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>Part {sec.section_number}</span>
                <span className="text-[10px] opacity-70">{answered} of {secQs.length}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setActivePassage(p => Math.min(sections.length, p + 1))}
          disabled={activePassage === sections.length}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
        >
          Next Passage <ChevronRight size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
