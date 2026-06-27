'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { createClient } from '@/lib/supabase/client'
import { blobToWavSegments, type SpeechSegment } from '@/lib/utils/wavEncode'
import { metricsFromSegments, type FluencyMetrics } from '@/lib/ielts/fluency'
import { SpeakingFocus } from '@/components/speaking/SpeakingFocus'
import { redirectToPaywallOn403 } from '@/lib/paywall'

/* ── Types ─────────────────────────────────────────────────────────────────── */
type Part = 1 | 2 | 3
interface GradeTurn {
  part: Part
  question: string
  answer: string
  duration_ms?: number
  words?: number
  pause_count?: number
  pause_total_ms?: number
  speech_rate_wpm?: number | null
}
interface CriterionResult { band: number; evidence: string }
interface FeedbackResult {
  band_score: number; fluency_score: number; lexical_score: number; grammar_score: number; pronunciation_score: number
  pronunciation_notes: string; pronunciation_from_audio?: boolean
  fluency_metrics?: FluencyMetrics | null
  feedback: { overview: string; strengths: string[]; improvements: string[]; next_band_tip?: string; criteria?: { fluency: CriterionResult; lexical: CriterionResult; grammar: CriterionResult; pronunciation: CriterionResult } }
}
interface CompletePayload { turns: GradeTurn[]; sessionId: string; durationMinutes: number; audioPath?: string; fluencyMetrics?: FluencyMetrics | null }
type Phase = 'ready' | 'live' | 'feedback'

const MicIcon = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>
)

/* ── Ready screen ────────────────────────────────────────────────────────── */
function ReadyScreen({ onStart }: { onStart: () => void }) {
  const { t } = useLanguage()
  const isMobile = useIsMobile()
  return (
    <div style={{ flex: 1, background: 'radial-gradient(120% 80% at 50% -10%, var(--accent-soft) 0%, var(--bg) 55%)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 18px' : '40px 48px', overflowY: 'auto' }}>
      <div className="animate-fade-up" style={{ width: '100%', maxWidth: 1040 }}>

        {/* Top row — mic + big start button (spans full width) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, justifyContent: isMobile ? 'center' : 'flex-start' }}>
          <div style={{ flexShrink: 0, padding: 18, borderRadius: '50%', background: 'var(--accent-soft)', boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent), 0 0 60px -10px color-mix(in srgb, var(--accent) 40%, transparent)', display: 'flex' }}>
            <MicIcon size={38} color="var(--accent)" />
          </div>
          <button onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '16px 48px', borderRadius: 16, fontSize: 17, fontWeight: 700, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer', boxShadow: '0 12px 36px -10px color-mix(in srgb, var(--accent) 65%, transparent)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            <MicIcon size={18} color="var(--accent-fg)" /> {t('speak.start')}
          </button>
        </div>

        {/* Two columns — CSS grid so align-items:stretch works reliably */}
        <div style={isMobile
          ? { display: 'flex', flexDirection: 'column', gap: 28 }
          : { display: 'grid', gridTemplateColumns: '420px 1fr', gap: 44, alignItems: 'stretch' }
        }>
          {/* Left */}
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <h1 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 12px', color: 'var(--text)' }}>{t('speak.readyTitle')}</h1>
            <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 22px' }}>
              {t('speak.readyDesc')}
            </p>
            <div style={{ display: 'grid', gap: 8, textAlign: 'left' }}>
              {[t('speak.b1'), t('speak.b2'), t('speak.b3'), t('speak.b4')].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 15px', background: 'var(--bg-elev)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
                  <span style={{ fontSize: 14, color: 'var(--text)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — flex column so card stretches to grid cell height */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <SpeakingFocus fullHeight />
          </div>
        </div>

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
                {key === 'fluency' && result.fluency_metrics && (result.fluency_metrics.speech_rate_wpm != null || result.fluency_metrics.words > 0) && (
                  <p style={{ fontSize: 11, color: 'var(--accent)', margin: '5px 0 0', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {t('speak.fcMetrics', {
                      wpm: result.fluency_metrics.speech_rate_wpm != null ? String(Math.round(result.fluency_metrics.speech_rate_wpm)) : '—',
                      pauses: String(result.fluency_metrics.pause_count),
                      secs: (result.fluency_metrics.pause_total_ms / 1000).toFixed(0),
                    })}
                  </p>
                )}
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

/* ── Build grade turns from the running realtime transcript ─────────────────── */
interface TranscriptItem { role: 'examiner' | 'candidate'; text: string }
function buildTurns(items: TranscriptItem[], turnSegments: SpeechSegment[][] = []): GradeTurn[] {
  const out: GradeTurn[] = []
  let pendingQ = ''
  let answerIdx = 0
  for (const it of items) {
    if (it.role === 'examiner') pendingQ = it.text
    else if (it.text.trim()) {
      const answer = it.text.trim()
      // Per-turn fluency from this answer's VAD speech segments (client half of
      // the hybrid). `metricsFromSegments` returns word-count-only metrics when
      // no segments were captured for the turn.
      const words = answer.split(/\s+/).filter(Boolean).length
      const m = metricsFromSegments(turnSegments[answerIdx] ?? [], words)
      out.push({
        part: 1, question: pendingQ, answer,
        duration_ms: m.duration_ms || undefined,
        words: m.words || undefined,
        pause_count: m.pause_count,
        pause_total_ms: m.pause_total_ms,
        speech_rate_wpm: m.speech_rate_wpm,
      })
      pendingQ = ''
      answerIdx++
    }
  }
  // Spread parts across the conversation so stored turns aren't all "Part 1".
  const n = out.length
  out.forEach((tn, i) => { tn.part = i < n * 0.45 ? 1 : i < n * 0.65 ? 2 : 3 })
  return out
}

/* ── Live realtime exam (speech-to-speech, fully hands-free) ─────────────────── */
type Status = 'connecting' | 'live' | 'ending'

function RealtimeExam({ sessionId, grading, error, onComplete, onExit }: {
  sessionId: string; grading: boolean; error: string
  onComplete: (p: CompletePayload) => void
  onExit: () => void
}) {
  const { t } = useLanguage()
  const isMobile = useIsMobile()

  const [status, setStatus] = useState<Status>('connecting')
  const [assistantSpeaking, setAssistantSpeaking] = useState(false)
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [lastExaminer, setLastExaminer] = useState('')
  const [lastUser, setLastUser] = useState('')
  const [answered, setAnswered] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [connError, setConnError] = useState('')
  const [part, setPart] = useState<Part>(1)
  const [partBanner, setPartBanner] = useState<Part | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const userChunksRef = useRef<Blob[]>([])
  const transcriptRef = useRef<TranscriptItem[]>([])
  const userIdRef = useRef<string | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const localAnalyserRef = useRef<AnalyserNode | null>(null)
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null)
  const orbReactiveRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const startedRef = useRef(false)
  // Speech-segment capture: record only the candidate's speech so the acoustic
  // grade isn't padded with silence from the examiner's turns.
  const recStartRef = useRef(0)
  const segmentsRef = useRef<SpeechSegment[]>([])
  // Per-turn slices of segmentsRef: when an answer's transcript lands, the
  // segments captured since the previous answer belong to it. Index aligns with
  // the candidate answers buildTurns produces, so per-turn fluency lines up.
  const turnSegmentsRef = useRef<SpeechSegment[][]>([])
  const assignedSegRef = useRef(0)
  // Heuristic part tracking (the realtime model isn't asked to announce parts).
  const partRef = useRef<Part>(1)
  const answeredRef = useRef(0)
  const p2AnswersRef = useRef(0)

  const cleanup = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    try { dcRef.current?.close() } catch {}
    try { pcRef.current?.getSenders().forEach(s => s.track?.stop()) } catch {}
    try { pcRef.current?.close() } catch {}
    micStreamRef.current?.getTracks().forEach(tr => tr.stop())
    audioCtxRef.current?.close().catch(() => {})
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    pcRef.current = null; dcRef.current = null; micStreamRef.current = null
    localAnalyserRef.current = null; remoteAnalyserRef.current = null; audioCtxRef.current = null
  }, [])

  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const C = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (C) audioCtxRef.current = new C()
    }
    return audioCtxRef.current
  }, [])

  const handleEvent = useCallback((raw: string) => {
    let msg: { type?: string; transcript?: string; delta?: string }
    try { msg = JSON.parse(raw) } catch { return }
    const now = () => (recStartRef.current ? performance.now() - recStartRef.current : 0)
    switch (msg.type) {
      case 'input_audio_buffer.speech_started':
        setUserSpeaking(true)
        segmentsRef.current.push({ start: now(), end: -1 }) // open a speech segment
        break
      case 'input_audio_buffer.speech_stopped': {
        setUserSpeaking(false)
        const seg = segmentsRef.current[segmentsRef.current.length - 1]
        if (seg && seg.end === -1) seg.end = now() // close it
        break
      }
      case 'response.created':
      case 'response.output_audio.delta':
      case 'response.audio.delta':
        setAssistantSpeaking(true); break
      case 'response.output_audio.done':
      case 'response.audio.done':
      case 'response.done':
        setAssistantSpeaking(false); break
      case 'conversation.item.input_audio_transcription.completed':
        if (msg.transcript?.trim()) {
          transcriptRef.current.push({ role: 'candidate', text: msg.transcript.trim() })
          setLastUser(msg.transcript.trim())
          // Claim the closed speech segments captured since the last answer for
          // this turn, so per-turn fluency is computed from the right speech.
          const closed = segmentsRef.current.slice(assignedSegRef.current).filter(s => s.end > s.start)
          turnSegmentsRef.current.push(closed)
          assignedSegRef.current = segmentsRef.current.length
          answeredRef.current += 1
          setAnswered(answeredRef.current)
          // Part progression: long turn done -> discussion; safety bump if the
          // Part 2 cue was never detected.
          let np = partRef.current
          if (np === 2) { p2AnswersRef.current += 1; if (p2AnswersRef.current >= 2) np = 3 }
          if (np === 1 && answeredRef.current >= 6) np = 2
          if (np !== partRef.current) { partRef.current = np; setPart(np) }
        }
        break
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        if (msg.transcript?.trim()) {
          const text = msg.transcript.trim()
          transcriptRef.current.push({ role: 'examiner', text })
          setLastExaminer(text)
          // The long-turn cue marks the start of Part 2.
          if (partRef.current === 1 && /i'?d like you to (talk|speak) about|talk about .{0,40}\bfor (a|one|two|1|2)\b|for (one|two|1|2)\s*(to\s*(one|two|1|2)\s*)?minutes?|a minute or two/i.test(text)) {
            partRef.current = 2; p2AnswersRef.current = 0; setPart(2)
          }
        }
        break
    }
  }, [])

  // Connect once on mount.
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    let cancelled = false

    ;(async () => {
      try {
        const { data } = await createClient().auth.getUser()
        userIdRef.current = data.user?.id ?? null
      } catch { /* audio upload will simply be skipped */ }

      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null)
        if (!mic) { if (!cancelled) setConnError(t('speak.errDenied')); return }
        if (cancelled) { mic.getTracks().forEach(tr => tr.stop()); return }
        micStreamRef.current = mic

        // Record the candidate's mic for the final acoustic grade.
        try {
          const rec = new MediaRecorder(mic)
          userChunksRef.current = []
          segmentsRef.current = []
          turnSegmentsRef.current = []
          assignedSegRef.current = 0
          rec.ondataavailable = e => { if (e.data.size > 0) userChunksRef.current.push(e.data) }
          recStartRef.current = performance.now()
          rec.start()
          recorderRef.current = rec
        } catch { /* grade falls back to transcript-only */ }

        const ctx = ensureCtx()
        if (ctx) {
          if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
          const ls = ctx.createMediaStreamSource(mic)
          const la = ctx.createAnalyser(); la.fftSize = 256; la.smoothingTimeConstant = 0.6
          ls.connect(la); localAnalyserRef.current = la
        }

        const pc = new RTCPeerConnection()
        pcRef.current = pc
        pc.ontrack = e => {
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]
          const c = ensureCtx()
          if (c) {
            try {
              const rs = c.createMediaStreamSource(e.streams[0])
              const ra = c.createAnalyser(); ra.fftSize = 256; ra.smoothingTimeConstant = 0.6
              rs.connect(ra); remoteAnalyserRef.current = ra
            } catch { /* analyser optional */ }
          }
        }
        pc.addTrack(mic.getTracks()[0], mic)

        const dc = pc.createDataChannel('oai-events')
        dcRef.current = dc
        dc.onmessage = ev => handleEvent(ev.data)
        dc.onopen = () => { try { dc.send(JSON.stringify({ type: 'response.create' })) } catch {} } // examiner greets first

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        // Our server completes the SDP handshake with OpenAI (keeps the key off
        // the client and avoids any browser cross-origin call to OpenAI).
        const resp = await fetch('/api/ai/realtime/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp ?? '',
        })
        if (redirectToPaywallOn403(resp)) { cleanup(); return }
        if (!resp.ok) {
          let m = t('speak.realtimeError')
          try { const j = await resp.clone().json(); if (j?.error) m = j.error } catch {}
          if (!cancelled) setConnError(m)
          cleanup(); return
        }
        const answer = await resp.text()
        await pc.setRemoteDescription({ type: 'answer', sdp: answer })
        if (!cancelled) setStatus('live')
      } catch { if (!cancelled) setConnError(t('speak.realtimeError')) }
    })()

    return () => { cancelled = true; cleanup() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // session timer
  useEffect(() => { const id = setInterval(() => setElapsed(s => s + 1), 1000); return () => clearInterval(id) }, [])

  // Flash a transition banner when we move into Part 2 / Part 3.
  useEffect(() => {
    if (part === 1) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPartBanner(part)
    const id = setTimeout(() => setPartBanner(null), 2600)
    return () => clearTimeout(id)
  }, [part])

  // Orb reactivity: scale/brighten from whoever is talking (mic or examiner).
  useEffect(() => {
    if (status !== 'live') return
    const orb = orbReactiveRef.current
    if (!orb) return
    let smooth = 0
    const lbuf = new Uint8Array(256)
    const rbuf = new Uint8Array(256)
    const rms = (an: AnalyserNode | null, buf: Uint8Array<ArrayBuffer>) => {
      if (!an) return 0
      an.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; sum += x * x }
      return Math.sqrt(sum / buf.length) * 3.4
    }
    const draw = () => {
      const level = Math.min(1, Math.max(rms(localAnalyserRef.current, lbuf), rms(remoteAnalyserRef.current, rbuf)))
      smooth += (level - smooth) * 0.25
      orb.style.transform = `scale(${(1 + smooth * 0.4).toFixed(3)})`
      orb.style.filter = `brightness(${(1 + smooth * 0.5).toFixed(2)})`
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }; if (orb) { orb.style.transform = ''; orb.style.filter = '' } }
  }, [status])

  async function endTest() {
    if (status === 'ending') return
    setStatus('ending')

    // Close any speech segment still open at the moment we end.
    const open = segmentsRef.current[segmentsRef.current.length - 1]
    if (open && open.end === -1) open.end = recStartRef.current ? performance.now() - recStartRef.current : 0

    const rec = recorderRef.current
    const blob: Blob | null = await new Promise(resolve => {
      if (!rec || rec.state === 'inactive') return resolve(null)
      rec.onstop = () => resolve(new Blob(userChunksRef.current, { type: rec.mimeType || 'audio/webm' }))
      try { rec.stop() } catch { resolve(null) }
    })
    const segments = segmentsRef.current.filter(s => s.end > s.start)
    const turnSegments = turnSegmentsRef.current
    cleanup()

    let audioPath: string | undefined
    let fluencyMetrics: FluencyMetrics | null = null
    const uid = userIdRef.current
    if (blob && blob.size > 0) {
      // Two derivations from the same recording, in parallel — both use only the
      // candidate's speech segments (16 kHz, last ~3 min), not the silence while
      // the examiner talks:
      //  • a padded clip uploaded for the audio model's pronunciation grade.
      //  • a tightly-trimmed clip sent to Whisper for word-level fluency metrics.
      //    The small padding keeps segment joins under the pause threshold so
      //    they aren't miscounted as hesitations.
      const [storeRes, metricsRes] = await Promise.allSettled([
        uid
          ? (async () => {
              const wav = await blobToWavSegments(blob, segments, { targetSampleRate: 16000, padMs: 350, maxSeconds: 180 })
              const path = `${uid}/${sessionId}/full.wav`
              const { error: upErr } = await createClient().storage.from('speaking-audio').upload(path, wav, { contentType: 'audio/wav', upsert: true })
              if (upErr) throw upErr
              return path
            })()
          : Promise.resolve<string | undefined>(undefined),
        (async () => {
          const wav = await blobToWavSegments(blob, segments, { targetSampleRate: 16000, padMs: 150, maxSeconds: 180 })
          const fd = new FormData()
          fd.append('audio', new File([wav], 'speech.wav', { type: 'audio/wav' }))
          const res = await fetch('/api/ai/transcribe', { method: 'POST', body: fd })
          if (!res.ok) throw new Error('transcribe failed')
          const d = await res.json()
          return {
            duration_ms: d.duration_ms ?? 0,
            words: d.words ?? 0,
            pause_count: d.pause_count ?? 0,
            pause_total_ms: d.pause_total_ms ?? 0,
            speech_rate_wpm: d.speech_rate_wpm ?? null,
          } as FluencyMetrics
        })(),
      ])
      if (storeRes.status === 'fulfilled' && storeRes.value) audioPath = storeRes.value
      if (metricsRes.status === 'fulfilled') fluencyMetrics = metricsRes.value
    }

    onComplete({ turns: buildTurns(transcriptRef.current, turnSegments), sessionId, durationMinutes: Math.max(1, Math.round(elapsed / 60)), audioPath, fluencyMetrics })
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const orbSize = isMobile ? 168 : 212

  const orbMode: 'think' | 'speak' | 'rec' | 'idle' =
    grading || status === 'connecting' || status === 'ending' ? 'think'
    : assistantSpeaking ? 'speak'
    : userSpeaking ? 'rec'
    : 'idle'

  const caption =
    grading ? t('speak.scoring')
    : status === 'connecting' ? t('speak.connecting')
    : status === 'ending' ? t('speak.finishing')
    : assistantSpeaking ? t('speak.orbSpeaking')
    : userSpeaking ? t('speak.youSpeak')
    : t('speak.goAhead')

  const ring = (delay: string) => (
    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 30%, transparent)', animation: 'pulse-ring 2.2s ease-out infinite', animationDelay: delay, pointerEvents: 'none' }}/>
  )

  const partLabel = (p: Part) => t(p === 1 ? 'speak.partIntro' : p === 2 ? 'speak.partLong' : 'speak.partDisc')
  const partPct = part === 1 ? 33 : part === 2 ? 66 : 100

  return (
    <div style={{ position: 'relative', flex: 1, background: 'radial-gradient(120% 70% at 50% -5%, var(--accent-soft) 0%, var(--bg) 55%)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      {/* Part transition banner */}
      {partBanner && (
        <div key={partBanner} className="animate-fade-up" style={{ position: 'absolute', top: isMobile ? 60 : 70, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 999, background: 'var(--accent)', color: 'var(--accent-fg)', boxShadow: '0 14px 40px -10px color-mix(in srgb, var(--accent) 60%, transparent)', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.02em' }}>{t('speak.part')} {partBanner}</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.6 }}/>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{partLabel(partBanner)}</span>
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay hidden />

      {/* Header */}
      <header style={{ padding: isMobile ? '12px 16px' : '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'live' ? 'var(--accent)' : 'var(--text-3)', boxShadow: status === 'live' ? '0 0 0 4px color-mix(in srgb, var(--accent) 20%, transparent)' : 'none' }}/>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{t('speak.examiner')}</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>· Sarah</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13.5, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{mm}:{ss}</span>
          <button onClick={onExit} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>{t('speak.endTest')}</button>
        </div>
      </header>

      {/* Part indicator */}
      <div style={{ padding: isMobile ? '12px 16px 0' : '14px 24px 0', flexShrink: 0 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>
            <span style={{ padding: '2px 9px', borderRadius: 999, background: 'var(--accent-soft)', border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' }}>{t('speak.part')} {part}</span>
            <span style={{ transition: 'opacity .3s' }}>{partLabel(part)}</span>
          </div>
          <div style={{ height: 3, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${partPct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width .6s cubic-bezier(.2,.7,.2,1)' }}/>
          </div>
        </div>
      </div>

      {/* Body — the orb */}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '20px 16px 24px' : '28px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', width: orbSize, height: orbSize, flexShrink: 0 }}>
            {(orbMode === 'speak' || orbMode === 'rec') && <>{ring('0s')}{ring('1.1s')}</>}
            <div
              ref={orbReactiveRef}
              className={orbMode === 'idle' ? 'orb-breathe' : ''}
              style={{
                position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
                background: 'radial-gradient(circle at 32% 26%, color-mix(in srgb, var(--accent) 80%, white) 0%, var(--accent) 46%, color-mix(in srgb, var(--accent) 55%, black) 100%)',
                boxShadow: '0 24px 70px -14px color-mix(in srgb, var(--accent) 60%, transparent), inset 0 0 50px -10px color-mix(in srgb, white 45%, transparent)',
                transition: 'filter .18s ease',
              }}
            >
              <div className="orb-blob" style={{ position: 'absolute', width: '72%', height: '72%', top: '6%', left: '10%', borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, white 55%, transparent), transparent 70%)', filter: 'blur(7px)' }}/>
              <div className="orb-blob" style={{ position: 'absolute', width: '56%', height: '56%', bottom: '5%', right: '7%', borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 70%, black), transparent 70%)', filter: 'blur(9px)', animationDelay: '2.3s' }}/>
              {orbMode === 'think' && (
                <div className="orb-spin" style={{ position: 'absolute', inset: -1, borderRadius: '50%', background: 'conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, white 75%, transparent) 55deg, transparent 120deg)', WebkitMaskImage: 'radial-gradient(transparent 63%, black 65%)', maskImage: 'radial-gradient(transparent 63%, black 65%)' }}/>
              )}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MicIcon size={isMobile ? 34 : 40} color="color-mix(in srgb, white 92%, transparent)" />
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', minHeight: 22 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: orbMode === 'speak' ? 'var(--accent)' : 'var(--text-2)' }}>{caption}</span>
          </div>

          {/* Live transcript peek */}
          {(lastExaminer || lastUser) && status === 'live' && (
            <div style={{ width: '100%', maxWidth: 520, display: 'grid', gap: 10, marginTop: 4 }}>
              {lastExaminer && (
                <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>{t('speak.examinerLabel')}</div>
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--text)' }}>{lastExaminer}</p>
                </div>
              )}
              {lastUser && (
                <div style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>{t('speak.yourAnswer')}</div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-2)' }}>{lastUser}</p>
                </div>
              )}
            </div>
          )}

          {(connError || error) && <div style={{ fontSize: 13, color: 'var(--danger)', textAlign: 'center' }}>{connError || error}</div>}
        </div>
      </div>

      {/* Dock — finish & score */}
      <div style={{ padding: isMobile ? '12px 16px 18px' : '14px 24px 18px', paddingBottom: isMobile ? 'calc(14px + env(safe-area-inset-bottom))' : 18, borderTop: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg-soft) 70%, transparent)', backdropFilter: 'blur(8px)', flexShrink: 0 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <button
            onClick={endTest}
            disabled={status !== 'live' || grading || answered === 0}
            style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: 14.5, fontWeight: 700, background: status !== 'live' || grading || answered === 0 ? 'var(--bg-soft)' : 'var(--accent)', color: status !== 'live' || grading || answered === 0 ? 'var(--text-3)' : 'var(--accent-fg)', border: status !== 'live' || grading || answered === 0 ? '1px solid var(--border)' : 'none', cursor: status !== 'live' || grading || answered === 0 ? 'not-allowed' : 'pointer' }}>
            {grading ? t('speak.scoring') : status === 'ending' ? t('speak.finishing') : t('speak.endScore')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */
function newSessionId(): string {
  try { return crypto.randomUUID() } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}` }
}

// Embeddable Speaking exam. Standalone route renders it via the wrapper below;
// the mock renders it with `embedded` + `onComplete(band)` so it reports its band
// once graded (it still shows the feedback screen).
export function SpeakingExam({ embedded = false, onComplete }: { embedded?: boolean; onComplete?: (band: number) => void }) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [sessionId, setSessionId] = useState('')
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState<FeedbackResult | null>(null)
  const [error, setError] = useState('')

  async function handleComplete({ turns, sessionId: sid, durationMinutes, audioPath, fluencyMetrics }: CompletePayload) {
    if (turns.length === 0) { setError(''); setPhase('ready'); return }
    setError(''); setResult(null); setGrading(true)
    try {
      const res = await fetch('/api/ai/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turns, sessionId: sid, durationMinutes, audioPath, fluencyMetrics, topic: 'Live speaking test' }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Failed to score the test.')
      else {
        setResult(data); setPhase('feedback')
        if (embedded) onComplete?.(Number(data.band_score))
      }
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
    <RealtimeExam
      key={sessionId}
      sessionId={sessionId}
      grading={grading}
      error={error}
      onComplete={handleComplete}
      onExit={() => { setError(''); setPhase('ready') }}
    />
  )
}

// Standalone /dashboard/speaking route.
export default function SpeakingPage() {
  return <SpeakingExam />
}
