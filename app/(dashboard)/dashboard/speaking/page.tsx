'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/* ── Themed test sets (original IELTS-style wording) ──────────────────────── */
interface SpeakingSet {
  id: string
  title: string
  part1: { topic: string; questions: string[] }[]
  part2: { topic: string; bullets: string[] }
  part2Followups: string[]
  part3: string[]
}

const SETS: SpeakingSet[] = [
  {
    id: 'places',
    title: 'Home & surroundings',
    part1: [
      { topic: 'your hometown', questions: ['Where is your hometown, and how would you describe it?', 'What do you like most about living there?', 'Has your hometown changed much in recent years?', 'Would you recommend it to someone visiting your country?'] },
      { topic: 'daily routine', questions: ['Do you prefer mornings or evenings? Why?', 'Is there something you do every day without fail?', 'How do you usually relax after a busy day?'] },
      { topic: 'the weather', questions: ['What kind of weather do you enjoy most?', 'Does the weather ever change your plans?'] },
    ],
    part2: { topic: 'a place in your area that you enjoy visiting', bullets: ['where it is', 'how often you go there', 'what you do there', 'and explain why you enjoy it'] },
    part2Followups: ['Do you usually go there alone or with other people?', 'Has this place become more popular recently?'],
    part3: ['Why do you think people need public spaces such as parks?', 'How have the places where people spend their free time changed over the past few decades?', 'Do you think cities or the countryside offer a better quality of life?', 'Whose responsibility is it to look after public spaces?', 'How might these kinds of places change in the future?'],
  },
  {
    id: 'tech',
    title: 'Work, study & technology',
    part1: [
      { topic: 'work or study', questions: ['Do you work or are you a student at the moment?', 'What do you enjoy most about it?', 'Is there anything you would like to change about it?'] },
      { topic: 'free time', questions: ['How do you usually spend your free time?', 'Have your hobbies changed since you were a child?', 'Do you prefer spending free time indoors or outdoors?'] },
      { topic: 'technology', questions: ['How often do you use the internet each day?', 'Is there an app or device you could not do without?'] },
    ],
    part2: { topic: 'a piece of technology you find useful', bullets: ['what it is', 'how you use it', 'how long you have used it', 'and explain why it is useful to you'] },
    part2Followups: ['Did you find it difficult to learn at first?', 'Would you recommend it to other people?'],
    part3: ['How has technology changed the way people communicate?', 'Do you think people rely too much on technology today?', 'What are the downsides of being constantly connected?', 'Should schools teach children how to use technology responsibly?', 'How do you imagine technology will change daily life in twenty years?'],
  },
  {
    id: 'people',
    title: 'People & experiences',
    part1: [
      { topic: 'friends', questions: ['Do you have a large group of friends or just a few close ones?', 'How do you usually keep in touch with your friends?', 'What qualities do you value most in a friend?'] },
      { topic: 'food', questions: ['What kind of food do you most enjoy?', 'Has your taste in food changed over the years?', 'Do you prefer eating at home or in restaurants?'] },
      { topic: 'music', questions: ['What kind of music do you listen to?', 'Do you play, or would you like to play, a musical instrument?'] },
    ],
    part2: { topic: 'a person who has had a positive influence on you', bullets: ['who the person is', 'how you know them', 'what they are like', 'and explain how they have influenced you'] },
    part2Followups: ['Do you think they realise how much they influenced you?', 'Are you still in contact with this person?'],
    part3: ['Who are the most important role models for young people today?', 'Do you think famous people make good role models?', 'How do the people around us shape the decisions we make?', 'Is it better to learn from your own mistakes or from other people’s advice?', 'How have relationships between people changed in the modern world?'],
  },
]

/* ── Turn model ──────────────────────────────────────────────────────────── */
type Turn =
  | { kind: 'q'; part: 1 | 2 | 3; lead?: string; prompt: string }
  | { kind: 'cue'; part: 2; topic: string; bullets: string[] }

function buildTurns(set: SpeakingSet): Turn[] {
  const turns: Turn[] = []
  set.part1.forEach((grp, gi) => {
    grp.questions.forEach((q, qi) => {
      turns.push({ kind: 'q', part: 1, prompt: q, lead: qi === 0 ? (gi === 0 ? `Let's begin. First, I'd like to talk about ${grp.topic}.` : `Now let's move on to ${grp.topic}.`) : undefined })
    })
  })
  turns.push({ kind: 'cue', part: 2, topic: set.part2.topic, bullets: set.part2.bullets })
  set.part2Followups.forEach(q => turns.push({ kind: 'q', part: 2, prompt: q }))
  set.part3.forEach((q, i) => turns.push({ kind: 'q', part: 3, prompt: q, lead: i === 0 ? "Let's discuss this topic more generally." : undefined }))
  return turns
}

function turnQuestion(t: Turn): string {
  return t.kind === 'cue'
    ? `Describe ${t.topic}. You should say: ${t.bullets.join('; ')}.`
    : t.prompt
}

interface CriterionResult { band: number; evidence: string }
interface FeedbackResult {
  band_score: number; fluency_score: number; lexical_score: number; grammar_score: number; pronunciation_score: number; pronunciation_notes: string
  feedback: { overview: string; strengths: string[]; improvements: string[]; next_band_tip?: string; criteria?: { fluency: CriterionResult; lexical: CriterionResult; grammar: CriterionResult; pronunciation: CriterionResult } }
}
type Phase = 'ready' | 'live' | 'feedback'

const MicIcon = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>
)
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)

/* ── Ready screen ────────────────────────────────────────────────────────── */
function ReadyScreen({ onStart }: { onStart: () => void }) {
  const { t } = useLanguage()
  return (
    <div style={{ flex: 1, background: 'radial-gradient(120% 80% at 50% -10%, var(--accent-soft) 0%, var(--bg) 55%)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="animate-fade-up" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: 26, borderRadius: '50%', background: 'var(--accent-soft)', marginBottom: 26, boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent), 0 0 60px -10px color-mix(in srgb, var(--accent) 40%, transparent)' }}>
          <MicIcon size={46} color="var(--accent)" />
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--text)' }}>{t('speak.readyTitle')}</h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 34px' }}>
          {t('speak.readyDesc')}
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 34, textAlign: 'left' }}>
          {[t('speak.b1'), t('speak.b2'), t('speak.b3'), t('speak.b4')].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 16px', background: 'var(--bg-elev)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
              <span style={{ fontSize: 14, color: 'var(--text)' }}>{s}</span>
            </div>
          ))}
        </div>
        <button onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 34px', borderRadius: 14, fontSize: 15, fontWeight: 700, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px -10px color-mix(in srgb, var(--accent) 60%, transparent)' }}>
          <MicIcon size={17} color="var(--accent-fg)" /> {t('speak.start')}
        </button>
      </div>
    </div>
  )
}

/* ── Feedback screen ─────────────────────────────────────────────────────── */
const CRIT_META = [
  { key: 'fluency' as const, label: 'speak.critFluency' },
  { key: 'lexical' as const, label: 'speak.critLexical' },
  { key: 'grammar' as const, label: 'speak.critGrammar' },
  { key: 'pronunciation' as const, label: 'speak.critPron' },
]
function BandRing({ band }: { band: number }) {
  const { t } = useLanguage()
  const r = 58, c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(9, band)) / 9)
  return (
    <div style={{ position: 'relative', width: 148, height: 148, flexShrink: 0 }}>
      <svg width={148} height={148} viewBox="0 0 148 148">
        <circle cx={74} cy={74} r={r} fill="none" stroke="var(--border)" strokeWidth={9} />
        <circle cx={74} cy={74} r={r} fill="none" stroke="var(--accent)" strokeWidth={9} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 74 74)" style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.7,.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 52, lineHeight: 1, color: 'var(--accent)', fontWeight: 500 }}>{band.toFixed(1)}</div>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-3)', marginTop: 2 }}>{t('speak.band')}</div>
      </div>
    </div>
  )
}
function FeedbackScreen({ result, onBack }: { result: FeedbackResult; onBack: () => void }) {
  const { t } = useLanguage()
  const scoreFor = { fluency: result.fluency_score, lexical: result.lexical_score, grammar: result.grammar_score, pronunciation: result.pronunciation_score }
  const fb = result.feedback
  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 860, margin: '0 auto' }} className="animate-fade-up">
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', marginBottom: 22 }}>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 19l-7-7 7-7"/></svg>
        {t('speak.back')}
      </button>
      <h1 style={{ fontSize: 32, letterSpacing: '-0.025em', margin: '0 0 4px', fontWeight: 700, color: 'var(--text)' }}>{t('speak.result')}</h1>
      <p style={{ color: 'var(--text-2)', margin: '0 0 24px', fontSize: 15 }}>{t('speak.resultSub')}</p>
      <div className="card" style={{ padding: 28, display: 'grid', gridTemplateColumns: '148px 1fr', gap: 36, alignItems: 'center', marginBottom: 16 }}>
        <BandRing band={result.band_score} />
        <div style={{ display: 'grid', gap: 16 }}>
          {CRIT_META.map(({ key, label }) => {
            const v = scoreFor[key]
            const evidence = fb.criteria?.[key]?.evidence
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t(label)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>{v.toFixed(1)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${(v / 9) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width .8s cubic-bezier(.2,.7,.2,1)' }}/>
                </div>
                {evidence && <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '6px 0 0', lineHeight: 1.5 }}>{evidence}</p>}
                {key === 'pronunciation' && result.pronunciation_notes && (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '5px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>{result.pronunciation_notes}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {fb.overview && <div className="card" style={{ padding: 22, marginBottom: 16 }}><p style={{ fontSize: 14.5, lineHeight: 1.65, margin: 0, color: 'var(--text)' }}>{fb.overview}</p></div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16, marginBottom: 16 }}>
        {fb.strengths?.length > 0 && (
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 12 }}>{t('speak.strengths')}</div>
            {fb.strengths.map((s, i) => <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', marginBottom: 9 }}><span style={{ color: 'var(--accent)', flexShrink: 0 }}>✓</span><span>{s}</span></div>)}
          </div>
        )}
        {fb.improvements?.length > 0 && (
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--warn)', marginBottom: 12 }}>{t('speak.improve')}</div>
            {fb.improvements.map((s, i) => <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', marginBottom: 9 }}><span style={{ color: 'var(--warn)', flexShrink: 0 }}>→</span><span>{s}</span></div>)}
          </div>
        )}
      </div>
      {fb.next_band_tip && (
        <div className="card" style={{ padding: 22, background: 'var(--accent-soft)', borderColor: 'transparent', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/></svg>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 5 }}>{t('speak.nextBand')}</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'var(--text)' }}>{fb.next_band_tip}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Guided test runner ──────────────────────────────────────────────────── */
type RecState = 'idle' | 'recording' | 'transcribing'

function LiveExam({ set, loading, error, onComplete, onExit }: {
  set: SpeakingSet; loading: boolean; error: string
  onComplete: (turns: { part: number; question: string; answer: string }[]) => void
  onExit: () => void
}) {
  const { t } = useLanguage()
  const partLabel = (p: 1 | 2 | 3) => t(p === 1 ? 'speak.partIntro' : p === 2 ? 'speak.partLong' : 'speak.partDisc')
  const turns = useMemo(() => buildTurns(set), [set])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<string[]>(() => turns.map(() => ''))
  const [elapsed, setElapsed] = useState(0)

  // Part 2 preparation
  const [prepActive, setPrepActive] = useState(false)
  const [prepLeft, setPrepLeft] = useState(60)
  const [prepNotes, setPrepNotes] = useState('')

  // recording
  const [recState, setRecState] = useState<RecState>('idle')
  const [recSeconds, setRecSeconds] = useState(0)
  const [micError, setMicError] = useState('')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  // Live mic visualiser (Web Audio) — drives the equalizer bars from the voice.
  const barsRef = useRef<HTMLDivElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)

  const turn = turns[idx]
  const answer = answers[idx] ?? ''

  // counts within the current part
  const partTurns = turns.filter(t => t.part === turn.part)
  const posInPart = turns.slice(0, idx + 1).filter(t => t.part === turn.part).length

  useEffect(() => { const id = setInterval(() => setElapsed(s => s + 1), 1000); return () => clearInterval(id) }, [])
  useEffect(() => () => { mediaRef.current?.stream?.getTracks().forEach(t => t.stop()) }, [])
  useEffect(() => { if (recState !== 'recording') return; const id = setInterval(() => setRecSeconds(s => s + 1), 1000); return () => clearInterval(id) }, [recState])
  // Drive the equalizer bars from live mic levels while recording. We write bar
  // heights directly to the DOM each frame (no React re-render per frame), and
  // tear the audio graph down on stop.
  useEffect(() => {
    if (recState !== 'recording') return
    const analyser = analyserRef.current
    const container = barsRef.current
    if (!analyser || !container) return
    const n = container.children.length
    const time = new Uint8Array(analyser.fftSize)
    const levels: number[] = new Array(n).fill(0)
    let lastTick = 0
    const draw = (ts: number) => {
      // RMS amplitude of the current frame (0..1), boosted for speech levels.
      analyser.getByteTimeDomainData(time)
      let sum = 0
      for (let i = 0; i < time.length; i++) { const x = (time[i] - 128) / 128; sum += x * x }
      const level = Math.min(1, Math.sqrt(sum / time.length) * 3.4)
      // Scroll one new sample in every ~45ms: the newest level enters on the
      // right and the whole wave flows left, Telegram-style.
      if (ts - lastTick > 45) {
        lastTick = ts
        levels.shift()
        levels.push(level)
        const bars = container.children
        for (let i = 0; i < n; i++) {
          const v = levels[i]
          const el = bars[i] as HTMLElement
          el.style.height = `${4 + v * 34}px`
          el.style.opacity = `${0.4 + v * 0.6}`
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      analyserRef.current = null
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [recState])
  useEffect(() => {
    if (!prepActive) return
    const id = setInterval(() => setPrepLeft(s => {
      const nx = Math.max(0, s - 1)
      if (nx === 0) setPrepActive(false)
      return nx
    }), 1000)
    return () => clearInterval(id)
  }, [prepActive])

  const setAnswer = useCallback((updater: string | ((p: string) => string)) => {
    setAnswers(arr => { const c = [...arr]; const cur = c[idx] ?? ''; c[idx] = typeof updater === 'function' ? (updater as (p: string) => string)(cur) : updater; return c })
  }, [idx])

  const startRecording = useCallback(async () => {
    setMicError('')
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) { setMicError(t('speak.errUnsupported')); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Tap the mic stream for a real-time level analyser (visualiser only).
      try {
        const Ctx = window.AudioContext
          || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (Ctx) {
          const audioCtx = new Ctx()
          // Browsers often start the context suspended; without resuming, the
          // analyser only ever sees silence and the bars stay flat.
          if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => {})
          const source = audioCtx.createMediaStreamSource(stream)
          const analyser = audioCtx.createAnalyser()
          analyser.fftSize = 256
          analyser.smoothingTimeConstant = 0.6
          source.connect(analyser)
          audioCtxRef.current = audioCtx
          analyserRef.current = analyser
        }
      } catch { /* visualiser is optional — recording still works */ }

      const mr = new MediaRecorder(stream)
      chunksRef.current = []; setRecSeconds(0)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size === 0) { setRecState('idle'); return }
        setRecState('transcribing')
        try {
          const fd = new FormData(); fd.append('audio', blob, 'speech.webm')
          const res = await fetch('/api/ai/transcribe', { method: 'POST', body: fd })
          const data = await res.json()
          if (res.ok && data.transcript) setAnswer(prev => (prev.trim() ? prev.trim() + ' ' : '') + data.transcript)
          else setMicError(data.error ?? t('speak.errTranscribe'))
        } catch { setMicError(t('speak.errService')) }
        finally { setRecState('idle') }
      }
      mr.start(); mediaRef.current = mr; setRecState('recording')
    } catch { setMicError(t('speak.errDenied')) }
  }, [setAnswer, t])
  const stopRecording = useCallback(() => { mediaRef.current?.stop() }, [])

  function goTo(i: number) {
    if (recState === 'recording') stopRecording()
    setMicError('')
    setIdx(i)
    const t = turns[i]
    if (t.kind === 'cue') { setPrepActive(true); setPrepLeft(60); setPrepNotes('') }
    else setPrepActive(false)
  }
  const next = () => { if (idx < turns.length - 1) goTo(idx + 1); else finish() }
  const back = () => { if (idx > 0) goTo(idx - 1) }

  function finish() {
    const session = turns.map((t, i) => ({ part: t.part, question: turnQuestion(t), answer: answers[i] ?? '' })).filter(s => s.answer.trim())
    onComplete(session)
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const isLast = idx === turns.length - 1
  const totalWords = answers.reduce((n, a) => n + words(a), 0)
  const canAdvance = words(answer) >= 3
  const canFinish = totalWords >= 40
  const busy = loading || recState === 'transcribing'

  return (
    <div style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent) 20%, transparent)' }}/>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{t('speak.examiner')}</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>· Sarah</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13.5, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{mm}:{ss}</span>
          <button onClick={onExit} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>{t('speak.endTest')}</button>
        </div>
      </header>

      {/* Progress */}
      <div style={{ padding: '14px 24px 0', flexShrink: 0 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>
              <span style={{ padding: '2px 9px', borderRadius: 999, background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' }}>{t('speak.part')} {turn.part}</span>
              {partLabel(turn.part)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{posInPart} / {partTurns.length}</span>
          </div>
          <div style={{ height: 3, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${((idx + 1) / turns.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width .35s ease' }}/>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '22px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Question / cue card */}
          <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)', flexShrink: 0 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/></svg>
              </div>
              <span style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-3)', fontWeight: 600 }}>{t('speak.examinerLabel')}</span>
            </div>
            {turn.kind === 'q' && turn.lead && <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: '0 0 8px', fontStyle: 'italic' }}>{turn.lead}</p>}
            {turn.kind === 'cue' ? (
              <>
                <p style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--text)', margin: '0 0 12px', fontWeight: 500 }}>Describe {turn.topic}.</p>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 6 }}>You should say:</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)', fontSize: 14.5, lineHeight: 1.7 }}>
                  {turn.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </>
            ) : (
              <p style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--text)', margin: 0, fontWeight: 500 }}>{turn.prompt}</p>
            )}
          </div>

          {/* Part 2 preparation */}
          {turn.kind === 'cue' && prepActive ? (
            <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--accent)' }}>{t('speak.prep')} · {String(Math.floor(prepLeft / 60)).padStart(2, '0')}:{String(prepLeft % 60).padStart(2, '0')}</span>
                <button onClick={() => setPrepActive(false)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>{t('speak.ready2')} →</button>
              </div>
              <textarea value={prepNotes} onChange={e => setPrepNotes(e.target.value)} placeholder={t('speak.prepPlaceholder')}
                style={{ width: '100%', minHeight: 90, padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'var(--font-sans)' }}/>
            </div>
          ) : (
            /* Answer */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: '0.08em', fontWeight: 600 }}>{t('speak.yourAnswer')}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{words(answer)} {t('speak.words')}</span>
              </div>
              <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder={turn.kind === 'cue' ? t('speak.ansLong') : t('speak.ansShort')}
                style={{ width: '100%', minHeight: turn.kind === 'cue' ? 150 : 110, padding: '15px 17px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text)', fontSize: 14.5, lineHeight: 1.65, resize: 'vertical', outline: 'none', fontFamily: 'var(--font-sans)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}/>
              {(error || micError) && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--danger)' }}>{error || micError}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Dock */}
      <div style={{ padding: '16px 24px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)', flexShrink: 0 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* mic */}
          {recState === 'recording' ? (
            <button onClick={stopRecording} aria-label="Stop recording" style={{ width: 54, height: 54, borderRadius: 27, flexShrink: 0, background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 0 0 8px color-mix(in srgb, var(--danger) 18%, transparent)' }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>
            </button>
          ) : (
            <button onClick={startRecording} disabled={recState === 'transcribing'} aria-label="Record" style={{ width: 54, height: 54, borderRadius: 27, flexShrink: 0, background: recState === 'transcribing' ? 'var(--bg-soft)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: recState === 'transcribing' ? '1px solid var(--border)' : 'none', cursor: recState === 'transcribing' ? 'default' : 'pointer', boxShadow: recState === 'transcribing' ? 'none' : '0 8px 24px -8px color-mix(in srgb, var(--accent) 70%, transparent)' }}>
              {recState === 'transcribing' ? <Loader2 size={20} color="var(--text-3)" className="animate-spin"/> : <MicIcon size={22} color="var(--accent-fg)" />}
            </button>
          )}

          {/* middle: equalizer while recording */}
          {recState === 'recording' ? (
            <div ref={barsRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40 }}>
              {Array.from({ length: 40 }).map((_, i) => <div key={i} style={{ flex: 1, maxWidth: 3.5, background: 'var(--accent)', borderRadius: 999, height: 4, opacity: 0.4, transition: 'height 0.12s cubic-bezier(.25,.8,.25,1), opacity 0.12s ease-out' }}/>)}
              <span style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginLeft: 8, minWidth: 44, textAlign: 'right' }}>{String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}</span>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={back} disabled={idx === 0 || busy} style={{ padding: '13px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'transparent', color: idx === 0 ? 'var(--text-3)' : 'var(--text-2)', border: '1px solid var(--border)', cursor: idx === 0 || busy ? 'default' : 'pointer' }}>{t('speak.prevQ')}</button>
              <button
                onClick={next}
                disabled={busy || (isLast ? !canFinish : !canAdvance)}
                style={{ flex: 1, padding: '14px', borderRadius: 12, fontSize: 14.5, fontWeight: 700, background: busy || (isLast ? !canFinish : !canAdvance) ? 'var(--bg-soft)' : 'var(--accent)', color: busy || (isLast ? !canFinish : !canAdvance) ? 'var(--text-3)' : 'var(--accent-fg)', border: busy || (isLast ? !canFinish : !canAdvance) ? '1px solid var(--border)' : 'none', cursor: busy || (isLast ? !canFinish : !canAdvance) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {recState === 'transcribing' ? <><Loader2 size={15} className="animate-spin"/> {t('speak.transcribing')}</>
                  : loading ? <><Loader2 size={15} className="animate-spin"/> {t('speak.scoring')}</>
                  : isLast ? (canFinish ? t('speak.finish') : t('speak.finishMore'))
                  : (canAdvance ? `${t('speak.nextQ')} →` : t('speak.needAnswer'))}
              </button>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>
          {recState === 'recording' ? t('speak.hintRec') : turn.kind === 'cue' && prepActive ? t('speak.hintPrep') : t('speak.hintIdle')}
        </div>
      </div>

    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function SpeakingPage() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [setIdx, setSetIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FeedbackResult | null>(null)
  const [error, setError] = useState('')

  async function handleComplete(turns: { part: number; question: string; answer: string }[]) {
    setError(''); setResult(null); setLoading(true)
    try {
      const res = await fetch('/api/ai/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turns, topic: SETS[setIdx].title }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Failed to score the test.')
      else { setResult(data); setPhase('feedback') }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  if (phase === 'ready') {
    return <ReadyScreen onStart={() => { setSetIdx(Math.floor(Math.random() * SETS.length)); setError(''); setResult(null); setPhase('live') }} />
  }
  if (phase === 'feedback' && result) {
    return <FeedbackScreen result={result} onBack={() => { setResult(null); setPhase('ready') }} />
  }
  return (
    <LiveExam
      key={setIdx}
      set={SETS[setIdx]}
      loading={loading}
      error={error}
      onComplete={handleComplete}
      onExit={() => { setError(''); setPhase('ready') }}
    />
  )
}
