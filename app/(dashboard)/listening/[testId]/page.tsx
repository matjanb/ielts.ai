'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Play, Pause, Send, Volume2, AlertCircle, Loader2, Clock } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { TestTimer } from '@/components/test/TestTimer'
import { createClient } from '@/lib/supabase/client'
import { listeningRawToBand } from '@/lib/utils/bandScore'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'
import type { IeltsTest, TestSection, Question } from '@/lib/types/database'

type QuestionWithSection = Question & { sectionNumber: number; sectionTitle: string }

const SPEEDS = [0.75, 1, 1.25, 1.5]

// ── Audio Player ──────────────────────────────────────────────────────────────

function AudioPlayer({ audioUrl }: { audioUrl: string | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    setPlaying(false)
    setProgress(0)
    setDuration(0)
  }, [audioUrl])

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
    else { el.play().catch(() => {}); setPlaying(true) }
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Number(e.target.value)
  }

  function cycleSpeed() {
    const idx = SPEEDS.indexOf(speed)
    const next = SPEEDS[(idx + 1) % SPEEDS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  function fmt(s: number) {
    if (!isFinite(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  if (!audioUrl) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Volume2 size={13} />
        No audio
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        onClick={togglePlay}
        className="shrink-0 w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-white flex items-center justify-center transition-colors"
      >
        {playing ? <Pause size={13} strokeWidth={2} /> : <Play size={13} strokeWidth={2} />}
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-[10px] text-gray-400 tabular-nums shrink-0 w-8 text-right">{fmt(progress)}</span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          value={progress}
          onChange={seek}
          className="flex-1 h-1 accent-amber-500 cursor-pointer min-w-0"
        />
        <span className="text-[10px] text-gray-400 tabular-nums shrink-0 w-8">{fmt(duration)}</span>
      </div>
      <button
        onClick={cycleSpeed}
        className="shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors tabular-nums"
      >
        {speed}x
      </button>
    </div>
  )
}

// ── Multiple Choice Question ──────────────────────────────────────────────────

function RadioQuestion({
  question,
  answer,
  onChange,
}: {
  question: QuestionWithSection
  answer: string
  onChange: (v: string) => void
}) {
  const options: string[] = Array.isArray(question.options) ? (question.options as string[]) : []

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
        <span className="font-bold text-gray-500 dark:text-gray-400 mr-2">{question.question_number}.</span>
        {question.question_text}
      </p>
      <div className="space-y-2 ml-5">
        {options.map((opt) => {
          const selected = answer === opt
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className="flex items-start gap-3 w-full text-left group"
            >
              <div className={`shrink-0 mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                selected
                  ? 'border-amber-500 bg-amber-500'
                  : 'border-gray-300 dark:border-gray-600 group-hover:border-amber-400'
              }`}>
                {selected && <div className="w-[7px] h-[7px] rounded-full bg-white" />}
              </div>
              <span className={`text-sm leading-relaxed transition-colors ${
                selected
                  ? 'text-amber-900 dark:text-amber-200 font-medium'
                  : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
              }`}>
                {opt}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Fill-in-the-blank Question ────────────────────────────────────────────────

function FillBlankQuestion({
  question,
  answer,
  onChange,
}: {
  question: QuestionWithSection
  answer: string
  onChange: (v: string) => void
}) {
  const text = question.question_text
  const blankIdx = text.indexOf('___')
  const before = blankIdx >= 0 ? text.slice(0, blankIdx) : text
  const after = blankIdx >= 0 ? text.slice(blankIdx + 3) : ''

  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-teal-500/12 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-[10px] font-bold flex items-center justify-center border border-teal-400/25 dark:border-teal-500/30">
        {question.question_number}
      </span>
      <div className="flex-1 text-sm text-gray-800 dark:text-gray-200 leading-7 flex items-baseline flex-wrap gap-x-1">
        {before && <span>{before}</span>}
        <input
          type="text"
          value={answer}
          onChange={e => onChange(e.target.value)}
          className="inline-block w-36 px-2 py-0.5 border-b-2 border-amber-400 dark:border-amber-500/70 bg-transparent focus:outline-none focus:border-amber-600 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 transition-colors text-center"
          placeholder="..."
        />
        {after && <span>{after}</span>}
      </div>
    </div>
  )
}

// ── Form-style detection ──────────────────────────────────────────────────────
// A fill_blank question is "form-style" when it has a colon before the blank
// (label: value pattern) AND does NOT end with sentence punctuation.
// This covers Personal Details Form, Notes Completion tables, etc. — without
// any hardcoded question numbers or section numbers.
function isFormStyle(q: QuestionWithSection): boolean {
  if (q.question_type !== 'fill_blank') return false
  const text = q.question_text.trim()
  const blankIdx = text.indexOf('___')
  if (blankIdx < 0) return false
  const beforeBlank = text.slice(0, blankIdx)
  return beforeBlank.includes(':') && !/[.!?]\s*$/.test(text)
}

// Split a form question_text into { label, prefill, after } for form rendering.
// e.g. "Complete the Personal Details Form. Name: Mary ___"
//   → { label: "Name:", prefill: "Mary", after: "" }
// e.g. "Address: Flat 2, number ___, ___ Road, Canterbury"
//   → { label: "Address:", prefill: "Flat 2, number", after: ", ___ Road, Canterbury" }
function parseFormField(question_text: string) {
  // Strip any "Complete the X. " preamble
  const dotIdx = question_text.indexOf('. ')
  const fieldText = dotIdx >= 0 ? question_text.slice(dotIdx + 2) : question_text

  const colonIdx = fieldText.indexOf(':')
  if (colonIdx < 0) return { label: fieldText, prefill: '', after: '' }

  const label = fieldText.slice(0, colonIdx + 1)
  const rest = fieldText.slice(colonIdx + 1)

  const blankIdx = rest.indexOf('___')
  if (blankIdx < 0) return { label, prefill: rest.trim(), after: '' }

  return {
    label,
    prefill: rest.slice(0, blankIdx).trim(),
    after: rest.slice(blankIdx + 3),
  }
}

// Extract a form title from the first question's text, if it names a form.
// Returns null for small groups or questions without a named form.
function extractFormTitle(questions: QuestionWithSection[]): string | null {
  const firstText = questions[0]?.question_text ?? ''
  const dotIdx = firstText.indexOf('. ')
  if (dotIdx <= 0) return null
  const prefix = firstText.slice(0, dotIdx)
  const m = prefix.match(/complete the (.+)/i)
  return m ? m[1].toUpperCase() : prefix.toUpperCase()
}

// ── Form Card (paper-form style for label-blank groups) ───────────────────────

function FormCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  const title = extractFormTitle(questions)

  return (
    <div className="border-2 border-gray-700 dark:border-gray-400 bg-white dark:bg-gray-950 rounded-sm">
      {title && (
        <div className="px-6 py-3 border-b-2 border-gray-700 dark:border-gray-400 text-center">
          <span className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-gray-200">
            {title}
          </span>
        </div>
      )}
      <div className="px-6 py-5 space-y-4">
        {questions.map(q => {
          const { label, prefill, after } = parseFormField(q.question_text)
          return (
            <div key={q.id} className="flex items-start gap-3 sm:gap-5">
              {/* Label column */}
              <div className="flex items-center gap-1.5 min-w-[140px] sm:min-w-[180px] shrink-0">
                <span className="shrink-0 w-5 h-5 rounded-full bg-teal-500/15 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-[9px] font-bold flex items-center justify-center border border-teal-400/25 dark:border-teal-500/30">
                  {q.question_number}
                </span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug">
                  {label}
                </span>
              </div>
              {/* Value column */}
              <div className="flex-1 flex items-baseline flex-wrap gap-x-1 text-sm text-gray-800 dark:text-gray-200 leading-7">
                {prefill && <span>{prefill}</span>}
                <input
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={e => onAnswer(q.id, e.target.value)}
                  className="w-28 border-b-2 border-gray-700 dark:border-gray-400 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-center transition-colors pb-0.5"
                  placeholder="..."
                />
                {after && <span className="text-gray-600 dark:text-gray-400">{after}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Passage Block (flowing paragraph with inline answer blanks) ───────────────
// Used when questions have passage_text set. Groups with the same passage_group
// render as one continuous paragraph; each {{Q}} becomes a numbered inline input.

function PassageBlock({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <p className="text-sm leading-9 text-gray-800 dark:text-gray-200">
        {questions.map(q => {
          const passageText = q.passage_text ?? ''
          const parts = passageText.split('{{Q}}')
          const before = parts[0] ?? ''
          const after = parts[1] ?? ''
          return (
            <span key={q.id}>
              {before}
              <span className="inline-flex items-baseline gap-0.5 mx-0.5">
                <sup className="text-[9px] font-bold text-teal-600 dark:text-teal-400 leading-none">
                  ({q.question_number})
                </sup>
                <input
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={e => onAnswer(q.id, e.target.value)}
                  className="w-28 px-1 pb-0.5 border-b-2 border-amber-400 dark:border-amber-500/70 bg-transparent focus:outline-none focus:border-amber-600 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 text-center transition-colors"
                  placeholder="..."
                />
              </span>
              {after}
            </span>
          )
        })}
      </p>
    </div>
  )
}

// ── Notepad Card (notes-completion style for inline fill-blank groups) ────────

function NotepadCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 shadow-sm">
      {/* Spiral binding row — repeating holes */}
      <div
        className="h-5 bg-gray-300 dark:bg-gray-700"
        style={{
          backgroundImage:
            'radial-gradient(circle, white 4px, transparent 4px), radial-gradient(circle, #6b7280 5px, transparent 5px)',
          backgroundSize: '22px 20px',
          backgroundPosition: '11px center',
        }}
      />
      {/* Notepad lines */}
      <div
        className="px-5 py-4 space-y-3 bg-[#fffef5] dark:bg-[#1a1a10]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(transparent, transparent 27px, #d1d5db 27px, #d1d5db 28px)',
          backgroundPositionY: '12px',
        }}
      >
        {questions.map(q => {
          const text = q.question_text
          const blankIdx = text.indexOf('___')
          const before = blankIdx >= 0 ? text.slice(0, blankIdx) : text
          const after = blankIdx >= 0 ? text.slice(blankIdx + 3) : ''
          return (
            <div
              key={q.id}
              className="flex items-baseline flex-wrap gap-x-1 text-sm text-gray-800 dark:text-gray-200 leading-7"
            >
              <span className="font-bold text-gray-600 dark:text-gray-400 shrink-0 mr-0.5">
                ({q.question_number})
              </span>
              {before && <span>{before}</span>}
              <input
                type="text"
                value={answers[q.id] ?? ''}
                onChange={e => onAnswer(q.id, e.target.value)}
                className="inline-block w-32 px-1 pb-0.5 border-b-2 border-gray-500 dark:border-gray-400 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-center transition-colors"
                placeholder="..."
              />
              {after && <span>{after}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Multi-Select Block (checkbox list for questions that share identical options) ─

function MultiSelectBlock({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  const maxSelect = questions.length
  const options: string[] = Array.isArray(questions[0]?.options)
    ? (questions[0].options as string[])
    : []

  const selected = questions.map(q => answers[q.id] ?? '').filter(Boolean)
  const selectedCount = selected.length

  // Strip the "(Q11 — first item)" suffix to get the shared instruction text
  const instruction = (questions[0]?.question_text ?? '')
    .replace(/\s*\(Q\d+[^)]*\)\s*$/i, '')
    .trim()

  function handleToggle(opt: string) {
    const current = questions.map(q => answers[q.id] ?? '').filter(Boolean)
    let next: string[]
    if (current.includes(opt)) {
      next = current.filter(s => s !== opt)
    } else {
      if (current.length >= maxSelect) return
      next = [...current, opt]
    }
    // Sort by position in options array so Q11 always gets the alphabetically-first
    // answer — makes scoring correct regardless of selection order
    next.sort((a, b) => options.indexOf(a) - options.indexOf(b))
    questions.forEach((q, i) => onAnswer(q.id, next[i] ?? ''))
  }

  return (
    <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
      {/* Instruction bar */}
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{instruction}</p>
        <span className={`shrink-0 text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
          selectedCount === maxSelect
            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
        }`}>
          {selectedCount}/{maxSelect}
        </span>
      </div>
      {/* Option rows */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {options.map(opt => {
          const isSelected = selected.includes(opt)
          const isDisabled = !isSelected && selectedCount >= maxSelect
          // Parse "A. Description text" format
          const m = opt.match(/^([A-Z])\.\s*(.+)$/)
          const letter = m ? m[1] : ''
          const text = m ? m[2] : opt
          return (
            <button
              key={opt}
              onClick={() => !isDisabled && handleToggle(opt)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 ${
                isSelected
                  ? 'bg-amber-50 dark:bg-amber-500/10'
                  : isDisabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
              }`}
            >
              {/* Checkbox */}
              <div className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-amber-500 border-amber-500'
                  : 'border-gray-400 dark:border-gray-500'
              }`}>
                {isSelected && (
                  <svg viewBox="0 0 10 8" className="w-2.5 h-2">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {/* Letter badge */}
              <span className={`shrink-0 w-5 text-xs font-black text-center ${
                isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {letter}
              </span>
              {/* Description */}
              <span className={`text-sm ${
                isSelected
                  ? 'text-amber-900 dark:text-amber-100 font-medium'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {text}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Helper: group consecutive questions by type so fill-in blocks render together
function groupByType(qs: QuestionWithSection[]) {
  type GroupKind = 'mc' | 'multiselect' | 'form' | 'inline' | 'passage'
  type Group = { kind: GroupKind; items: QuestionWithSection[] }
  const groups: Group[] = []
  for (const q of qs) {
    const kind: GroupKind =
      q.passage_text ? 'passage'
      : q.question_type === 'multiple_choice' ? 'mc'
      : isFormStyle(q) ? 'form'
      : 'inline'
    const last = groups[groups.length - 1]
    // Passage questions only merge if they share the same passage_group number.
    const sameGroup =
      last &&
      last.kind === kind &&
      (kind !== 'passage' ||
        last.items[last.items.length - 1].passage_group === q.passage_group)
    if (sameGroup) {
      last.items.push(q)
    } else {
      groups.push({ kind, items: [q] })
    }
  }
  // Upgrade MC groups to 'multiselect' when all questions share identical options.
  // Sorting is handled in MultiSelectBlock so scoring is order-independent.
  return groups.map(g => {
    if (g.kind !== 'mc' || g.items.length < 2) return g
    const ref = JSON.stringify(g.items[0].options)
    if (g.items.every(q => JSON.stringify(q.options) === ref)) {
      return { kind: 'multiselect' as GroupKind, items: g.items }
    }
    return g
  })
}

// ── Start Screen ──────────────────────────────────────────────────────────────

function StartScreen({
  test,
  sections,
  questionCount,
  starting,
  onStart,
  t,
}: {
  test: IeltsTest
  sections: TestSection[]
  questionCount: number
  starting: boolean
  onStart: () => void
  t: (k: string) => string
}) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800 p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
          <Clock size={24} strokeWidth={1.8} className="text-amber-500" />
        </div>
        <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15 px-3 py-1 rounded-full mb-3">
          Listening
        </span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{test.title}</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 leading-relaxed">
          {t('listening.startSubtitle')}
        </p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { value: String(questionCount), label: t('listening.questions') },
            { value: '30', label: 'min' },
            { value: String(sections.length || 4), label: 'sections' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl py-3">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
        <button
          onClick={onStart}
          disabled={starting}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-white transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {starting && <Loader2 size={15} className="animate-spin" />}
          {starting ? 'Starting…' : t('listening.startTest')}
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
  const testId = params?.testId ?? ''

  const [test, setTest] = useState<IeltsTest | null>(null)
  const [sections, setSections] = useState<TestSection[]>([])
  const [questions, setQuestions] = useState<QuestionWithSection[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const [started, setStarted] = useState(false)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Load test data on mount
  useEffect(() => {
    if (!testId) return
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any

        const { data: testData, error: testErr } = await supabase
          .from('tests').select('*').eq('id', testId).single()
        if (testErr || !testData) {
          setLoadError(`Test not found (${testErr?.message ?? 'no data'})`)
          return
        }
        setTest(testData as IeltsTest)

        const { data: sectionsData, error: secErr } = await supabase
          .from('test_sections').select('*').eq('test_id', testId).order('section_number')
        if (secErr) {
          setLoadError(`Could not load sections: ${secErr.message}`)
          return
        }
        const secs: TestSection[] = sectionsData ?? []
        setSections(secs)

        if (secs.length === 0) {
          setLoadError('No sections found for this test. Please run the seed data.')
          return
        }

        const sectionIds: string[] = secs.map((s: TestSection) => s.id)
        const { data: rawQs, error: qErr } = await supabase
          .from('questions').select('*').in('section_id', sectionIds).order('question_number')
        if (qErr) {
          setLoadError(`Could not load questions: ${qErr.message}`)
          return
        }
        const questionsData = (rawQs ?? []) as Question[]

        if (questionsData.length === 0) {
          setLoadError('No questions found for this test. Please run the seed data.')
          return
        }

        const sectionMap = new Map(secs.map((s: TestSection) => [s.id, s]))
        const enriched: QuestionWithSection[] = questionsData.map(q => ({
          ...q,
          sectionNumber: (sectionMap.get(q.section_id) as TestSection | undefined)?.section_number ?? 0,
          sectionTitle: (sectionMap.get(q.section_id) as TestSection | undefined)?.title ?? '',
        }))
        setQuestions(enriched)
      } catch (e) {
        setLoadError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [testId])

  // Scroll to top of main scroll container when section changes
  useEffect(() => {
    if (!started) return
    const main = document.querySelector('main')
    main?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentSectionIdx, started])

  // Create attempt and start test
  async function handleStart() {
    setStarting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('user_attempts')
          .insert({ user_id: user.id, test_id: testId })
          .select('id')
          .single()
        if (data?.id) setAttemptId(data.id)
      }
    } catch { /* attempt creation is optional */ }
    setStarting(false)
    setStarted(true)
  }

  // Auto-save single answer
  const saveAnswer = useCallback(async (questionId: string, value: string) => {
    if (!attemptId) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      await supabase.from('user_answers').upsert(
        { attempt_id: attemptId, question_id: questionId, user_answer: value },
        { onConflict: 'attempt_id,question_id' }
      )
    } catch { /* silent */ }
  }, [attemptId])

  function setAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    saveAnswer(questionId, value)
  }

  const handleTimeExpire = useCallback(() => { handleSubmit() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    let totalCorrect = 0
    const sectionCorrect: Record<number, { correct: number; total: number }> = {}

    for (const q of questions) {
      const n = q.sectionNumber
      if (!sectionCorrect[n]) sectionCorrect[n] = { correct: 0, total: 0 }
      sectionCorrect[n].total++

      const correct = isAnswerCorrect(answers[q.id] ?? '', q.correct_answer)
      if (correct) { totalCorrect++; sectionCorrect[n].correct++ }

      if (attemptId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const supabase = createClient() as any
          await supabase.from('user_answers').upsert(
            { attempt_id: attemptId, question_id: q.id, user_answer: answers[q.id] ?? null, is_correct: correct },
            { onConflict: 'attempt_id,question_id' }
          )
        } catch { /* silent */ }
      }
    }

    const band = listeningRawToBand(totalCorrect)
    const sectionScores = Object.fromEntries(Object.entries(sectionCorrect))

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

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-amber-500" />
        <span className="ml-2 text-sm text-gray-400">{t('common.loading')}</span>
      </div>
    )
  }

  if (loadError || !test) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-900/60 rounded-3xl border border-red-200 dark:border-red-800/60 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Failed to load test</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 font-mono break-all">
            {loadError ?? 'Test not found'}
          </p>
          <button onClick={() => router.back()} className="text-sm text-indigo-500 hover:underline">
            {t('common.back')}
          </button>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <StartScreen
        test={test}
        sections={sections}
        questionCount={questions.length}
        starting={starting}
        onStart={handleStart}
        t={t}
      />
    )
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-900/60 rounded-3xl border border-amber-200 dark:border-amber-800/40 p-8 text-center">
          <AlertCircle size={20} className="text-amber-500 mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            No questions found. The database migration and seed may not have been applied yet.
          </p>
          <button onClick={() => setStarted(false)} className="text-sm text-amber-500 hover:underline">
            ← Back
          </button>
        </div>
      </div>
    )
  }

  const currentSection = sections[currentSectionIdx] ?? sections[0]
  const sectionQuestions = questions.filter(q => q.sectionNumber === currentSection?.section_number)
  const groups = groupByType(sectionQuestions)
  const answeredCount = Object.values(answers).filter(Boolean).length

  return (
    // Bleed to edges of the dashboard main padding so top/bottom bars span full width
    <div className="-mx-6 -mt-6 -mb-6 lg:-mx-8 lg:-mt-8 lg:-mb-8">

      {/* ── Sticky top bar: audio + timer + submit ── */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-[#08080f]/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 lg:px-6 py-3 flex items-center gap-4">
        <AudioPlayer audioUrl={currentSection?.audio_url ?? null} />
        <div className="shrink-0 flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 tabular-nums">
            <span className="text-gray-600 dark:text-gray-300 font-medium">{answeredCount}</span>
            <span>/</span>
            <span>{questions.length}</span>
          </span>
          <TestTimer totalSeconds={1800} onExpire={handleTimeExpire} />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60 shrink-0"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} strokeWidth={2} />}
            <span className="hidden sm:inline">{submitting ? t('listening.submitting') : t('listening.submitTest')}</span>
          </button>
        </div>
      </div>

      {/* ── Main scrollable content ── */}
      <div className="px-4 sm:px-8 lg:px-12 py-8 pb-24">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Section header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
                Part {currentSection?.section_number}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentSection?.title}
            </h2>
            {currentSection?.instructions && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                {currentSection.instructions}
              </p>
            )}
          </div>

          {/* Questions grouped by kind: mc → radio, form → paper form card, inline → teal-circle fill-blank */}
          {groups.map((group, gi) => {
            const first = group.items[0].question_number
            const last = group.items[group.items.length - 1].question_number
            const rangeLabel = first === last ? `Question ${first}` : `Questions ${first}–${last}`
            return (
              <div key={gi} className="space-y-4">
                {/* Group range header — Cambridge IELTS style */}
                <div>
                  <p className="text-lg font-bold italic text-gray-800 dark:text-gray-200 mb-2">
                    {rangeLabel}
                  </p>
                  <div className="border-t border-gray-300 dark:border-gray-700" />
                </div>

                {group.kind === 'mc' ? (
                  <div className="space-y-8">
                    {group.items.map(q => (
                      <RadioQuestion
                        key={q.id}
                        question={q}
                        answer={answers[q.id] ?? ''}
                        onChange={v => setAnswer(q.id, v)}
                      />
                    ))}
                  </div>
                ) : group.kind === 'multiselect' ? (
                  <MultiSelectBlock
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : group.kind === 'form' ? (
                  <FormCard
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : group.kind === 'passage' ? (
                  <PassageBlock
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : (
                  <NotepadCard
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Fixed bottom section tabs ── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[216px] z-40 bg-white/95 dark:bg-[#08080f]/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800">
        <div className="flex">
          {sections.map((s, i) => {
            const sqs = questions.filter(q => q.sectionNumber === s.section_number)
            const done = sqs.filter(q => answers[q.id]).length
            const allDone = done === sqs.length && sqs.length > 0
            const active = i === currentSectionIdx
            return (
              <button
                key={s.id}
                onClick={() => setCurrentSectionIdx(i)}
                className={`flex-1 flex flex-col items-center py-3 px-2 border-t-2 transition-all duration-150 ${
                  active
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-500/8'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/4'
                }`}
              >
                <span className={`text-xs font-bold ${
                  active ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  Part {s.section_number}
                </span>
                <span className={`text-[10px] mt-0.5 tabular-nums ${
                  allDone
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : active
                    ? 'text-amber-500/70'
                    : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {done}/{sqs.length}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
