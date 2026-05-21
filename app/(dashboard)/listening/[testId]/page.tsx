'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Play, Pause, ChevronLeft, ChevronRight, Send, Clock, Volume2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { TestTimer } from '@/components/test/TestTimer'
import { createClient } from '@/lib/supabase/client'
import { listeningRawToBand } from '@/lib/utils/bandScore'
import type { IeltsTest, TestSection, Question } from '@/lib/types/database'

type QuestionWithSection = Question & { sectionNumber: number; sectionTitle: string }

const SPEEDS = [0.75, 1, 1.25, 1.5]

// ── Audio Player ──────────────────────────────────────────────────────────────

function AudioPlayer({ audioUrl, t }: { audioUrl: string | null; t: (k: string) => string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const speedIdx = SPEEDS.indexOf(speed)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => setProgress(el.currentTime)
    const onDur = () => setDuration(el.duration)
    const onEnd = () => setPlaying(false)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onDur)
    el.addEventListener('ended', onEnd)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onDur)
      el.removeEventListener('ended', onEnd)
    }
  }, [audioUrl])

  function togglePlay() {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); setPlaying(false) }
    else { el.play(); setPlaying(true) }
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Number(e.target.value)
  }

  function cycleSpeed() {
    const next = SPEEDS[(speedIdx + 1) % SPEEDS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  if (!audioUrl) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800/60 text-sm text-gray-400">
        <Volume2 size={14} />
        {t('listening.noAudio')}
      </div>
    )
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-500/8 border border-amber-200/60 dark:border-amber-500/20 rounded-xl p-4">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-white flex items-center justify-center shrink-0 transition-colors"
        >
          {playing ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
        </button>
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={seek}
            className="w-full h-1.5 accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-amber-600/70 dark:text-amber-400/60 tabular-nums">
            <span>{fmt(progress)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
        <button
          onClick={cycleSpeed}
          className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15 px-2 py-1 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-500/25 transition-colors tabular-nums"
        >
          {speed}x
        </button>
      </div>
    </div>
  )
}

// ── Question Renderer ─────────────────────────────────────────────────────────

function ListeningQuestion({
  question,
  answer,
  onChange,
  t,
}: {
  question: QuestionWithSection
  answer: string
  onChange: (v: string) => void
  t: (k: string) => string
}) {
  const options: string[] = Array.isArray(question.options)
    ? (question.options as string[])
    : []

  return (
    <div className="space-y-5">
      <p className="text-base font-medium text-gray-900 dark:text-white leading-relaxed">
        {question.question_text}
      </p>

      {question.question_type === 'multiple_choice' && options.length > 0 && (
        <div className="space-y-2">
          {options.map((opt, i) => {
            const selected = answer === opt
            const letter = String.fromCharCode(65 + i)
            return (
              <button
                key={opt}
                onClick={() => onChange(opt)}
                className={`w-full text-left flex items-start gap-3.5 px-5 py-3.5 rounded-xl border text-sm transition-all duration-150 ${
                  selected
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300'
                    : 'border-gray-200 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300 hover:border-amber-300 dark:hover:border-amber-500/40 hover:bg-white dark:hover:bg-gray-800/60'
                }`}
              >
                <span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5 transition-all ${
                  selected ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {letter}
                </span>
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {question.question_type === 'fill_blank' && (
        <input
          type="text"
          value={answer}
          onChange={e => onChange(e.target.value)}
          placeholder={t('listening.yourAnswer')}
          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/50 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
        />
      )}
    </div>
  )
}

// ── Start Screen ──────────────────────────────────────────────────────────────

function StartScreen({
  test,
  sections,
  onStart,
  t,
}: {
  test: IeltsTest
  sections: TestSection[]
  onStart: () => void
  t: (k: string) => string
}) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800 p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
          <Clock size={24} strokeWidth={1.8} className="text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{test.title}</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 leading-relaxed">
          {t('listening.startSubtitle')}
        </p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { value: '40', label: t('listening.questions') },
            { value: '30', label: 'min' },
            { value: String(sections.length), label: 'sections' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl py-3">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
        <button
          onClick={onStart}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-white transition-colors"
        >
          {t('listening.startTest')}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ListeningTestPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams<{ testId: string }>()
  const testId = params.testId

  const [test, setTest] = useState<IeltsTest | null>(null)
  const [sections, setSections] = useState<TestSection[]>([])
  const [questions, setQuestions] = useState<QuestionWithSection[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)
  const [started, setStarted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load test data
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

        const sectionIds = secs.map(s => s.id)
        const { data: rawQuestionsData } = await supabase
          .from('questions')
          .select('*')
          .in('section_id', sectionIds)
          .order('question_number')
        const questionsData = rawQuestionsData as Question[] | null

        const sectionMap = new Map(secs.map(s => [s.id, s]))
        const enriched: QuestionWithSection[] = (questionsData ?? []).map(q => ({
          ...q,
          sectionNumber: sectionMap.get(q.section_id)?.section_number ?? 0,
          sectionTitle: sectionMap.get(q.section_id)?.title ?? '',
        }))
        setQuestions(enriched)
      } catch {
        setError('Failed to load test')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [testId])

  // Create attempt when test starts
  async function handleStart() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('user_attempts')
        .insert({ user_id: user.id, test_id: testId })
        .select('id')
        .single()

      if (data) setAttemptId(data.id)
    } catch { /* no-op: attempt id is optional for auto-save */ }
    setStarted(true)
  }

  // Auto-save single answer
  const saveAnswer = useCallback(async (questionId: string, value: string) => {
    if (!attemptId) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      await supabase.from('user_answers').upsert({
        attempt_id: attemptId,
        question_id: questionId,
        user_answer: value,
      })
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

      const userAns = (answers[q.id] ?? '').trim().toLowerCase()
      const correctAns = q.correct_answer.trim().toLowerCase()
      const isCorrect = userAns === correctAns
      if (isCorrect) { totalCorrect++; sectionCorrect[n].correct++ }

      if (attemptId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const supabase = createClient() as any
          await supabase.from('user_answers').upsert({
            attempt_id: attemptId,
            question_id: q.id,
            user_answer: answers[q.id] ?? null,
            is_correct: isCorrect,
          })
        } catch { /* silent */ }
      }
    }

    const band = listeningRawToBand(totalCorrect)
    const sectionScores = Object.fromEntries(
      Object.entries(sectionCorrect).map(([k, v]) => [k, v])
    )

    if (attemptId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any
        await supabase.from('user_attempts').update({
          completed_at: new Date().toISOString(),
          total_score: totalCorrect,
          band_score: band,
          section_scores: sectionScores,
        }).eq('id', attemptId)

        // Also record in band_score_history
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('band_score_history').insert({
            user_id: user.id,
            skill: 'listening',
            score: band,
            source: 'mock_test',
            source_id: attemptId,
          })
        }
      } catch { /* silent */ }
    }

    const sectionParam = encodeURIComponent(JSON.stringify(sectionScores))
    router.push(
      `/listening/${testId}/results?score=${totalCorrect}&band=${band}&sections=${sectionParam}&attempt=${attemptId ?? ''}`
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-400">{t('common.loading')}</div>
      </div>
    )
  }

  if (error || !test) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-sm text-red-500">{error ?? 'Test not found'}</div>
        <button onClick={() => router.back()} className="text-sm text-indigo-500 hover:underline">
          {t('common.back')}
        </button>
      </div>
    )
  }

  if (!started) {
    return <StartScreen test={test} sections={sections} onStart={handleStart} t={t} />
  }

  const question = questions[current]
  if (!question) return null

  const currentSection = sections.find(s => s.section_number === question.sectionNumber)
  const answeredCount = Object.keys(answers).length

  // Group questions by section for the nav
  const sectionGroups = sections.map(sec => ({
    section: sec,
    questions: questions.filter(q => q.sectionNumber === sec.section_number),
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
            {t('listening.section')} {question.sectionNumber}
          </span>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            {current + 1} {t('listening.of')} {questions.length}
          </span>
          <span className="text-xs text-gray-300 dark:text-gray-600">
            · {answeredCount} {t('listening.answered')}
          </span>
        </div>
        <TestTimer totalSeconds={1800} onExpire={handleTimeExpire} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Question navigation */}
        <div className="lg:col-span-1 space-y-3">
          {sectionGroups.map(({ section, questions: qs }) => (
            <div key={section.id} className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-2 px-1">
                {t('listening.section')} {section.section_number}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {qs.map((q, i) => {
                  const globalIdx = questions.findIndex(gq => gq.id === q.id)
                  const answered = Boolean(answers[q.id])
                  const isCurrent = current === globalIdx
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrent(globalIdx)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        isCurrent
                          ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25'
                          : answered
                          ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {q.question_number}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-1.5">
            {[
              { color: 'bg-amber-500', label: 'Current' },
              { color: 'bg-emerald-100 dark:bg-emerald-500/15', label: 'Answered' },
              { color: 'bg-gray-100 dark:bg-gray-800', label: 'Not answered' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${color}`} />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Audio player for current section */}
          <AudioPlayer audioUrl={currentSection?.audio_url ?? null} t={t} />

          {/* Section info + question */}
          <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-7">
            <div className="mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {question.sectionTitle}
              </p>
            </div>
            <ListeningQuestion
              question={question}
              answer={answers[question.id] ?? ''}
              onChange={v => setAnswer(question.id, v)}
              t={t}
            />
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 disabled:opacity-30 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
        >
          <ChevronLeft size={15} strokeWidth={2} />
          {t('listening.prevQuestion')}
        </button>

        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white transition-colors"
          >
            {t('listening.nextQuestion')}
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60"
          >
            <Send size={13} strokeWidth={2} />
            {submitting ? t('listening.submitting') : t('listening.submitTest')}
          </button>
        )}
      </div>
    </div>
  )
}
