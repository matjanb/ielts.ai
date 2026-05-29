'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Play, Pause, Send, Volume2, AlertCircle, Loader2, Clock } from 'lucide-react'
import Image from 'next/image'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { TestTimer } from '@/components/test/TestTimer'
import { listeningRawToBand } from '@/lib/utils/bandScore'
import { isAnswerCorrect } from '@/lib/utils/answerChecking'
import type { IeltsTest, TestSection, Question } from '@/lib/types/database'
import { getTestById, getSectionsByTestId, getQuestionsBySectionIds } from '@/lib/services/tests'
import { createAttempt, saveAnswer as saveAnswerService, saveAnswerWithResult, completeAttempt, saveBandScoreHistory, logStudySession } from '@/lib/services/attempts'
import { getUser } from '@/lib/services/auth'

type QuestionWithSection = Question & { sectionNumber: number; sectionTitle: string }

const SPEEDS = [0.75, 1, 1.25, 1.5]

// ── Audio Player ──────────────────────────────────────────────────────────────

function AudioPlayer({
  audioUrl,
  autoPlay = false,
  sectionLabel,
}: {
  audioUrl: string | null
  autoPlay?: boolean
  sectionLabel?: string
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

  const pct = duration > 0 ? (progress / duration) * 100 : 0

  // Official IELTS-style gray audio strip (full width, below the dark header)
  return (
    <div style={{ background: '#dcdcdc', borderBottom: '1px solid #aaa', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      {!audioUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555' }}>
          <Volume2 size={16} stroke="#333" /> No audio for this section
        </div>
      ) : (
        <>
          <button onClick={togglePlay} style={{
            width: 32, height: 32, borderRadius: 16, background: '#fff', border: '1px solid #888',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            animation: autoPlayBlocked ? 'pulse 1.2s ease-in-out infinite' : 'none',
          }}>
            {playing ? <Pause size={14} stroke="#000" /> : <Play size={14} stroke="#000" />}
          </button>
          <Volume2 size={16} stroke="#333" style={{ flexShrink: 0 }} />
          <input
            type="range" min={0} max={duration || 1} value={progress} onChange={seek}
            style={{ flex: 1, minWidth: 0, height: 6, accentColor: '#0066b3', cursor: 'pointer' }}
            aria-label="Audio progress"
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#333', flexShrink: 0 }}>
            {fmt(progress)} / {fmt(duration)}
          </span>
          <button onClick={cycleSpeed} style={{
            fontSize: 12, fontWeight: 700, color: '#0066b3', background: '#fff', border: '1px solid #888',
            padding: '2px 8px', borderRadius: 2, cursor: 'pointer', fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}>
            {speed}x
          </button>
          {sectionLabel && (
            <span style={{ fontSize: 12, color: '#333', padding: '2px 8px', background: '#fff2a8', borderRadius: 2, fontWeight: 600, flexShrink: 0 }}>
              {sectionLabel}
            </span>
          )}
        </>
      )}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }`}</style>
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
      <p className="text-sm font-medium text-[var(--text)] leading-relaxed">
        <span className="font-bold text-[var(--text-2)] mr-2">{question.question_number}.</span>
        {question.question_text}
      </p>

      {singleImage && (
        <div className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-soft)]">
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
                    ? 'border-[var(--accent)] shadow-[var(--shadow)]'
                    : 'border-[var(--border)]'
                }`}
              >
                <div className="relative w-full aspect-[4/3] bg-[var(--bg-soft)]">
                  {imgUrl && (
                    <Image
                      src={imgUrl}
                      alt={`Option ${opt.letter}`}
                      fill
                      className="object-cover"
                    />
                  )}
                  {selected && <div className="absolute inset-0 bg-[var(--accent-soft)]" />}
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 ${
                  selected ? 'bg-[var(--accent-soft)]' : 'bg-[var(--bg-elev)]'
                }`}>
                  <div className={`shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
                    selected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border-strong)]'
                  }`}>
                    {selected && <div className="w-[7px] h-[7px] rounded-full bg-white" />}
                  </div>
                  <span className={`text-sm font-bold ${
                    selected ? 'text-[var(--accent)]' : 'text-[var(--text-2)]'
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
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-2)]'
                }`}
              >
                <div className={`shrink-0 w-[16px] h-[16px] rounded-full border-2 flex items-center justify-center transition-all ${
                  selected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border-strong)]'
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
                    ? 'border-[var(--accent)] bg-[var(--accent)]'
                    : 'border-[var(--border-strong)]'
                }`}>
                  {selected && <div className="w-[7px] h-[7px] rounded-full bg-white" />}
                </div>
                <span className={`text-sm leading-relaxed transition-colors ${
                  selected
                    ? 'text-[var(--accent)] font-medium'
                    : 'text-[var(--text)] group-hover:text-[var(--text)]'
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
  // box_ref questions are part of a structured notes box — never treat as standalone form
  const opts = getOptionsObj(q)
  if (opts?.format === 'box_ref' || opts?.format === 'box' || opts?.box) return false
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
// New format ({choices: [{key, text}]}): value = key.
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
    // New format: {"choices": [{"key": "A", "text": "..."},...]}
    if (Array.isArray(obj.choices)) {
      return (obj.choices as Array<{ key: string; text: string }>).map(c => ({
        letter: c.key, text: c.text, value: c.key,
      }))
    }
    // Legacy format: {"A": "text", "B": "text", ...}
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
    <div className="border-2 border-[var(--border-strong)] bg-[var(--bg-elev)] rounded-sm">
      {title && (
        <div className="px-6 py-3 border-b-2 border-[var(--border-strong)] text-center">
          <span className="text-xs font-black uppercase tracking-widest text-[var(--text)]">
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
                <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[9px] font-bold flex items-center justify-center border border-[var(--border)]">
                  {q.question_number}
                </span>
                <span className="text-sm font-bold text-[var(--text)] leading-snug">
                  {label}
                </span>
              </div>
              {/* Value column */}
              <div className="flex-1 flex items-baseline flex-wrap gap-x-1 text-sm text-[var(--text)] leading-7">
                {prefill && <span>{prefill}</span>}
                <input
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={e => onAnswer(q.id, e.target.value)}
                  className="w-28 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5"
                  placeholder="..."
                />
                {after && <span className="text-[var(--text-2)]">{after}</span>}
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
    <div className="bg-[var(--bg-elev)] rounded-xl border border-[var(--border)] p-5">
      <p className="text-sm leading-9 text-[var(--text)]">
        {questions.map(q => {
          const passageText = q.passage_text ?? ''
          const parts = passageText.split('{{Q}}')
          const before = parts[0] ?? ''
          const after = parts[1] ?? ''
          return (
            <span key={q.id}>
              {before}
              <span className="inline-flex items-baseline gap-0.5 mx-0.5">
                <sup className="text-[9px] font-bold text-[var(--accent)] leading-none">
                  ({q.question_number})
                </sup>
                <input
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={e => onAnswer(q.id, e.target.value)}
                  className="w-28 px-1 pb-0.5 border-b-2 border-[var(--accent)] bg-transparent focus:outline-none focus:border-[var(--accent)] text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors"
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
    <div className="border-2 border-[var(--border-strong)] bg-[var(--bg-elev)] rounded-sm">
      <div className="px-5 py-4 space-y-3">
        {questions.map(q => {
          const text = q.question_text
          const blankIdx = text.indexOf('___')
          const before = blankIdx >= 0 ? text.slice(0, blankIdx) : text
          const after = blankIdx >= 0 ? text.slice(blankIdx + 3) : ''
          return (
            <div
              key={q.id}
              className="flex items-baseline flex-wrap gap-x-1 text-sm text-[var(--text)] leading-7"
            >
              <span className="font-bold text-[var(--text-2)] shrink-0 mr-0.5">
                ({q.question_number})
              </span>
              {before && <span>{before}</span>}
              <input
                type="text"
                value={answers[q.id] ?? ''}
                onChange={e => onAnswer(q.id, e.target.value)}
                className="inline-block w-32 px-1 pb-0.5 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors"
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

// ── Structured Box Card (format:"box" with sections/bullets tree) ────────────
// Renders the full sections definition from the first question's options JSON,
// including static bullets (no question_number), nested sub_bullets, subsection
// headers, and optional two-column layouts.

function StructuredBoxCard({
  questions,
  answers,
  onAnswer,
}: {
  questions: QuestionWithSection[]
  answers: Record<string, string>
  onAnswer: (id: string, v: string) => void
}) {
  type BulletDef = { text: string; question_number?: number; sub_bullets?: BulletDef[] }
  type ColDef = { bullets: BulletDef[] }
  type SubsectionDef = { subtitle: string; bullets: BulletDef[] }
  type SectionDef = {
    title?: string
    bullets?: BulletDef[]
    subsections?: SubsectionDef[]
    columns?: ColDef[]
  }

  const firstOpts = getOptionsObj(questions[0]) as Record<string, unknown> | null
  const title = firstOpts?.box_title as string | undefined
  const sections = firstOpts?.sections as SectionDef[] | undefined
  const questionMap = new Map(questions.map(q => [q.question_number, q]))

  function renderBullet(bullet: BulletDef, depth = 0): React.ReactNode {
    const q = bullet.question_number != null ? questionMap.get(bullet.question_number) : null
    // Strip any leading (N) token the text may include
    const raw = bullet.text.replace(/^\(\d+\)\s*/, '')
    const key = q ? `q${q.question_number}` : `s-${raw.slice(0, 20)}-${depth}`

    let rowContent: React.ReactNode
    if (q) {
      const blankIdx = raw.indexOf('___')
      const before = blankIdx >= 0 ? raw.slice(0, blankIdx) : raw
      const after = blankIdx >= 0 ? raw.slice(blankIdx + 3) : ''
      rowContent = (
        <div className="flex items-baseline flex-wrap gap-x-1 text-sm text-[var(--text)] leading-7">
          <span className="shrink-0 text-[10px] font-bold text-[var(--accent)] mr-0.5">
            ({q.question_number})
          </span>
          {before && <span>{before}</span>}
          <input
            type="text"
            value={answers[q.id] ?? ''}
            onChange={e => onAnswer(q.id, e.target.value)}
            className="w-28 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5"
            placeholder="..."
          />
          {after && <span>{after}</span>}
        </div>
      )
    } else {
      rowContent = (
        <p className="text-sm text-[var(--text)] leading-relaxed">{raw}</p>
      )
    }

    return (
      <div key={key} className={depth > 0 ? 'ml-5 space-y-1' : 'space-y-1'}>
        {rowContent}
        {bullet.sub_bullets?.map((sub, i) => (
          <div key={i}>{renderBullet(sub, depth + 1)}</div>
        ))}
      </div>
    )
  }

  // Fallback when no sections definition (box_ref-only group with missing template)
  if (!sections) {
    return (
      <div className="border-2 border-[var(--border-strong)] bg-[var(--bg-elev)] rounded-sm">
        <div className="px-5 py-4 space-y-3">
          {questions.filter(q => getOptionsObj(q)?.format !== 'box').map(q => {
            const text = q.question_text
            const blankIdx = text.indexOf('___')
            const before = blankIdx >= 0 ? text.slice(0, blankIdx) : text
            const after = blankIdx >= 0 ? text.slice(blankIdx + 3) : ''
            return (
              <div key={q.id} className="flex items-baseline flex-wrap gap-x-1 text-sm text-[var(--text)] leading-7">
                <span className="font-bold text-[var(--text-2)] shrink-0 mr-0.5">({q.question_number})</span>
                {before && <span>{before}</span>}
                <input type="text" value={answers[q.id] ?? ''} onChange={e => onAnswer(q.id, e.target.value)}
                  className="inline-block w-32 px-1 pb-0.5 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors"
                  placeholder="..." />
                {after && <span>{after}</span>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 border-[var(--border-strong)] bg-[var(--bg-elev)] rounded-sm">
      {title && (
        <div className="px-5 py-3 border-b-2 border-[var(--border-strong)]">
          <span className="text-sm font-bold italic text-[var(--text)]">{title}</span>
        </div>
      )}
      <div className="px-5 py-4 space-y-5">
        {sections.map((section, si) => (
          <div key={si} className="space-y-2">
            {section.title && (
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)] mt-2 mb-1 pb-1 border-b border-[var(--border)]">
                {section.title}
              </p>
            )}

            {/* Two-column layout */}
            {section.columns && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                {section.columns.map((col, ci) => (
                  <div key={ci} className="space-y-1">
                    {col.bullets.map((b, bi) => (
                      <div key={bi}>{renderBullet(b)}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Direct bullets on the section (no columns, no subsections) */}
            {section.bullets && !section.columns && (
              <div className="space-y-1">
                {section.bullets.map((b, bi) => (
                  <div key={bi}>{renderBullet(b)}</div>
                ))}
              </div>
            )}

            {/* Subsections */}
            {section.subsections?.map((sub, ssi) => (
              <div key={ssi} className="space-y-1 mt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)] mb-1">
                  {sub.subtitle}
                </p>
                <div className="space-y-1">
                  {sub.bullets.map((b, bi) => (
                    <div key={bi}>{renderBullet(b)}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
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
      <div className="border-2 border-[var(--border-strong)] rounded-sm overflow-hidden divide-y-2 divide-[var(--border)]">
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
              <div className="bg-[var(--bg-soft)] px-4 py-2 border-b border-[var(--border-strong)]">
                <span className="text-xs font-black uppercase tracking-widest text-[var(--text)]">
                  {person}
                </span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {rows.map((row, i) =>
                  row.type === 'static' ? (
                    <div key={`s-${i}`} className="grid grid-cols-2 divide-x divide-[var(--border)]">
                      <div className="px-4 py-2.5 text-sm text-[var(--text-2)]">{row.label}</div>
                      <div className="px-4 py-2.5 text-sm italic text-[var(--text-2)]">{row.value}</div>
                    </div>
                  ) : (
                    <div key={row.q.id} className="grid grid-cols-2 divide-x divide-[var(--border)]">
                      <div className="px-4 py-2.5 text-sm text-[var(--text)]">
                        {(getOptionsObj(row.q)?.label as string) ?? row.q.question_text}
                      </div>
                      <div className="px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
                        <sup className="text-[10px] font-bold text-[var(--accent)] shrink-0">
                          ({row.q.question_number})
                        </sup>
                        {(getOptionsObj(row.q)?.prefill as string | undefined) && (
                          <span className="text-sm font-semibold text-[var(--text)]">
                            {getOptionsObj(row.q)?.prefill as string}
                          </span>
                        )}
                        <input
                          type="text"
                          value={answers[row.q.id] ?? ''}
                          onChange={e => onAnswer(row.q.id, e.target.value)}
                          className="flex-1 min-w-0 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5"
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
    <div className="border-2 border-[var(--border-strong)] rounded-sm overflow-hidden">
      {formTitle && (
        <div className="bg-[var(--bg-soft)] px-4 py-2 border-b border-[var(--border-strong)]">
          <span className="text-xs font-black uppercase tracking-widest text-[var(--text)]">
            {formTitle}
          </span>
        </div>
      )}
      <div className="divide-y divide-[var(--border)]">
        {questions.map(q => {
          const opts = (getOptionsObj(q) ?? {}) as Record<string, unknown>
          const label = (opts.label as string) ?? q.question_text
          const prefill = opts.prefill as string | undefined
          return (
            <div key={q.id} className="grid grid-cols-2 divide-x divide-[var(--border)]">
              <div className="px-4 py-2.5 text-sm text-[var(--text)]">{label}</div>
              <div className="px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
                <sup className="text-[10px] font-bold text-[var(--accent)] shrink-0">
                  ({q.question_number})
                </sup>
                {prefill && (
                  <span className="text-sm font-semibold text-[var(--text)]">{prefill}</span>
                )}
                <input
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={e => onAnswer(q.id, e.target.value)}
                  className="flex-1 min-w-0 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5"
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
    <div className="border-2 border-[var(--border-strong)] bg-[var(--bg-elev)] rounded-sm">
      {title && (
        <div className="px-5 py-3 border-b-2 border-[var(--border-strong)]">
          <span className="text-sm font-bold italic text-[var(--text)]">{title}</span>
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)] mt-3 mb-1 pb-1 border-b border-[var(--border)]">
                    {subtitle}
                  </p>
                )}
                <div className="flex items-baseline flex-wrap gap-x-1 text-sm text-[var(--text)] leading-7">
                  <span className="shrink-0 text-[10px] font-bold text-[var(--accent)] mr-0.5">
                    ({q.question_number})
                  </span>
                  {before && <span>{before}</span>}
                  <input
                    type="text"
                    value={answers[q.id] ?? ''}
                    onChange={e => onAnswer(q.id, e.target.value)}
                    className="w-28 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5"
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

  // ── col_headers + rows array format (e.g. "Village social events") ───────────
  if (Array.isArray(firstOpts.col_headers) && Array.isArray(firstOpts.rows)) {
    const colHeaders = firstOpts.col_headers as string[]
    const tableRows = firstOpts.rows as Record<string, string>[]
    const questionMap = new Map(questions.map(q => [q.question_number, q]))

    function parseCellValue(cellValue: string) {
      const m = cellValue.match(/^(.*?)\((\d+)\)(.*)$/)
      if (m) {
        const q = questionMap.get(parseInt(m[2]))
        if (q) return { prefix: m[1].trim(), question: q, suffix: m[3].trim() }
      }
      return { staticText: cellValue }
    }

    function renderCellContent(cellValue: string) {
      const parsed = parseCellValue(cellValue)
      if ('staticText' in parsed) return <>{parsed.staticText}</>
      const { prefix, question, suffix } = parsed
      return (
        <span className="inline-flex items-baseline flex-wrap gap-x-1">
          {prefix && <span>{prefix}</span>}
          <sup className="text-[10px] font-bold text-[var(--accent)]">({question.question_number})</sup>
          <input
            type="text"
            value={answers[question.id] ?? ''}
            onChange={e => onAnswer(question.id, e.target.value)}
            className="w-24 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5 align-baseline"
            placeholder="..."
          />
          {suffix && <span>{suffix}</span>}
        </span>
      )
    }

    return (
      <div className="border-2 border-[var(--border-strong)] rounded-sm overflow-x-auto">
        {tableTitle && (
          <div className="px-5 py-3 border-b-2 border-[var(--border-strong)] text-center">
            <span className="text-xs font-black uppercase tracking-widest text-[var(--text)]">
              {tableTitle}
            </span>
          </div>
        )}
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr className="bg-[var(--bg-soft)]/60">
              {colHeaders.map((header, i) => (
                <th
                  key={i}
                  className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-2)] text-left border-b border-[var(--border-strong)] ${i < colHeaders.length - 1 ? 'border-r border-[var(--border-strong)]' : ''}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex < tableRows.length - 1 ? 'border-b border-[var(--border)]' : ''}>
                {colHeaders.map((col, colIndex) => (
                  <td
                    key={col}
                    className={`px-3 py-2.5 text-sm text-[var(--text)] ${colIndex < colHeaders.length - 1 ? 'border-r border-[var(--border)]' : ''}`}
                  >
                    {renderCellContent(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const hasFourColumns =
    typeof firstOpts.col4 === 'string' ||
    (typeof firstOpts.col_middle === 'string' && typeof firstOpts.col_middle2 === 'string')

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
    const headers = [
      (firstOpts.col1 as string | undefined) ?? (firstOpts.col_left as string | undefined) ?? '',
      (firstOpts.col2 as string | undefined) ?? (firstOpts.col_middle as string | undefined) ?? '',
      (firstOpts.col3 as string | undefined) ?? (firstOpts.col_middle2 as string | undefined) ?? '',
      (firstOpts.col4 as string | undefined) ?? (firstOpts.col_right as string | undefined) ?? '',
    ]
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

    const addQuestionToCell = (row: FourColRow, col: FourColKey, q: QuestionWithSection, prefix?: string, suffix?: string) => {
      row[col].question = q
      row[col].prefix = prefix
      row[col].suffix = suffix
    }

    if (!firstOpts.col4) {
      const byNumber = new Map(questions.map(q => [q.question_number, q]))
      const firstRow = ensureRow(1)
      const secondRow = ensureRow(2)
      const q6 = byNumber.get(6)
      const q7 = byNumber.get(7)
      const q8 = byNumber.get(8)
      const q9 = byNumber.get(9)
      const q10 = byNumber.get(10)

      if (q6) {
        const opts = (getOptionsObj(q6) ?? {}) as Record<string, unknown>
        addQuestionToCell(
          firstRow,
          'col1',
          q6,
          opts.row_left_prefix as string | undefined,
          opts.row_left_suffix ? ` ${opts.row_left_suffix}` : undefined
        )
        firstRow.col2.staticText = opts.row_middle as string | undefined
        firstRow.col3.staticText = 'Checking portions, etc. are correct\nMaking sure (7) ___ is clean'
        firstRow.col4.staticText = 'Starting salary 8 £ (8) ___ per hour\nStart work at 5.30 a.m.'
      }
      if (q7) addQuestionToCell(firstRow, 'col3', q7)
      if (q8) addQuestionToCell(firstRow, 'col4', q8)

      const q9Opts = q9 ? ((getOptionsObj(q9) ?? {}) as Record<string, unknown>) : {}
      secondRow.col1.staticText = (q9Opts.row_left as string | undefined) ?? 'City Road'
      secondRow.col2.staticText = (q9Opts.row_middle as string | undefined) ?? 'Junior chef'
      secondRow.col3.staticText = 'Supporting senior chefs\nMaintaining stock and organising (9) ___'
      secondRow.col4.staticText = 'Annual salary £23,000\nNo work on a (10) ___ once a month'
      if (q9) addQuestionToCell(secondRow, 'col3', q9)
      if (q10) addQuestionToCell(secondRow, 'col4', q10)
    }

    for (const q of questions) {
      const opts = (getOptionsObj(q) ?? {}) as Record<string, unknown>
      if (!firstOpts.col4 && !opts.cell) continue
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
          className="mx-1 inline-block w-24 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5 align-baseline"
          placeholder="..."
        />
      )
    }

    function renderFourColCell(cell: FourColCell) {
      const q = cell.question
      const text = cell.staticText ?? ''

      if (!q) {
        return (
          <div className="px-3 py-3 text-sm leading-7 text-[var(--text)] whitespace-pre-line">
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
          <div className="px-3 py-3 text-sm leading-7 text-[var(--text)] whitespace-pre-line">
            {before}
            <sup className="text-[10px] font-bold text-[var(--accent)]">
              ({q.question_number})
            </sup>
            {renderInput(q)}
            {after}
          </div>
        )
      }

      return (
        <div className="px-3 py-3 flex items-baseline flex-wrap gap-x-1 text-sm text-[var(--text)] leading-7">
          <sup className="text-[10px] font-bold text-[var(--accent)] shrink-0">
            ({q.question_number})
          </sup>
          {cell.prefix && <span>{cell.prefix}</span>}
          {renderInput(q)}
          {cell.suffix && <span>{cell.suffix}</span>}
        </div>
      )
    }

    return (
      <div className="border-2 border-[var(--border-strong)] rounded-sm overflow-x-auto">
        <div className="min-w-[760px]">
          {tableTitle && (
            <div className="px-5 py-3 border-b-2 border-[var(--border-strong)] text-center">
              <span className="text-xs font-black uppercase tracking-widest text-[var(--text)]">
                {tableTitle}
              </span>
            </div>
          )}
          <div className="grid grid-cols-4 divide-x divide-[var(--border-strong)] bg-[var(--bg-soft)]/60 border-b border-[var(--border-strong)]">
            {headers.map((header, index) => (
              <div
                key={`${header}-${index}`}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-2)]"
              >
                {header}
              </div>
            ))}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-4 divide-x divide-[var(--border)]">
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
        <div className="px-4 py-3 text-sm text-[var(--text)]">{cell.text}</div>
      )
    }
    const { q, prefix, suffix } = cell
    return (
      <div className="px-4 py-3 flex items-baseline flex-wrap gap-x-1 text-sm text-[var(--text)] leading-7">
        <sup className="text-[10px] font-bold text-[var(--accent)] shrink-0">
          ({q.question_number})
        </sup>
        {prefix && <span>{prefix}</span>}
        <input
          type="text"
          value={answers[q.id] ?? ''}
          onChange={e => onAnswer(q.id, e.target.value)}
          className="w-28 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5"
          placeholder="..."
        />
        {suffix && <span>{suffix}</span>}
      </div>
    )
  }

  return (
    <div className="border-2 border-[var(--border-strong)] rounded-sm overflow-hidden">
      {tableTitle && (
        <div className="px-5 py-3 border-b-2 border-[var(--border-strong)] text-center">
          <span className="text-xs font-black uppercase tracking-widest text-[var(--text)]">
            {tableTitle}
          </span>
        </div>
      )}
      {(colLeft || colRight) && (
        <div className="grid grid-cols-2 divide-x divide-[var(--border-strong)] bg-[var(--bg-soft)]/60 border-b border-[var(--border-strong)]">
          <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-2)]">
            {colLeft}
          </div>
          <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-2)]">
            {colRight}
          </div>
        </div>
      )}
      <div className="divide-y divide-[var(--border)]">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 divide-x divide-[var(--border)]">
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
              <div className="text-[10px] font-bold text-[var(--accent)]">({q.question_number})</div>
              {before && <p className="text-xs text-[var(--text-2)] leading-snug">{before}</p>}
              <input
                type="text"
                value={answers[q.id] ?? ''}
                onChange={e => onAnswer(q.id, e.target.value)}
                className="w-full border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5"
                placeholder="..."
              />
              {after && <p className="text-xs text-[var(--text-2)] leading-snug">{after}</p>}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="border-2 border-[var(--border-strong)] rounded-sm overflow-hidden">
      {diagramTitle && (
        <div className="px-5 py-3 border-b-2 border-[var(--border-strong)] text-center">
          <span className="text-sm font-bold italic text-[var(--text)]">{diagramTitle}</span>
        </div>
      )}
      <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
        <div className="bg-[var(--bg-soft)]">
          <div className="px-3 py-2 border-b border-[var(--border-strong)] text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)]">ENTRANCE</span>
          </div>
          <ZoneQuestions qs={entrance} />
        </div>
        <div className="bg-[var(--bg-soft)]/50">
          <div className="px-3 py-2 border-b border-[var(--border-strong)] flex items-center justify-between">
            <span className="text-[var(--text-3)] text-sm">←</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)]">AISLE</span>
            <span className="text-[var(--text-3)] text-sm">→</span>
          </div>
          <ZoneQuestions qs={aisle} />
        </div>
        <div className="bg-[var(--bg-elev)]">
          <div className="px-3 py-2 border-b border-[var(--border-strong)] text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)]">EXIT</span>
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
    <div className="border-2 border-[var(--border-strong)] rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-[var(--bg-soft)] border-b border-[var(--border)] flex items-start justify-between gap-3">
        <p className="text-xs text-[var(--text-2)] leading-relaxed">{mainQ.question_text}</p>
        <span className={`shrink-0 text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
          selectedCount === selectCount
            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'bg-[var(--accent-soft)] text-[var(--accent)]'
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
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : isDisabled
                    ? 'border-[var(--border)] opacity-40 cursor-not-allowed'
                    : 'border-[var(--border)] hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
              >
                <div className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-[var(--border-strong)]'
                }`}>
                  {isSelected && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={`text-xs font-black w-4 shrink-0 ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>
                  {letter}
                </span>
                <span className={`text-sm ${isSelected ? 'text-[var(--accent)] font-medium' : 'text-[var(--text)]'}`}>
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
    <div className="border-2 border-[var(--border-strong)] bg-[var(--bg-elev)] rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b-2 border-[var(--border-strong)]">
        <span className="text-sm font-bold italic text-[var(--text)]">
          Label the diagram — {title}
        </span>
      </div>
      <div className="flex gap-0">
        {/* Left: diagram image at 60% */}
        <div className="w-[60%] border-r-2 border-[var(--border-strong)] p-3 flex items-start justify-center bg-[var(--bg-soft)]/40">
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
            <div className="w-full h-40 flex items-center justify-center text-xs text-[var(--text-3)]">No image</div>
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
                <div className="flex items-baseline flex-wrap gap-x-1 text-sm text-[var(--text)]">
                  <span className="shrink-0 text-[10px] font-bold text-[var(--accent)]">
                    ({q.question_number})
                  </span>
                  {before && <span className="font-semibold">{before}</span>}
                  <input
                    type="text"
                    value={answers[q.id] ?? ''}
                    onChange={e => onAnswer(q.id, e.target.value)}
                    className="w-full border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5"
                    placeholder="..."
                  />
                  {after && <span>{after}</span>}
                </div>
                {hint && (
                  <p className="text-[10px] italic text-[var(--text-3)] leading-tight pl-4">{hint}</p>
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
      <div className="flex-1 border-2 border-[var(--border-strong)] rounded-lg p-3 text-center space-y-2">
        <div className="text-[10px] font-bold text-[var(--accent)]">({q.question_number})</div>
        <input
          type="text"
          value={answers[q.id] ?? ''}
          onChange={e => onAnswer(q.id, e.target.value)}
          className="w-full border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5"
          placeholder="..."
        />
        {level && <p className="text-[10px] text-[var(--text-2)] leading-tight">{level}</p>}
        {hint && <p className="text-[10px] text-[var(--text-3)] leading-tight">({hint})</p>}
      </div>
    )
  }

  return (
    <div className="border-2 border-[var(--border-strong)] bg-[var(--bg-elev)] rounded-sm p-4">
      {title && <p className="text-sm font-bold italic text-[var(--text)] mb-4">{title}</p>}
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
    <div className="border-2 border-[var(--border-strong)] rounded-xl overflow-hidden">
      {/* Instruction bar */}
      <div className="px-4 py-2.5 bg-[var(--bg-soft)] border-b border-[var(--border)] flex items-start justify-between gap-3">
        <p className="text-xs text-[var(--text-2)] leading-relaxed">{instruction}</p>
        <span className={`shrink-0 text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
          selectedCount === maxSelect
            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'bg-[var(--accent-soft)] text-[var(--accent)]'
        }`}>
          {selectedCount}/{maxSelect}
        </span>
      </div>
      {/* Option rows */}
      <div className="divide-y divide-[var(--border)]">
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
                  ? 'bg-[var(--accent-soft)]'
                  : isDisabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-[var(--bg-soft)]'
              }`}
            >
              {/* Checkbox */}
              <div className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-[var(--accent)] border-[var(--accent)]'
                  : 'border-[var(--border-strong)]'
              }`}>
                {isSelected && (
                  <svg viewBox="0 0 10 8" className="w-2.5 h-2">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {/* Letter badge */}
              <span className={`shrink-0 w-5 text-xs font-black text-center ${
                isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'
              }`}>
                {letter}
              </span>
              {/* Description */}
              <span className={`text-sm ${
                isSelected
                  ? 'text-[var(--accent-fg)] font-medium'
                  : 'text-[var(--text)]'
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
  // map_image (new format) takes priority over the legacy image_url column
  const imageUrl = (firstOpts.map_image as string | undefined) ?? questions[0].image_url

  // Build label lookup from items array so satellites with {"map_matching":true}
  // only get the correct label even when their question_text is absent/minimal.
  type ItemDef = { question_number: number; label: string }
  const itemsArr = Array.isArray(firstOpts.items) ? (firstOpts.items as ItemDef[]) : []
  const labelMap = new Map(itemsArr.map(item => [item.question_number, item.label]))
  const getLabel = (q: QuestionWithSection) => labelMap.get(q.question_number) ?? q.question_text

  return (
    <div className="border-2 border-[var(--border-strong)] bg-[var(--bg-elev)] rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b-2 border-[var(--border-strong)] flex items-center justify-between">
        <span className="text-sm font-bold italic text-[var(--text)]">{mapTitle}</span>
        <span className="text-[10px] text-[var(--text-3)] italic">{hint}</span>
      </div>
      {imageUrl && (
        <div className="p-3 border-b border-[var(--border)] bg-[var(--bg-soft)]/40">
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
      <div className="divide-y divide-[var(--border)]">
        {questions.map(q => (
          <div key={q.id} className="flex items-center px-5 py-2.5 gap-3">
            <span className="shrink-0 text-[10px] font-bold text-[var(--accent)] w-5 text-right">
              {q.question_number}
            </span>
            <span className="flex-1 text-sm text-[var(--text)]">{getLabel(q)}</span>
            <input
              type="text"
              value={answers[q.id] ?? ''}
              onChange={e => onAnswer(q.id, e.target.value.toUpperCase().slice(0, 1))}
              className="w-10 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5 uppercase font-bold"
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
  // Support both legacy {A:"text"} and new [{key:"A",text:"..."}] pool formats
  const rawPool = firstOpts.pool
  const pool: Record<string, string> = Array.isArray(rawPool)
    ? Object.fromEntries((rawPool as Array<{ key: string; text: string }>).map(e => [e.key, e.text]))
    : (rawPool as Record<string, string> | undefined) ?? {}
  const poolLetters = Object.keys(pool).sort()

  return (
    <div className="space-y-3">
      {/* Pool options reference box */}
      <div className="border-2 border-[var(--border-strong)] rounded-sm overflow-hidden">
        <div className="px-4 py-2 bg-[var(--bg-soft)]/60 border-b border-[var(--border-strong)]">
          <span className="text-xs font-black uppercase tracking-widest text-[var(--text)]">{poolTitle}</span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {poolLetters.map(letter => (
            <div key={letter} className="flex items-start gap-3 px-4 py-2">
              <span className="shrink-0 w-5 text-xs font-black text-[var(--text-2)] pt-0.5">{letter}</span>
              <span className="text-sm text-[var(--text)] leading-snug">{pool[letter]}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Question rows */}
      <div className="border-2 border-[var(--border-strong)] rounded-sm overflow-hidden divide-y divide-[var(--border)]">
        {questions.map(q => (
          <div key={q.id} className="flex items-center px-5 py-2.5 gap-3">
            <span className="shrink-0 text-[10px] font-bold text-[var(--accent)] w-5 text-right">
              {q.question_number}
            </span>
            <span className="flex-1 text-sm text-[var(--text)]">{q.question_text}</span>
            <input
              type="text"
              value={answers[q.id] ?? ''}
              onChange={e => onAnswer(q.id, e.target.value.toUpperCase().slice(0, 1))}
              className="w-10 border-b-2 border-[var(--border-strong)] bg-transparent focus:outline-none focus:border-[var(--accent)]  text-sm text-[var(--text)] placeholder-[var(--text-3)] text-center transition-colors pb-0.5 uppercase font-bold"
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
    | 'twoColForm' | 'box' | 'structuredBox' | 'diagram' | 'multiBox' | 'table' | 'diagramTable' | 'diagramLabels'
    | 'mapMatching' | 'matchingPool'
  type Group = { kind: GroupKind; items: QuestionWithSection[] }
  const groups: Group[] = []

  for (const q of qs) {
    const opts = getOptionsObj(q)

    // box_ref satellites always absorb into a preceding structuredBox group
    if (opts?.format === 'box_ref' && groups[groups.length - 1]?.kind === 'structuredBox') {
      groups[groups.length - 1].items.push(q)
      continue
    }

    // Determine kind for this question
    let kind: GroupKind
    if (opts?.form) {
      kind = 'twoColForm'
    } else if (opts?.map_matching) {
      kind = 'mapMatching'
    } else if (opts?.matching_pool || opts?.format === 'matching_pool' || opts?.format === 'matching_pool_ref') {
      kind = 'matchingPool'
    } else if (opts?.diagram_labels) {
      kind = 'diagramLabels'
    } else if (opts?.diagram) {
      kind = 'diagram'
    } else if (opts?.format === 'box') {
      kind = 'structuredBox'
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

    // multi_ref questions are second-slot companions for format:"multi" — absorb into preceding group
    if (opts?.format === 'multi_ref' && last) {
      last.items.push(q)
      continue
    }

    // Passage questions only merge if they share the same passage_group number.
    // Box questions split when a new box_title appears (start of a new bordered box).
    // multiBox questions never merge — each primary question starts its own group;
    // hidden_label satellites are absorbed by the earlier check above.
    const sameGroup =
      last &&
      last.kind === kind &&
      kind !== 'multiBox' &&
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

function StartScreen({ test, sections, questionCount, starting, onStart, t }: {
  test: IeltsTest; sections: TestSection[]; questionCount: number; starting: boolean; onStart: () => void; t: (k: string) => string
}) {
  // Kept for legacy fallback — main render now inlines this logic
  return null
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
  const startedAtRef = useRef<number | null>(null)

  // Load test data on mount
  useEffect(() => {
    if (!testId) return
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const testData = await getTestById(testId)
        if (!testData) {
          setLoadError('Test not found')
          return
        }
        setTest(testData)

        const secs = await getSectionsByTestId(testId)
        setSections(secs)

        if (secs.length === 0) {
          setLoadError('No sections found for this test. Please run the seed data.')
          return
        }

        const sectionIds = secs.map((s: TestSection) => s.id)
        const questionsData = await getQuestionsBySectionIds(sectionIds)

        if (questionsData.length === 0) {
          setLoadError('No questions found for this test. Please run the seed data.')
          return
        }

        const sectionMap = new Map(secs.map((s: TestSection) => [s.id, s]))
        const enriched: QuestionWithSection[] = questionsData.map((q: Question) => ({
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
      const { user } = await getUser()
      if (user) {
        const id = await createAttempt(user.id, testId)
        if (id) setAttemptId(id)
      }
    } catch { /* attempt creation is optional */ }
    startedAtRef.current = Date.now()
    setStarting(false)
    setStarted(true)
  }

  // Auto-save single answer
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
          await saveAnswerWithResult(attemptId, q.id, answers[q.id] ?? null, correct)
        } catch { /* silent */ }
      }
    }

    const band = listeningRawToBand(totalCorrect)
    const sectionScores = Object.fromEntries(Object.entries(sectionCorrect))

    if (attemptId) {
      try {
        await completeAttempt(attemptId, totalCorrect, band, sectionScores)
        const { user } = await getUser()
        if (user) {
          await saveBandScoreHistory(user.id, 'listening', band, attemptId)
          const mins = startedAtRef.current ? (Date.now() - startedAtRef.current) / 60000 : 30
          await logStudySession(user.id, 'listening', mins, 'mock_test')
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (loadError || !test) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="card" style={{ padding: 36, textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'color-mix(in srgb, var(--danger) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>Failed to load test</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>{loadError ?? 'Test not found'}</p>
          <button onClick={() => router.back()} style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← {t('common.back')}
          </button>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="card" style={{ padding: 40, textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z"/>
            </svg>
          </div>
          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '3px 10px', borderRadius: 999, marginBottom: 14 }}>
            Listening
          </span>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{test.title}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28, lineHeight: 1.55 }}>{t('listening.startSubtitle')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
            {[
              { value: String(questions.length), label: t('listening.questions') },
              { value: '30', label: 'min' },
              { value: String(sections.length || 4), label: 'sections' },
            ].map(({ value, label }) => (
              <div key={label} style={{ padding: '12px 8px', background: 'var(--bg-soft)', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <button onClick={handleStart} disabled={starting} style={{
            width: '100%', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
            cursor: starting ? 'not-allowed' : 'pointer', opacity: starting ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {starting && <Loader2 size={15} className="animate-spin"/>}
            {starting ? 'Starting…' : t('listening.startTest')}
          </button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <AlertCircle size={20} style={{ color: 'var(--warn)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>
            No questions found. The database migration and seed may not have been applied yet.
          </p>
          <button onClick={() => setStarted(false)} style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
        </div>
      </div>
    )
  }

  const currentSection = sections[currentSectionIdx] ?? sections[0]
  const sectionQuestions = questions.filter(q => q.sectionNumber === currentSection?.section_number)
  const groups = groupByType(sectionQuestions)
  const answeredCount = Object.values(answers).filter(Boolean).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* ── Section transition toast ── */}
      {sectionToast && (
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ marginTop: 6, padding: '5px 16px', borderRadius: 999, background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 12, fontWeight: 600, boxShadow: 'var(--shadow-lg)' }}>
            🎧 {sectionToast}
          </div>
        </div>
      )}

      {/* ── IELTS dark exam header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: '#2b2b2b', color: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 14 }}>
            <span style={{ background: '#ffcb05', color: '#000', padding: '3px 8px', borderRadius: 2, fontSize: 11 }}>IELTS</span>
            ielts.camp · Practice Listening
          </div>
          <span style={{ fontSize: 11, opacity: 0.6 }}>{test?.title ?? ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, opacity: 0.7 }}>{answeredCount}/{questions.length} answered</span>
          <TestTimer totalSeconds={1800} onExpire={handleTimeExpire} />
          <button onClick={handleSubmit} disabled={submitting}
            style={{ padding: '5px 14px', background: '#0066b3', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 2, border: 'none', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Submitting…' : t('listening.submitTest')}
          </button>
        </div>
      </div>

      {/* ── IELTS gray audio strip ── */}
      <AudioPlayer
        audioUrl={currentSection?.audio_url ?? null}
        autoPlay={started}
        sectionLabel={`Section ${currentSection?.section_number ?? 1} of ${sections.length || 4}`}
      />

      {/* ── Main scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px 120px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Section header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '3px 10px', borderRadius: 999 }}>
              Part {currentSection?.section_number}
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>{currentSection?.title}</h2>
          {currentSection?.instructions && (
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{currentSection.instructions}</p>
          )}
        </div>

        {/* Question groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {groups.map((group, gi) => {
            const first = group.items[0].question_number
            const last = group.items[group.items.length - 1].question_number
            const rangeLabel = first === last ? `Question ${first}` : `Questions ${first}–${last}`
            return (
              <div key={gi}>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, fontStyle: 'italic', color: 'var(--text)', margin: '0 0 8px' }}>{rangeLabel}</p>
                  <div style={{ height: 1, background: 'var(--border)' }}/>
                </div>

                {group.kind === 'mc' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {group.items
                      .filter(q => getOptionsObj(q)?.format !== 'multi_ref')
                      .map(q => (
                        <RadioQuestion key={q.id} question={q} answer={answers[q.id] ?? ''} onChange={v => setAnswer(q.id, v)} />
                      ))}
                  </div>
                ) : group.kind === 'multiselect' ? (
                  <MultiSelectBlock questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'form' ? (
                  <FormCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'passage' ? (
                  <PassageBlock questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'twoColForm' ? (
                  <TwoColFormCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'structuredBox' ? (
                  <StructuredBoxCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'box' ? (
                  <BoxCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'multiBox' ? (
                  <MultiBoxCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'diagram' ? (
                  <DiagramCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'table' ? (
                  <TableCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'diagramTable' ? (
                  <DiagramTableCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'diagramLabels' ? (
                  <DiagramLabelsCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'mapMatching' ? (
                  <MapMatchingCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : group.kind === 'matchingPool' ? (
                  <MatchingPoolCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                ) : (
                  <NotepadCard questions={group.items} answers={answers} onAnswer={setAnswer} />
                )}
              </div>
            )
          })}
        </div>
        </div>
      </div>

      {/* ── Fixed bottom section nav ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'color-mix(in srgb, var(--bg-elev) 92%, transparent)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex' }}>
          {sections.map((s, i) => {
            const sqs = questions.filter(q => q.sectionNumber === s.section_number)
            const done = sqs.filter(q => answers[q.id]).length
            const allDone = done === sqs.length && sqs.length > 0
            const active = i === currentSectionIdx
            return (
              <button key={s.id} onClick={() => setCurrentSectionIdx(i)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '12px 8px',
                borderTop: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                background: active ? 'var(--accent-soft)' : 'transparent',
                cursor: 'pointer', transition: 'all .15s',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text-2)' }}>
                  Part {s.section_number}
                </span>
                <span style={{ fontSize: 10, marginTop: 2, fontVariantNumeric: 'tabular-nums', color: allDone ? 'var(--accent)' : active ? 'color-mix(in srgb, var(--accent) 60%, transparent)' : 'var(--text-3)' }}>
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
