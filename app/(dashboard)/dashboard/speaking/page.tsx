'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { createClient } from '@/lib/supabase/client'
import { blobToWav } from '@/lib/utils/wavEncode'

/* ── Examiner / dialogue model ─────────────────────────────────────────────── */
type Part = 1 | 2 | 3
interface ExaminerMove {
  question: string
  part: Part
  lead?: string
  isCueCard?: boolean
  cueCard?: { topic: string; bullets: string[] }
  endOfTest?: boolean
}
interface DialogueTurn { role: 'examiner' | 'candidate'; part: Part; text: string }
interface GradeTurn {
  part: Part
  question: string
  answer: string
  audioPath?: string
  duration_ms?: number
  words?: number
  pause_count?: number
  pause_total_ms?: number
  speech_rate_wpm?: number | null
}
interface TurnMetrics {
  duration_ms: number
  words: number
  pause_count: number
  pause_total_ms: number
  speech_rate_wpm: number | null
}

/** The text stored as the examiner's question for grading. */
function examinerQuestionText(m: ExaminerMove): string {
  return m.isCueCard && m.cueCard
    ? `Describe ${m.cueCard.topic}. You should say: ${m.cueCard.bullets.join('; ')}.`
    : m.question
}
/** What the examiner voice should read aloud. */
function examinerSpokenText(m: ExaminerMove): string {
  return (m.lead ? `${m.lead} ` : '') + m.question
}

interface CriterionResult { band: number; evidence: string }
interface FeedbackResult {
  band_score: number; fluency_score: number; lexical_score: number; grammar_score: number; pronunciation_score: number
  pronunciation_notes: string; pronunciation_from_audio?: boolean
  feedback: { overview: string; strengths: string[]; improvements: string[]; next_band_tip?: string; criteria?: { fluency: CriterionResult; lexical: CriterionResult; grammar: CriterionResult; pronunciation: CriterionResult } }
}
type Phase = 'ready' | 'live' | 'feedback'

const MicIcon = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>
)
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)

/** A filename whose extension matches the recorder's MIME so Whisper detects the format. */
function audioFileName(mime: string): string {
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'speech.mp4'
  if (mime.includes('ogg')) return 'speech.ogg'
  if (mime.includes('wav')) return 'speech.wav'
  return 'speech.webm'
}

/* ── Ready screen ────────────────────────────────────────────────────────── */
function ReadyScreen({ onStart }: { onStart: () => void }) {
  const { t } = useLanguage()
  const isMobile = useIsMobile()
  return (
    <div style={{ flex: 1, background: 'radial-gradient(120% 80% at 50% -10%, var(--accent-soft) 0%, var(--bg) 55%)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 18 : 24 }}>
      <div className="animate-fade-up" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: 26, borderRadius: '50%', background: 'var(--accent-soft)', marginBottom: 26, boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent), 0 0 60px -10px color-mix(in srgb, var(--accent) 40%, transparent)' }}>
          <MicIcon size={46} color="var(--accent)" />
        </div>
        <h1 style={{ fontSize: isMobile ? 30 : 40, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--text)' }}>{t('speak.readyTitle')}</h1>
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
  const isMobile = useIsMobile()
  const scoreFor = { fluency: result.fluency_score, lexical: result.lexical_score, grammar: result.grammar_score, pronunciation: result.pronunciation_score }
  const fb = result.feedback
  return (
    <div style={{ padding: isMobile ? '20px 16px 72px' : '28px 32px 80px', maxWidth: 860, margin: '0 auto' }} className="animate-fade-up">
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', marginBottom: 22 }}>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 19l-7-7 7-7"/></svg>
        {t('speak.back')}
      </button>
      <h1 style={{ fontSize: isMobile ? 26 : 32, letterSpacing: '-0.025em', margin: '0 0 4px', fontWeight: 700, color: 'var(--text)' }}>{t('speak.result')}</h1>
      <p style={{ color: 'var(--text-2)', margin: '0 0 24px', fontSize: 15 }}>{t('speak.resultSub')}</p>
      <div className="card" style={{ padding: isMobile ? 18 : 28, display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: '148px 1fr', gap: isMobile ? 20 : 36, alignItems: isMobile ? 'stretch' : 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><BandRing band={result.band_score} /></div>
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
                {key === 'pronunciation' && (
                  <>
                    <p style={{ fontSize: 11, color: result.pronunciation_from_audio ? 'var(--accent)' : 'var(--text-3)', margin: '5px 0 0', fontWeight: 600 }}>
                      {result.pronunciation_from_audio ? t('speak.pronFromAudio') : t('speak.pronFromText')}
                    </p>
                    {result.pronunciation_notes && (
                      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>{result.pronunciation_notes}</p>
                    )}
                  </>
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

/* ── Live exam (dynamic examiner) ──────────────────────────────────────────── */
type RunPhase = 'loading' | 'prep' | 'idle' | 'recording' | 'transcribing' | 'saving'

function LiveExam({ sessionId, grading, error, onComplete, onExit }: {
  sessionId: string; grading: boolean; error: string
  onComplete: (turns: GradeTurn[], sessionId: string, durationMinutes: number) => void
  onExit: () => void
}) {
  const { t } = useLanguage()
  const isMobile = useIsMobile()
  const partLabel = (p: Part) => t(p === 1 ? 'speak.partIntro' : p === 2 ? 'speak.partLong' : 'speak.partDisc')

  const [move, setMove] = useState<ExaminerMove | null>(null)
  const [runPhase, setRunPhase] = useState<RunPhase>('loading')
  const [answer, setAnswer] = useState('')
  const [answerMeta, setAnswerMeta] = useState<TurnMetrics | null>(null)
  const [typed, setTyped] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [micError, setMicError] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [muted, setMuted] = useState(false)

  // Part 2 preparation
  const [prepLeft, setPrepLeft] = useState(60)
  const [prepNotes, setPrepNotes] = useState('')

  // recording
  const [recSeconds, setRecSeconds] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const lastBlobRef = useRef<Blob | null>(null)
  const barsRef = useRef<HTMLDivElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)

  // examiner voice
  const ttsRef = useRef<HTMLAudioElement | null>(null)

  // accumulated session state (refs so async callbacks read the latest)
  const dialogueRef = useRef<DialogueTurn[]>([])
  const gradeTurnsRef = useRef<GradeTurn[]>([])
  const userIdRef = useRef<string | null>(null)
  const mutedRef = useRef(false)
  useEffect(() => { mutedRef.current = muted }, [muted])

  const stopVoice = useCallback(() => {
    if (ttsRef.current) { ttsRef.current.pause(); ttsRef.current = null }
    setSpeaking(false)
  }, [])

  const speak = useCallback(async (text: string) => {
    if (mutedRef.current || !text.trim()) return
    stopVoice()
    setSpeaking(true)
    try {
      const res = await fetch('/api/ai/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      if (!res.ok) { setSpeaking(false); return }
      const url = URL.createObjectURL(await res.blob())
      const el = new Audio(url)
      ttsRef.current = el
      el.onended = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      el.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      await el.play().catch(() => setSpeaking(false))
    } catch { setSpeaking(false) }
  }, [stopVoice])

  // Ask the examiner for the next move given the dialogue so far.
  const advance = useCallback(async (dialogue: DialogueTurn[]) => {
    setRunPhase('loading'); setMicError(''); stopVoice()
    try {
      const res = await fetch('/api/ai/speaking/examiner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turns: dialogue }) })
      const data = await res.json()
      if (!res.ok) { setMicError(data.error ?? t('speak.errService')); setRunPhase('idle'); return }
      const m = data as ExaminerMove
      setAnswer(''); setAnswerMeta(null); setTyped(false); lastBlobRef.current = null
      if (m.endOfTest) {
        onComplete(gradeTurnsRef.current, sessionId, Math.max(1, Math.round(elapsed / 60)))
        return
      }
      setMove(m)
      if (m.isCueCard) { setPrepLeft(60); setPrepNotes(''); setRunPhase('prep') }
      else setRunPhase('idle')
      speak(examinerSpokenText(m))
    } catch { setMicError(t('speak.errService')); setRunPhase('idle') }
  }, [sessionId, elapsed, onComplete, speak, stopVoice, t])

  // Kick off the test: resolve the user id (for the audio storage path) and ask
  // the first question.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await createClient().auth.getUser()
        if (!cancelled) userIdRef.current = data.user?.id ?? null
      } catch { /* upload simply degrades to text-only grading */ }
      if (!cancelled) advance([])
    })()
    return () => { cancelled = true }
    // advance is stable enough for a one-shot mount; intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // timers
  useEffect(() => { const id = setInterval(() => setElapsed(s => s + 1), 1000); return () => clearInterval(id) }, [])
  useEffect(() => { if (runPhase !== 'recording') return; const id = setInterval(() => setRecSeconds(s => s + 1), 1000); return () => clearInterval(id) }, [runPhase])
  useEffect(() => {
    if (runPhase !== 'prep') return
    const id = setInterval(() => setPrepLeft(s => {
      const nx = Math.max(0, s - 1)
      if (nx === 0) setRunPhase('idle') // prep time is up — move to the long turn
      return nx
    }), 1000)
    return () => clearInterval(id)
  }, [runPhase])

  // cleanup on unmount
  useEffect(() => () => {
    mediaRef.current?.stream?.getTracks().forEach(tr => tr.stop())
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    audioCtxRef.current?.close().catch(() => {})
    if (ttsRef.current) ttsRef.current.pause()
  }, [])

  // live mic visualiser
  useEffect(() => {
    if (runPhase !== 'recording') return
    const analyser = analyserRef.current
    const container = barsRef.current
    if (!analyser || !container) return
    const n = container.children.length
    const time = new Uint8Array(analyser.fftSize)
    const levels: number[] = new Array(n).fill(0)
    let lastTick = 0
    const draw = (ts: number) => {
      analyser.getByteTimeDomainData(time)
      let sum = 0
      for (let i = 0; i < time.length; i++) { const x = (time[i] - 128) / 128; sum += x * x }
      const level = Math.min(1, Math.sqrt(sum / time.length) * 3.4)
      if (ts - lastTick > 45) {
        lastTick = ts
        levels.shift(); levels.push(level)
        const bars = container.children
        for (let i = 0; i < n; i++) {
          const el = bars[i] as HTMLElement
          el.style.height = `${4 + levels[i] * 34}px`
          el.style.opacity = `${0.4 + levels[i] * 0.6}`
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
  }, [runPhase])

  const startRecording = useCallback(async () => {
    setMicError(''); stopVoice()
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) { setMicError(t('speak.errUnsupported')); setTyped(true); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      try {
        const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (Ctx) {
          const ctx = new Ctx()
          if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
          const source = ctx.createMediaStreamSource(stream)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.6
          source.connect(analyser)
          audioCtxRef.current = ctx; analyserRef.current = analyser
        }
      } catch { /* visualiser optional */ }

      const mr = new MediaRecorder(stream)
      chunksRef.current = []; setRecSeconds(0)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(tr => tr.stop())
        const mime = mr.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mime })
        lastBlobRef.current = blob
        if (blob.size === 0) { setRunPhase('idle'); return }
        setRunPhase('transcribing')
        try {
          const fd = new FormData(); fd.append('audio', blob, audioFileName(mime))
          const res = await fetch('/api/ai/transcribe', { method: 'POST', body: fd })
          const data = await res.json()
          if (res.ok && typeof data.transcript === 'string') {
            setAnswer(prev => (prev.trim() ? prev.trim() + ' ' : '') + data.transcript)
            setAnswerMeta({ duration_ms: data.duration_ms ?? 0, words: data.words ?? 0, pause_count: data.pause_count ?? 0, pause_total_ms: data.pause_total_ms ?? 0, speech_rate_wpm: data.speech_rate_wpm ?? null })
            if (data.isEnglish === false) setMicError(t('speak.notEnglish'))
          } else setMicError(data.error ?? t('speak.errTranscribe'))
        } catch { setMicError(t('speak.errService')) }
        finally { setRunPhase('idle') }
      }
      mr.start(); mediaRef.current = mr; setRunPhase('recording')
    } catch { setMicError(t('speak.errDenied')); setTyped(true) }
  }, [stopVoice, t])
  const stopRecording = useCallback(() => { mediaRef.current?.stop() }, [])

  async function uploadWav(blob: Blob, turnIndex: number): Promise<string | undefined> {
    const uid = userIdRef.current
    if (!uid) return undefined
    try {
      const wav = await blobToWav(blob)
      const path = `${uid}/${sessionId}/${turnIndex}.wav`
      const { error: upErr } = await createClient().storage.from('speaking-audio').upload(path, wav, { contentType: 'audio/wav', upsert: true })
      return upErr ? undefined : path
    } catch { return undefined }
  }

  async function submitTurn() {
    if (!move) return
    if (runPhase === 'recording') { stopRecording(); return }
    const text = answer.trim()
    if (!text) { setMicError(t('speak.needAnswer')); return }
    stopVoice()

    const qText = examinerQuestionText(move)
    dialogueRef.current = [
      ...dialogueRef.current,
      { role: 'examiner', part: move.part, text: qText },
      { role: 'candidate', part: move.part, text },
    ]

    const turnIndex = gradeTurnsRef.current.length
    let audioPath: string | undefined
    // Only the Part 2 long turn is uploaded for acoustic pronunciation grading.
    if (move.isCueCard && lastBlobRef.current && !typed) {
      setRunPhase('saving')
      audioPath = await uploadWav(lastBlobRef.current, turnIndex)
    }
    gradeTurnsRef.current = [
      ...gradeTurnsRef.current,
      { part: move.part, question: qText, answer: text, audioPath, ...(answerMeta ?? {}) },
    ]
    advance(dialogueRef.current)
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const progressPct = move ? (move.part === 1 ? 33 : move.part === 2 ? 66 : 100) : 5
  const canSubmit = words(answer) >= 3
  const busy = grading || runPhase === 'transcribing' || runPhase === 'saving' || runPhase === 'loading'
  const showAnswerArea = !(move?.isCueCard && runPhase === 'prep')

  return (
    <div style={{ flex: 1, background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: isMobile ? '12px 16px' : '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent) 20%, transparent)' }}/>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{t('speak.examiner')}</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>· Sarah</span>
          {speaking && <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>· {t('speak.listening')}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { setMuted(m => { const nx = !m; if (nx) stopVoice(); return nx }) }} aria-label={muted ? t('speak.unmute') : t('speak.mute')} title={muted ? t('speak.unmute') : t('speak.mute')} style={{ display: 'inline-flex', padding: 6, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer' }}>
            {muted
              ? <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>
              : <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>}
          </button>
          <span style={{ fontSize: 13.5, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{mm}:{ss}</span>
          <button onClick={() => { stopVoice(); onExit() }} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>{t('speak.endTest')}</button>
        </div>
      </header>

      {/* Progress */}
      <div style={{ padding: isMobile ? '12px 16px 0' : '14px 24px 0', flexShrink: 0 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>
              <span style={{ padding: '2px 9px', borderRadius: 999, background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' }}>{t('speak.part')} {move?.part ?? 1}</span>
              {partLabel(move?.part ?? 1)}
            </span>
          </div>
          <div style={{ height: 3, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width .35s ease' }}/>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '18px 16px' : '22px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {!move && runPhase === 'loading' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '60px 0', color: 'var(--text-3)' }}>
              <Loader2 size={26} className="animate-spin" />
              <span style={{ fontSize: 14 }}>{t('speak.loadingQ')}</span>
            </div>
          ) : move ? (
            <>
              {/* Question / cue card */}
              <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 18, padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)', flexShrink: 0 }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/></svg>
                    </div>
                    <span style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-3)', fontWeight: 600 }}>{t('speak.examinerLabel')}</span>
                  </div>
                  <button onClick={() => speak(examinerSpokenText(move))} disabled={speaking || muted} aria-label={t('speak.replay')} title={t('speak.replay')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: speaking || muted ? 'var(--text-3)' : 'var(--text-2)', cursor: speaking || muted ? 'default' : 'pointer' }}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8"/><path d="M3 3v5h5"/></svg>
                    {t('speak.replay')}
                  </button>
                </div>
                {move.lead && <p style={{ fontSize: 13.5, color: 'var(--text-3)', margin: '0 0 8px', fontStyle: 'italic' }}>{move.lead}</p>}
                {move.isCueCard && move.cueCard ? (
                  <>
                    <p style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--text)', margin: '0 0 12px', fontWeight: 500 }}>Describe {move.cueCard.topic}.</p>
                    <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 6 }}>You should say:</div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)', fontSize: 14.5, lineHeight: 1.7 }}>
                      {move.cueCard.bullets.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </>
                ) : (
                  <p style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--text)', margin: 0, fontWeight: 500 }}>{move.question}</p>
                )}
              </div>

              {/* Part 2 preparation */}
              {move.isCueCard && runPhase === 'prep' ? (
                <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--accent)' }}>{t('speak.prep')} · {String(Math.floor(prepLeft / 60)).padStart(2, '0')}:{String(prepLeft % 60).padStart(2, '0')}</span>
                    <button onClick={() => setRunPhase('idle')} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>{t('speak.ready2')} →</button>
                  </div>
                  <textarea value={prepNotes} onChange={e => setPrepNotes(e.target.value)} placeholder={t('speak.prepPlaceholder')}
                    style={{ width: '100%', minHeight: 90, padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'var(--font-sans)' }}/>
                </div>
              ) : showAnswerArea && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: '0.08em', fontWeight: 600 }}>{t('speak.yourAnswer')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button onClick={() => setTyped(v => !v)} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        {typed ? t('speak.recordInstead') : t('speak.typeInstead')}
                      </button>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{words(answer)} {t('speak.words')}</span>
                    </div>
                  </div>
                  <textarea value={answer} readOnly={!typed} onChange={e => typed && setAnswer(e.target.value)}
                    placeholder={typed ? (move.isCueCard ? t('speak.ansLong') : t('speak.ansShort')) : t('speak.hintIdle')}
                    style={{ width: '100%', minHeight: move.isCueCard ? 150 : 110, padding: '15px 17px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 16, color: typed ? 'var(--text)' : 'var(--text-2)', fontSize: 14.5, lineHeight: 1.65, resize: 'vertical', outline: 'none', fontFamily: 'var(--font-sans)', cursor: typed ? 'text' : 'default' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}/>
                  {(error || micError) && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--danger)' }}>{error || micError}</div>}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Dock */}
      <div style={{ padding: isMobile ? '14px 16px 20px' : '16px 24px 20px', paddingBottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom))' : 20, borderTop: '1px solid var(--border)', background: 'var(--bg-soft)', flexShrink: 0 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* mic — hidden in typing mode */}
          {!typed && (runPhase === 'recording' ? (
            <button onClick={stopRecording} aria-label="Stop recording" style={{ width: 54, height: 54, borderRadius: 27, flexShrink: 0, background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 0 0 8px color-mix(in srgb, var(--danger) 18%, transparent)' }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>
            </button>
          ) : (
            <button onClick={startRecording} disabled={busy || runPhase === 'prep'} aria-label="Record" style={{ width: 54, height: 54, borderRadius: 27, flexShrink: 0, background: busy || runPhase === 'prep' ? 'var(--bg-soft)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: busy || runPhase === 'prep' ? '1px solid var(--border)' : 'none', cursor: busy || runPhase === 'prep' ? 'default' : 'pointer', boxShadow: busy || runPhase === 'prep' ? 'none' : '0 8px 24px -8px color-mix(in srgb, var(--accent) 70%, transparent)' }}>
              {runPhase === 'transcribing' || runPhase === 'saving' ? <Loader2 size={20} color="var(--text-3)" className="animate-spin"/> : <MicIcon size={22} color="var(--accent-fg)" />}
            </button>
          ))}

          {runPhase === 'recording' ? (
            <div ref={barsRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40 }}>
              {Array.from({ length: 40 }).map((_, i) => <div key={i} style={{ flex: 1, maxWidth: 3.5, background: 'var(--accent)', borderRadius: 999, height: 4, opacity: 0.4, transition: 'height 0.12s cubic-bezier(.25,.8,.25,1), opacity 0.12s ease-out' }}/>)}
              <span style={{ fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginLeft: 8, minWidth: 44, textAlign: 'right' }}>{String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}</span>
            </div>
          ) : (
            <button
              onClick={submitTurn}
              disabled={busy || runPhase === 'prep' || !canSubmit}
              style={{ flex: 1, padding: '14px', borderRadius: 12, fontSize: 14.5, fontWeight: 700, background: busy || runPhase === 'prep' || !canSubmit ? 'var(--bg-soft)' : 'var(--accent)', color: busy || runPhase === 'prep' || !canSubmit ? 'var(--text-3)' : 'var(--accent-fg)', border: busy || runPhase === 'prep' || !canSubmit ? '1px solid var(--border)' : 'none', cursor: busy || runPhase === 'prep' || !canSubmit ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {grading ? <><Loader2 size={15} className="animate-spin"/> {t('speak.scoring')}</>
                : runPhase === 'transcribing' ? <><Loader2 size={15} className="animate-spin"/> {t('speak.transcribing')}</>
                : runPhase === 'saving' ? <><Loader2 size={15} className="animate-spin"/> {t('speak.saving')}</>
                : runPhase === 'loading' ? <><Loader2 size={15} className="animate-spin"/> {t('speak.loadingQ')}</>
                : canSubmit ? `${t('speak.nextQ')} →`
                : t('speak.needAnswer')}
            </button>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>
          {runPhase === 'recording' ? t('speak.hintRec') : runPhase === 'prep' ? t('speak.hintPrep') : t('speak.hintIdle')}
        </div>
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */
function newSessionId(): string {
  try { return crypto.randomUUID() } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}` }
}

export default function SpeakingPage() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [sessionId, setSessionId] = useState('')
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState<FeedbackResult | null>(null)
  const [error, setError] = useState('')

  async function handleComplete(turns: GradeTurn[], sid: string, durationMinutes: number) {
    if (turns.length === 0) { setError(''); setPhase('ready'); return }
    setError(''); setResult(null); setGrading(true)
    try {
      const res = await fetch('/api/ai/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turns, sessionId: sid, durationMinutes, topic: 'Full speaking test' }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Failed to score the test.')
      else { setResult(data); setPhase('feedback') }
    } catch { setError('Network error. Please try again.') }
    finally { setGrading(false) }
  }

  if (phase === 'ready') {
    return <ReadyScreen onStart={() => { setSessionId(newSessionId()); setError(''); setResult(null); setPhase('live') }} />
  }
  if (phase === 'feedback' && result) {
    return <FeedbackScreen result={result} onBack={() => { setResult(null); setPhase('ready') }} />
  }
  return (
    <LiveExam
      key={sessionId}
      sessionId={sessionId}
      grading={grading}
      error={error}
      onComplete={handleComplete}
      onExit={() => { setError(''); setPhase('ready') }}
    />
  )
}
