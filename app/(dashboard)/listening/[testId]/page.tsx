'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Play, Pause, Send, Volume2, AlertCircle, Loader2, Clock } from 'lucide-react'
import Image from 'next/image'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { TestTimer } from '@/components/test/TestTimer'
import { createClient } from '@/lib/supabase/client'
import { listeningRawToBand } from '@/lib/utils/bandScore'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'
import type { IeltsTest, TestSection, Question } from '@/lib/types/database'

type QuestionWithSection = Question & { sectionNumber: number; sectionTitle: string }

const SPEEDS = [0.75, 1, 1.25, 1.5]

// ── Audio Player ──────────────────────────────────────────────────────────────

function AudioPlayer({
  audioUrl,
  autoPlay = false,
}: {
  audioUrl: string | null
  autoPlay?: boolean
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false)

  // Reset state when audio source changes
  useEffect(() => {
    setPlaying(false)
    setProgress(0)
    setDuration(0)
    setAutoPlayBlocked(false)
  }, [audioUrl])

  // Wire up audio element events
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

  // Attempt auto-play when audio changes (if autoPlay is enabled)
  useEffect(() => {
    if (!autoPlay || !audioUrl) return
    const el = audioRef.current
    if (!el) return
    el.play()
      .then(() => { setPlaying(true); setAutoPlayBlocked(false) })
      .catch(() => { setPlaying(false); setAutoPlayBlocked(true) })
  }, [audioUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  function togglePlay() {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      el.play()
        .then(() => { setPlaying(true); setAutoPlayBlocked(false) })
        .catch(() => {})
    }
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
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {autoPlayBlocked ? (
        /* Autoplay was blocked — show a prominent CTA in place of the normal play button */
        <button
          onClick={togglePlay}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold animate-pulse transition-colors"
        >
          <Play size={12} strokeWidth={2.5} />
          Click to start audio
        </button>
      ) : (
        <button
          onClick={togglePlay}
          className="shrink-0 w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-white flex items-center justify-center transition-colors"
        >
          {playing ? <Pause size={13} strokeWidth={2} /> : <Play size={13} strokeWidth={2} />}
        </button>
      )}

      {!autoPlayBlocked && (
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
      )}

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

// Parse image_url: JSON array string → per-option images; plain URL → single image above options.
function parseImageUrl(raw: string | null): { singleImage: string | null; optionImages: string[] } {
  if (!raw) return { singleImage: null, optionImages: [] }
  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return { singleImage: null, optionImages: arr as string[] }
    } catch { /* fall through */ }
  }
  return { singleImage: raw, optionImages: [] }
}

function RadioQuestion({
  question,
  answer,
  onChange,
}: {
  question: QuestionWithSection
  answer: string
  onChange: (v: string) => void
}) {
  const options = parseMcOptions(question)
  const { singleImage, optionImages } = parseImageUrl(question.image_url)

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
        <span className="font-bold text-gray-500 dark:text-gray-400 mr-2">{question.question_number}.</span>
        {question.question_text}
      </p>

      {singleImage && (
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <Image
            src={singleImage}
            alt="Question image"
            width={800}
            height={200}
            className="w-full h-auto object-contain"
            unoptimized
          />
        </div>
      )}

      {optionImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {options.map((opt, idx) => {
            const selected = answer === opt.value
            const imgUrl = optionImages[idx] ?? null
            return (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`flex flex-col rounded-xl overflow-hidden border-2 transition-all duration-150 text-left ${
                  selected
                    ? 'border-amber-500 shadow-lg shadow-amber-100/50 dark:shadow-amber-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600'
                }`}
              >
                <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                  {imgUrl && (
                    <Image
                      src={imgUrl}
                      alt={`Option ${opt.letter}`}
                      fill
                      className="object-cover"
                    />
                  )}
                  {selected && <div className="absolute inset-0 bg-amber-500/10" />}
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 ${
                  selected ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-white dark:bg-gray-900/60'
                }`}>
                  <div className={`shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
                    selected ? 'border-amber-500 bg-amber-500' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selected && <div className="w-[7px] h-[7px] rounded-full bg-white" />}
                  </div>
                  <span className={`text-sm font-bold ${
                    selected ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {opt.letter}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : singleImage ? (
        // Image strip question — show only letter buttons, the image carries the visual context
        <div className="flex gap-3 mt-1">
          {options.map(opt => {
            const selected = answer === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all duration-150 ${
                  selected
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-600'
                }`}
              >
                <div className={`shrink-0 w-[16px] h-[16px] rounded-full border-2 flex items-center justify-center transition-all ${
                  selected ? 'border-amber-500 bg-amber-500' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selected && <div className="w-[6px] h-[6px] rounded-full bg-white" />}
                </div>
                {opt.letter}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2 ml-5">
          {options.map(opt => {
            const selected = answer === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
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
                  {opt.letter}. {opt.text}
                </span>
              </button>
            )
          })}
        </div>
      )}
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

// Return the options field as a plain object when it is an object (not array).
// Returns null for array options or missing options.
function getOptionsObj(q: QuestionWithSection): Record<string, unknown> | null {
  if (!q.options || Array.isArray(q.options)) return null
  if (typeof q.options === 'object') return q.options as Record<string, unknown>
  return null
}

// Normalise MC options to a uniform {letter, text, value} shape.
// Array format ("A. text"): value = full string (legacy scoring).
// Object format ({A: "text"}): value = letter only (new scoring).
function parseMcOptions(q: QuestionWithSection): Array<{ letter: string; text: string; value: string }> {
  const opts = q.options
  if (!opts) return []
  if (Array.isArray(opts)) {
    return (opts as string[]).map((opt, i) => {
      const m = opt.match(/^([A-Z])\.\s*(.+)$/)
      return { letter: m ? m[1] : String.fromCharCode(65 + i), text: m ? m[2] : opt, value: opt }
    })
  }
  if (typeof opts === 'object') {
    const obj = opts as Record<string, unknown>
    return ['A', 'B', 'C', 'D', 'E']
      .filter(k => k in obj && typeof obj[k] === 'string')
      .map(k => ({ letter: k, text: obj[k] as string, value: k }))
  }
  return []
}

// Static pre-filled rows for two-column form cards, keyed by person name.
// Each entry inserts a read-only display row after the question with afterQNum.
const FORM_STATIC_ROWS: Record<string, Array<{ label: string; value: string; afterQNum: number }>> = {
  KATE: [
    { label: 'Her first impressions', value: 'Quiet', afterQNum: 1 },
    { label: 'Name of course', value: 'Environmental Studies', afterQNum: 3 },
  ],
  LUKI: [
    { label: 'Comments about the course', value: 'Computer room busy', afterQNum: 9 },
  ],
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

// ── Two-Column Form Card ───────────────────────────────────────────────────────
// Two variants:
//   Person-grouped (Test 2 KATE/LUKI): person header row, static interleaved rows
//   Form-title (Test 3 parking/museum): single title header, optional prefill in right cell

function TwoColFormCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  const hasPersons = questions.some(q => getOptionsObj(q)?.person)

  if (hasPersons) {
    // Person-grouped layout (KATE / LUKI style)
    const personOrder: string[] = []
    const byPerson = new Map<string, QuestionWithSection[]>()
    for (const q of questions) {
      const opts = getOptionsObj(q)
      const person = (opts?.person as string) ?? 'UNKNOWN'
      if (!byPerson.has(person)) { byPerson.set(person, []); personOrder.push(person) }
      byPerson.get(person)!.push(q)
    }

    return (
      <div className="border-2 border-gray-400 dark:border-gray-500 rounded-sm overflow-hidden divide-y-2 divide-gray-300 dark:divide-gray-600">
        {personOrder.map(person => {
          const qs = byPerson.get(person)!
          const staticRows = FORM_STATIC_ROWS[person] ?? []
          type Row =
            | { type: 'question'; q: QuestionWithSection }
            | { type: 'static'; label: string; value: string }
          const rows: Row[] = []
          for (const q of qs) {
            rows.push({ type: 'question', q })
            for (const s of staticRows.filter(r => r.afterQNum === q.question_number))
              rows.push({ type: 'static', label: s.label, value: s.value })
          }
          return (
            <div key={person}>
              <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
                <span className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-gray-200">
                  {person}
                </span>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((row, i) =>
                  row.type === 'static' ? (
                    <div key={`s-${i}`} className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                      <div className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400">{row.label}</div>
                      <div className="px-4 py-2.5 text-sm italic text-gray-500 dark:text-gray-400">{row.value}</div>
                    </div>
                  ) : (
                    <div key={row.q.id} className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                      <div className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                        {(getOptionsObj(row.q)?.label as string) ?? row.q.question_text}
                      </div>
                      <div className="px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
                        <sup className="text-[10px] font-bold text-teal-600 dark:text-teal-400 shrink-0">
                          ({row.q.question_number})
                        </sup>
                        {(getOptionsObj(row.q)?.prefill as string | undefined) && (
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {getOptionsObj(row.q)?.prefill as string}
                          </span>
                        )}
                        <input
                          type="text"
                          value={answers[row.q.id] ?? ''}
                          onChange={e => onAnswer(row.q.id, e.target.value)}
                          className="flex-1 min-w-0 border-b-2 border-gray-400 dark:border-gray-500 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 text-center transition-colors pb-0.5"
                          placeholder="..."
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Form-title layout (parking sticker / museum notes style)
  const firstWithTitle = questions.find(q => getOptionsObj(q)?.form_title)
  const formTitle = firstWithTitle
    ? (getOptionsObj(firstWithTitle)?.form_title as string | undefined)
    : undefined

  return (
    <div className="border-2 border-gray-400 dark:border-gray-500 rounded-sm overflow-hidden">
      {formTitle && (
        <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
          <span className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-gray-200">
            {formTitle}
          </span>
        </div>
      )}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {questions.map(q => {
          const opts = (getOptionsObj(q) ?? {}) as Record<string, unknown>
          const label = (opts.label as string) ?? q.question_text
          const prefill = opts.prefill as string | undefined
          return (
            <div key={q.id} className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
              <div className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{label}</div>
              <div className="px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
                <sup className="text-[10px] font-bold text-teal-600 dark:text-teal-400 shrink-0">
                  ({q.question_number})
                </sup>
                {prefill && (
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{prefill}</span>
                )}
                <input
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={e => onAnswer(q.id, e.target.value)}
                  className="flex-1 min-w-0 border-b-2 border-gray-400 dark:border-gray-500 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 text-center transition-colors pb-0.5"
                  placeholder="..."
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Box Card (bordered notes completion card with optional title + side image) ──

function BoxCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  const firstQ = questions[0]
  const opts = getOptionsObj(firstQ)
  const title = opts?.box_title as string | undefined
  const imageUrl = firstQ.image_url
  const imageRight = (opts?.image_position as string) === 'right'

  return (
    <div className="border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-950 rounded-sm">
      {title && (
        <div className="px-5 py-3 border-b-2 border-gray-400 dark:border-gray-500">
          <span className="text-sm font-bold italic text-gray-800 dark:text-gray-200">{title}</span>
        </div>
      )}
      <div className={`flex gap-4 p-5 ${imageRight ? 'flex-row' : 'flex-col'}`}>
        <div className="flex-1 space-y-3">
          {questions.map(q => {
            const qOpts = (getOptionsObj(q) ?? {}) as Record<string, unknown>
            const subtitle = qOpts.box_subtitle as string | undefined
            const raw = q.question_text.replace(/\(\d+\)\s*/g, '')
            const blankIdx = raw.indexOf('___')
            const before = blankIdx >= 0 ? raw.slice(0, blankIdx) : raw
            const after = blankIdx >= 0 ? raw.slice(blankIdx + 3) : ''
            return (
              <div key={q.id}>
                {subtitle && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-3 mb-1 pb-1 border-b border-gray-200 dark:border-gray-700">
                    {subtitle}
                  </p>
                )}
                <div className="flex items-baseline flex-wrap gap-x-1 text-sm text-gray-800 dark:text-gray-200 leading-7">
                  <span className="shrink-0 text-[10px] font-bold text-teal-600 dark:text-teal-400 mr-0.5">
                    ({q.question_number})
                  </span>
                  {before && <span>{before}</span>}
                  <input
                    type="text"
                    value={answers[q.id] ?? ''}
                    onChange={e => onAnswer(q.id, e.target.value)}
                    className="w-28 border-b-2 border-gray-500 dark:border-gray-400 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 text-center transition-colors pb-0.5"
                    placeholder="..."
                  />
                  {after && <span>{after}</span>}
                </div>
              </div>
            )
          })}
        </div>
        {imageUrl && imageRight && (
          <div className="shrink-0 w-36 sm:w-48 self-start">
            <Image
              src={imageUrl}
              alt="Question diagram"
              width={200}
              height={220}
              className="w-full h-auto object-contain"
              unoptimized
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Table Card (Q33-37 style: two-column research data table) ────────────────

function TableCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  const firstOpts = (getOptionsObj(questions[0]) ?? {}) as Record<string, unknown>
  const tableTitle = firstOpts.table_title as string | undefined
  const hasFourColumns = typeof firstOpts.col4 === 'string'

  if (hasFourColumns) {
    type FourColKey = 'col1' | 'col2' | 'col3' | 'col4'
    type FourColCell = {
      staticText?: string
      question?: QuestionWithSection
      prefix?: string
      suffix?: string
    }
    type FourColRow = Record<FourColKey, FourColCell>

    const columns: FourColKey[] = ['col1', 'col2', 'col3', 'col4']
    const headers = columns.map(col => (firstOpts[col] as string | undefined) ?? '')
    const rowMap = new Map<number, FourColRow>()

    const ensureRow = (rowNumber: number) => {
      const existing = rowMap.get(rowNumber)
      if (existing) return existing

      const row: FourColRow = {
        col1: {},
        col2: {},
        col3: {},
        col4: {},
      }
      rowMap.set(rowNumber, row)
      return row
    }

    for (const q of questions) {
      const opts = (getOptionsObj(q) ?? {}) as Record<string, unknown>
      const rowNumber = typeof opts.row === 'number' ? opts.row : 1
      const row = ensureRow(rowNumber)
      const rowStatic = (opts.row_static ?? {}) as Partial<Record<FourColKey, string>>

      for (const col of columns) {
        if (rowStatic[col] !== undefined) row[col].staticText = rowStatic[col]
      }

      const cellKey = typeof opts.cell === 'string' ? opts.cell : undefined
      const colKey = cellKey?.match(/^(col[1-4])/)?.[1] as FourColKey | undefined
      if (colKey) {
        row[colKey].question = q
        row[colKey].prefix = opts.cell_prefix as string | undefined
        row[colKey].suffix = opts.cell_suffix as string | undefined
      }
    }

    const rows = Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, row]) => row)

    function renderInput(q: QuestionWithSection) {
      return (
        <input
          type="text"
          value={answers[q.id] ?? ''}
          onChange={e => onAnswer(q.id, e.target.value)}
          className="mx-1 inline-block w-24 border-b-2 border-gray-500 dark:border-gray-400 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 text-center transition-colors pb-0.5 align-baseline"
          placeholder="..."
        />
      )
    }

    function renderFourColCell(cell: FourColCell) {
      const q = cell.question
      const text = cell.staticText ?? ''

      if (!q) {
        return (
          <div className="px-3 py-3 text-sm leading-7 text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {text}
          </div>
        )
      }

      const blankPattern = new RegExp(`\\(${q.question_number}\\)\\s*___`)
      const match = text.match(blankPattern)

      if (match?.index !== undefined) {
        const before = text.slice(0, match.index)
        const after = text.slice(match.index + match[0].length)
        return (
          <div className="px-3 py-3 text-sm leading-7 text-gray-800 dark:text-gray-200 whitespace-pre-line">
            {before}
            <sup className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
              ({q.question_number})
            </sup>
            {renderInput(q)}
            {after}
          </div>
        )
      }

      return (
        <div className="px-3 py-3 flex items-baseline flex-wrap gap-x-1 text-sm text-gray-800 dark:text-gray-200 leading-7">
          <sup className="text-[10px] font-bold text-teal-600 dark:text-teal-400 shrink-0">
            ({q.question_number})
          </sup>
          {cell.prefix && <span>{cell.prefix}</span>}
          {renderInput(q)}
          {cell.suffix && <span>{cell.suffix}</span>}
        </div>
      )
    }

    return (
      <div className="border-2 border-gray-400 dark:border-gray-500 rounded-sm overflow-x-auto">
        <div className="min-w-[760px]">
          {tableTitle && (
            <div className="px-5 py-3 border-b-2 border-gray-400 dark:border-gray-500 text-center">
              <span className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-gray-200">
                {tableTitle}
              </span>
            </div>
          )}
          <div className="grid grid-cols-4 divide-x divide-gray-400 dark:divide-gray-500 bg-gray-100 dark:bg-gray-800/60 border-b border-gray-400 dark:border-gray-500">
            {headers.map((header, index) => (
              <div
                key={`${header}-${index}`}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400"
              >
                {header}
              </div>
            ))}
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700">
                {columns.map(col => (
                  <div key={col}>{renderFourColCell(row[col])}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const colLeft = firstOpts.col_left as string | undefined
  const colRight = firstOpts.col_right as string | undefined

  type CellContent =
    | { type: 'static'; text: string }
    | { type: 'input'; q: QuestionWithSection; prefix?: string; suffix?: string }
  type TableRow = { left: CellContent; right: CellContent | null }

  const rows: TableRow[] = []

  for (const q of questions) {
    const opts = (getOptionsObj(q) ?? {}) as Record<string, unknown>
    const rowLeft = opts.row_left as string | undefined
    const rowLeftPrefix = opts.row_left_prefix as string | undefined
    const rowRight = opts.row_right as string | undefined
    const rowRightPrefix = opts.row_right_prefix as string | undefined
    const rowRightSuffix = opts.row_right_suffix as string | undefined

    // Right-filler: has right-side content but no left anchor — pairs with the prev row
    const isRightFiller = !rowLeft && !rowLeftPrefix && !rowRight
      && (rowRightPrefix !== undefined || rowRightSuffix !== undefined)

    if (isRightFiller && rows.length > 0 && rows[rows.length - 1].right === null) {
      rows[rows.length - 1].right = {
        type: 'input', q, prefix: rowRightPrefix, suffix: rowRightSuffix,
      }
      continue
    }

    const left: CellContent = rowLeft
      ? { type: 'static', text: rowLeft }
      : rowLeftPrefix !== undefined
        ? { type: 'input', q, prefix: rowLeftPrefix }
        : { type: 'input', q }

    const right: CellContent | null = rowRight
      ? { type: 'static', text: rowRight }
      : (rowLeft && (rowRightPrefix !== undefined || rowRightSuffix !== undefined))
        ? { type: 'input', q, prefix: rowRightPrefix, suffix: rowRightSuffix }
        : null

    rows.push({ left, right })
  }

  function renderCell(cell: CellContent | null) {
    if (!cell) return <div className="px-4 py-3" />
    if (cell.type === 'static') {
      return (
        <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{cell.text}</div>
      )
    }
    const { q, prefix, suffix } = cell
    return (
      <div className="px-4 py-3 flex items-baseline flex-wrap gap-x-1 text-sm text-gray-800 dark:text-gray-200 leading-7">
        <sup className="text-[10px] font-bold text-teal-600 dark:text-teal-400 shrink-0">
          ({q.question_number})
        </sup>
        {prefix && <span>{prefix}</span>}
        <input
          type="text"
          value={answers[q.id] ?? ''}
          onChange={e => onAnswer(q.id, e.target.value)}
          className="w-28 border-b-2 border-gray-500 dark:border-gray-400 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 text-center transition-colors pb-0.5"
          placeholder="..."
        />
        {suffix && <span>{suffix}</span>}
      </div>
    )
  }

  return (
    <div className="border-2 border-gray-400 dark:border-gray-500 rounded-sm overflow-hidden">
      {tableTitle && (
        <div className="px-5 py-3 border-b-2 border-gray-400 dark:border-gray-500 text-center">
          <span className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-gray-200">
            {tableTitle}
          </span>
        </div>
      )}
      {(colLeft || colRight) && (
        <div className="grid grid-cols-2 divide-x divide-gray-400 dark:divide-gray-500 bg-gray-100 dark:bg-gray-800/60 border-b border-gray-400 dark:border-gray-500">
          <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
            {colLeft}
          </div>
          <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
            {colRight}
          </div>
        </div>
      )}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
            {renderCell(row.left)}
            {renderCell(row.right)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Diagram Table Card (Q38-42 style: 3-zone supermarket aisle layout) ─────────

function DiagramTableCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  const firstOpts = (getOptionsObj(questions[0]) ?? {}) as Record<string, unknown>
  const diagramTitle = firstOpts.diagram_title as string | undefined

  const zoneOf = (q: QuestionWithSection) => (getOptionsObj(q)?.zone as string | undefined)
  const entrance = questions.filter(q => zoneOf(q) === 'ENTRANCE')
  const aisle = questions.filter(q => zoneOf(q) === 'AISLE')
  const exit = questions.filter(q => zoneOf(q) === 'EXIT')

  function ZoneQuestions({ qs }: { qs: QuestionWithSection[] }) {
    return (
      <div className="px-3 py-3 space-y-4">
        {qs.map(q => {
          const raw = q.question_text.replace(/^(ENTRANCE|AISLE|EXIT)\s*[—\-]\s*/i, '')
          const blankIdx = raw.indexOf('___')
          const before = blankIdx >= 0 ? raw.slice(0, blankIdx) : raw
          const after = blankIdx >= 0 ? raw.slice(blankIdx + 3) : ''
          return (
            <div key={q.id} className="space-y-1">
              <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400">({q.question_number})</div>
              {before && <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">{before}</p>}
              <input
                type="text"
                value={answers[q.id] ?? ''}
                onChange={e => onAnswer(q.id, e.target.value)}
                className="w-full border-b-2 border-gray-500 dark:border-gray-400 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 text-center transition-colors pb-0.5"
                placeholder="..."
              />
              {after && <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">{after}</p>}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="border-2 border-gray-400 dark:border-gray-500 rounded-sm overflow-hidden">
      {diagramTitle && (
        <div className="px-5 py-3 border-b-2 border-gray-400 dark:border-gray-500 text-center">
          <span className="text-sm font-bold italic text-gray-800 dark:text-gray-200">{diagramTitle}</span>
        </div>
      )}
      <div className="grid grid-cols-3 divide-x divide-gray-300 dark:divide-gray-600">
        <div className="bg-gray-200 dark:bg-gray-800/80">
          <div className="px-3 py-2 border-b border-gray-300 dark:border-gray-600 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">ENTRANCE</span>
          </div>
          <ZoneQuestions qs={entrance} />
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50">
          <div className="px-3 py-2 border-b border-gray-300 dark:border-gray-600 flex items-center justify-between">
            <span className="text-gray-400 dark:text-gray-600 text-sm">←</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">AISLE</span>
            <span className="text-gray-400 dark:text-gray-600 text-sm">→</span>
          </div>
          <ZoneQuestions qs={aisle} />
        </div>
        <div className="bg-white dark:bg-gray-950">
          <div className="px-3 py-2 border-b border-gray-300 dark:border-gray-600 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">EXIT</span>
          </div>
          <ZoneQuestions qs={exit} />
        </div>
      </div>
    </div>
  )
}

// ── Multi-Box Card (Q31-32 style: image left + A-E checkbox options, pick N) ───

function MultiBoxCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  const mainQ = questions[0]
  const pairQ = questions[1] ?? null
  const opts = (getOptionsObj(mainQ) ?? {}) as Record<string, unknown>
  const selectCount = (opts.select_count as number) ?? 2
  const optLetters = ['A', 'B', 'C', 'D', 'E'].filter(k => k in opts && typeof opts[k] === 'string')

  const selected = [answers[mainQ.id] ?? '', pairQ ? (answers[pairQ.id] ?? '') : ''].filter(Boolean)
  const selectedCount = selected.length

  function handleToggle(letter: string) {
    const current = [answers[mainQ.id] ?? '', pairQ ? (answers[pairQ.id] ?? '') : ''].filter(Boolean)
    let next: string[]
    if (current.includes(letter)) {
      next = current.filter(s => s !== letter)
    } else {
      if (current.length >= selectCount) return
      next = [...current, letter]
    }
    next.sort((a, b) => optLetters.indexOf(a) - optLetters.indexOf(b))
    onAnswer(mainQ.id, next[0] ?? '')
    if (pairQ) onAnswer(pairQ.id, next[1] ?? '')
  }

  return (
    <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{mainQ.question_text}</p>
        <span className={`shrink-0 text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
          selectedCount === selectCount
            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400'
        }`}>
          {selectedCount}/{selectCount}
        </span>
      </div>
      <div className="flex gap-4 p-4">
        {mainQ.image_url && (
          <div className="shrink-0 w-32 sm:w-44 self-center">
            <Image
              src={mainQ.image_url}
              alt="Map"
              width={180}
              height={150}
              className="w-full h-auto object-contain"
              unoptimized
            />
          </div>
        )}
        <div className="flex-1 flex flex-col gap-2">
          {optLetters.map(letter => {
            const text = opts[letter] as string
            const isSelected = selected.includes(letter)
            const isDisabled = !isSelected && selectedCount >= selectCount
            return (
              <button
                key={letter}
                onClick={() => !isDisabled && handleToggle(letter)}
                disabled={isDisabled}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 text-left transition-all duration-150 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                    : isDisabled
                    ? 'border-gray-200 dark:border-gray-700 opacity-40 cursor-not-allowed'
                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
              >
                <div className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-400 dark:border-gray-500'
                }`}>
                  {isSelected && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={`text-xs font-black w-4 shrink-0 ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-400 dark:text-gray-500'}`}>
                  {letter}
                </span>
                <span className={`text-sm ${isSelected ? 'text-indigo-900 dark:text-indigo-100 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                  {text}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Diagram Labels Card (image left 60% + numbered label inputs right 40%) ────

function DiagramLabelsCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  const firstOpts = (getOptionsObj(questions[0]) ?? {}) as Record<string, unknown>
  const title = (firstOpts.diagram_title as string | undefined) ?? 'Label the diagram'
  const imageUrl = questions[0].image_url

  return (
    <div className="border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-950 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b-2 border-gray-400 dark:border-gray-500">
        <span className="text-sm font-bold italic text-gray-800 dark:text-gray-200">
          Label the diagram — {title}
        </span>
      </div>
      <div className="flex gap-0">
        {/* Left: diagram image at 60% */}
        <div className="w-[60%] border-r-2 border-gray-400 dark:border-gray-500 p-3 flex items-start justify-center bg-gray-50 dark:bg-gray-900/40">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={500}
              height={600}
              className="w-full h-auto object-contain"
              unoptimized
            />
          ) : (
            <div className="w-full h-40 flex items-center justify-center text-xs text-gray-400">No image</div>
          )}
        </div>
        {/* Right: label inputs at 40% */}
        <div className="w-[40%] p-4 space-y-4">
          {questions.map(q => {
            const opts = (getOptionsObj(q) ?? {}) as Record<string, unknown>
            const hint = opts.hint as string | undefined
            const raw = q.question_text.replace(/\(\d+\)\s*/g, '')
            const blankIdx = raw.indexOf('___')
            const before = blankIdx >= 0 ? raw.slice(0, blankIdx).trim() : raw.trim()
            const after = blankIdx >= 0 ? raw.slice(blankIdx + 3).trim() : ''
            return (
              <div key={q.id} className="space-y-1">
                <div className="flex items-baseline flex-wrap gap-x-1 text-sm text-gray-800 dark:text-gray-200">
                  <span className="shrink-0 text-[10px] font-bold text-teal-600 dark:text-teal-400">
                    ({q.question_number})
                  </span>
                  {before && <span className="font-semibold">{before}</span>}
                  <input
                    type="text"
                    value={answers[q.id] ?? ''}
                    onChange={e => onAnswer(q.id, e.target.value)}
                    className="w-full border-b-2 border-gray-500 dark:border-gray-400 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 text-center transition-colors pb-0.5"
                    placeholder="..."
                  />
                  {after && <span>{after}</span>}
                </div>
                {hint && (
                  <p className="text-[10px] italic text-gray-400 dark:text-gray-500 leading-tight pl-4">{hint}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Diagram Card (Q40-41 style: left box — center image — right box) ──────────

function DiagramCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  const firstOpts = getOptionsObj(questions[0])
  const title = (firstOpts?.box_title as string) ?? ''
  const imageUrl = questions.find(q => q.image_url)?.image_url ?? null

  function parseDiagramBox(q: QuestionWithSection) {
    const text = q.question_text
    const m = text.match(/—\s*(.+?)\s*\(([^)]+)\)\s*:\s*\(\d+\)/)
    if (m) return { level: m[1].trim(), hint: m[2].trim() }
    const clean = text.replace(/\(\d+\)\s*_*/, '').replace(/[:\s]+$/, '').trim()
    return { level: clean, hint: '' }
  }

  function DiagramBox({ q }: { q: QuestionWithSection }) {
    const { level, hint } = parseDiagramBox(q)
    return (
      <div className="flex-1 border-2 border-gray-400 dark:border-gray-500 rounded-lg p-3 text-center space-y-2">
        <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400">({q.question_number})</div>
        <input
          type="text"
          value={answers[q.id] ?? ''}
          onChange={e => onAnswer(q.id, e.target.value)}
          className="w-full border-b-2 border-gray-500 dark:border-gray-400 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 text-center transition-colors pb-0.5"
          placeholder="..."
        />
        {level && <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{level}</p>}
        {hint && <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">({hint})</p>}
      </div>
    )
  }

  return (
    <div className="border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-950 rounded-sm p-4">
      {title && <p className="text-sm font-bold italic text-gray-700 dark:text-gray-300 mb-4">{title}</p>}
      <div className="flex items-center gap-3 sm:gap-5">
        {questions[0] && <DiagramBox q={questions[0]} />}
        {imageUrl && (
          <div className="shrink-0 w-28 sm:w-40">
            <Image src={imageUrl} alt="Diagram" width={160} height={200} className="w-full h-auto object-contain" unoptimized />
          </div>
        )}
        {questions[1] && <DiagramBox q={questions[1]} />}
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

// ── Map Matching Card (Q16-20 style: full-width image + labelled list below) ───

function MapMatchingCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  const firstOpts = (getOptionsObj(questions[0]) ?? {}) as Record<string, unknown>
  const mapTitle = (firstOpts.map_title as string | undefined) ?? 'Label the map'
  const hint = (firstOpts.hint as string | undefined) ?? 'Write the correct letter'
  const imageUrl = questions[0].image_url

  return (
    <div className="border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-950 rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b-2 border-gray-400 dark:border-gray-500 flex items-center justify-between">
        <span className="text-sm font-bold italic text-gray-800 dark:text-gray-200">{mapTitle}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">{hint}</span>
      </div>
      {imageUrl && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <Image
            src={imageUrl}
            alt={mapTitle}
            width={700}
            height={500}
            className="w-full h-auto object-contain"
            unoptimized
          />
        </div>
      )}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {questions.map(q => (
          <div key={q.id} className="flex items-center px-5 py-2.5 gap-3">
            <span className="shrink-0 text-[10px] font-bold text-teal-600 dark:text-teal-400 w-5 text-right">
              {q.question_number}
            </span>
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{q.question_text}</span>
            <input
              type="text"
              value={answers[q.id] ?? ''}
              onChange={e => onAnswer(q.id, e.target.value.toUpperCase().slice(0, 1))}
              className="w-10 border-b-2 border-gray-500 dark:border-gray-400 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 text-center transition-colors pb-0.5 uppercase font-bold"
              placeholder="_"
              maxLength={1}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Matching Pool Card (Q25-30 style: pool box on top + question rows below) ───

function MatchingPoolCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  const firstOpts = (getOptionsObj(questions[0]) ?? {}) as Record<string, unknown>
  const poolTitle = (firstOpts.pool_title as string | undefined) ?? 'Options'
  const pool = (firstOpts.pool as Record<string, string> | undefined) ?? {}
  const poolLetters = Object.keys(pool).sort()

  return (
    <div className="space-y-3">
      {/* Pool options reference box */}
      <div className="border-2 border-gray-400 dark:border-gray-500 rounded-sm overflow-hidden">
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800/60 border-b border-gray-300 dark:border-gray-600">
          <span className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">{poolTitle}</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {poolLetters.map(letter => (
            <div key={letter} className="flex items-start gap-3 px-4 py-2">
              <span className="shrink-0 w-5 text-xs font-black text-gray-500 dark:text-gray-400 pt-0.5">{letter}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{pool[letter]}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Question rows */}
      <div className="border-2 border-gray-400 dark:border-gray-500 rounded-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
        {questions.map(q => (
          <div key={q.id} className="flex items-center px-5 py-2.5 gap-3">
            <span className="shrink-0 text-[10px] font-bold text-teal-600 dark:text-teal-400 w-5 text-right">
              {q.question_number}
            </span>
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{q.question_text}</span>
            <input
              type="text"
              value={answers[q.id] ?? ''}
              onChange={e => onAnswer(q.id, e.target.value.toUpperCase().slice(0, 1))}
              className="w-10 border-b-2 border-gray-500 dark:border-gray-400 bg-transparent focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 text-center transition-colors pb-0.5 uppercase font-bold"
              placeholder="_"
              maxLength={1}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper: group consecutive questions by type so fill-in blocks render together
function groupByType(qs: QuestionWithSection[]) {
  type GroupKind =
    | 'mc' | 'multiselect' | 'form' | 'inline' | 'passage'
    | 'twoColForm' | 'box' | 'diagram' | 'multiBox' | 'table' | 'diagramTable' | 'diagramLabels'
    | 'mapMatching' | 'matchingPool'
  type Group = { kind: GroupKind; items: QuestionWithSection[] }
  const groups: Group[] = []

  for (const q of qs) {
    const opts = getOptionsObj(q)

    // Determine kind for this question
    let kind: GroupKind
    if (opts?.form) {
      kind = 'twoColForm'
    } else if (opts?.map_matching) {
      kind = 'mapMatching'
    } else if (opts?.matching_pool) {
      kind = 'matchingPool'
    } else if (opts?.diagram_labels) {
      kind = 'diagramLabels'
    } else if (opts?.diagram) {
      kind = 'diagram'
    } else if (opts?.box) {
      kind = 'box'
    } else if (opts?.multi) {
      kind = 'multiBox'
    } else if (opts?.table) {
      kind = 'table'
    } else if (opts?.diagram_table) {
      kind = 'diagramTable'
    } else if (q.passage_text) {
      kind = 'passage'
    } else if (q.question_type === 'multiple_choice') {
      kind = 'mc'
    } else if (isFormStyle(q)) {
      kind = 'form'
    } else {
      kind = 'inline'
    }

    const last = groups[groups.length - 1]

    // hidden_label multi questions always absorb into the preceding multiBox group
    if (opts?.hidden_label && opts?.multi && last?.kind === 'multiBox') {
      last.items.push(q)
      continue
    }

    // Passage questions only merge if they share the same passage_group number.
    // Box questions split when a new box_title appears (start of a new bordered box).
    const sameGroup =
      last &&
      last.kind === kind &&
      !(kind === 'box' && opts?.box_title && opts.box_title !== getOptionsObj(last.items[0])?.box_title) &&
      (kind !== 'passage' ||
        last.items[last.items.length - 1].passage_group === q.passage_group)

    if (sameGroup) {
      last.items.push(q)
    } else {
      groups.push({ kind, items: [q] })
    }
  }

  // Upgrade MC groups to 'multiselect' when all questions share identical array options.
  // (Object-options MC groups, like Test 2, are left as 'mc' and rendered by RadioQuestion.)
  return groups.map(g => {
    if (g.kind !== 'mc' || g.items.length < 2) return g
    if (!Array.isArray(g.items[0].options)) return g
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
  const [sectionToast, setSectionToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Scroll to top + show section toast when section changes
  useEffect(() => {
    if (!started) return
    const main = document.querySelector('main')
    main?.scrollTo({ top: 0, behavior: 'smooth' })

    const section = sections[currentSectionIdx]
    if (section) {
      setSectionToast(`Part ${section.section_number} — audio starting`)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setSectionToast(null), 2000)
    }
  }, [currentSectionIdx, started]) // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* ── Section transition toast ── */}
      {sectionToast && (
        <div className="sticky top-0 z-50 flex justify-center pointer-events-none">
          <div className="mt-1 px-4 py-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold shadow-lg animate-fade-in">
            🎧 {sectionToast}
          </div>
        </div>
      )}

      {/* ── Sticky top bar: audio + timer + submit ── */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-[#08080f]/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 lg:px-6 py-3 flex items-center gap-4">
        <AudioPlayer audioUrl={currentSection?.audio_url ?? null} autoPlay={started} />
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
                ) : group.kind === 'twoColForm' ? (
                  <TwoColFormCard
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : group.kind === 'box' ? (
                  <BoxCard
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : group.kind === 'multiBox' ? (
                  <MultiBoxCard
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : group.kind === 'diagram' ? (
                  <DiagramCard
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : group.kind === 'table' ? (
                  <TableCard
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : group.kind === 'diagramTable' ? (
                  <DiagramTableCard
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : group.kind === 'diagramLabels' ? (
                  <DiagramLabelsCard
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : group.kind === 'mapMatching' ? (
                  <MapMatchingCard
                    questions={group.items}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : group.kind === 'matchingPool' ? (
                  <MatchingPoolCard
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
