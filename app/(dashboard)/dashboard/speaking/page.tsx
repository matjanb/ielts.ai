'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'

const SAMPLE_TOPICS: Record<1 | 2 | 3, string[]> = {
  1: ['Tell me about your hometown.', 'Do you enjoy cooking? Why or why not?', 'What kind of music do you like?'],
  2: [
    'Describe a book you have read recently. You should say: what the book was about, why you chose to read it, what you liked or disliked about it, and explain what effect it had on you.',
    'Describe a journey that you remember well. You should say: where you went, how you travelled, who you were with, and explain why you remember it so well.',
  ],
  3: ['How has technology changed the way people communicate in your country?', 'Do you think environmental problems are best solved by governments or individuals?'],
}

interface CriterionResult { band: number; evidence: string }
interface FeedbackResult {
  band_score: number
  fluency_score: number
  lexical_score: number
  grammar_score: number
  pronunciation_score: number
  pronunciation_notes: string
  feedback: {
    overview: string
    strengths: string[]
    improvements: string[]
    next_band_tip?: string
    criteria?: { fluency: CriterionResult; lexical: CriterionResult; grammar: CriterionResult; pronunciation: CriterionResult }
  }
}

type Phase = 'ready' | 'live' | 'feedback'

/* ── Ready screen (dark) ─────────────────────────────────────────────────── */
function ReadyScreen({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ flex: 1, background: '#0e1011', color: '#f5f5f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="animate-fade-up" style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: 24, borderRadius: '50%', background: '#1a2a23', marginBottom: 24 }}>
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#3aa278" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 14px', color: '#f5f5f3' }}>Ready when you are</h1>
        <p style={{ fontSize: 15, color: '#a8a9a7', lineHeight: 1.55, margin: '0 0 32px' }}>
          Find a quiet spot. Record your answer (or type it) and receive instant AI feedback across the official band descriptors.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 32, textAlign: 'left' }}>
          {[
            'Part 1 — Introduction & interview (4–5 min)',
            'Part 2 — Long turn on a cue card (3–4 min)',
            'Part 3 — Discussion (4–5 min)',
            'Detailed AI feedback at the end',
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', background: '#16191b', borderRadius: 10 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#3aa278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
              <span style={{ fontSize: 13.5, color: '#f0f0ee' }}>{s}</span>
            </div>
          ))}
        </div>
        <button onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700, background: '#3aa278', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>
          Begin Speaking test
        </button>
      </div>
    </div>
  )
}

/* ── Feedback screen ─────────────────────────────────────────────────────── */
const CRIT_META = [
  { key: 'fluency' as const,       label: 'Fluency & coherence' },
  { key: 'lexical' as const,       label: 'Lexical resource' },
  { key: 'grammar' as const,       label: 'Grammatical range' },
  { key: 'pronunciation' as const, label: 'Pronunciation' },
]

function FeedbackScreen({ result, onBack }: { result: FeedbackResult; onBack: () => void }) {
  const scoreFor = { fluency: result.fluency_score, lexical: result.lexical_score, grammar: result.grammar_score, pronunciation: result.pronunciation_score }
  const fb = result.feedback

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 820, margin: '0 auto' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', marginBottom: 20 }}>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 19l-7-7 7-7"/></svg>
        Back to Speaking
      </button>

      <h1 style={{ fontSize: 34, letterSpacing: '-0.02em', margin: '0 0 6px', fontWeight: 700, color: 'var(--text)' }}>Speaking session complete</h1>
      <p style={{ color: 'var(--text-2)', margin: '0 0 28px', fontSize: 15 }}>Assessed against the official band descriptors.</p>

      {/* Overall band + criteria with evidence */}
      <div className="card" style={{ padding: 32, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'start', marginBottom: 16 }}>
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 8 }}>OVERALL BAND</div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 96, lineHeight: 1, color: 'var(--accent)', fontWeight: 500 }}>
            {result.band_score.toFixed(1)}
          </div>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {CRIT_META.map(({ key, label }) => {
            const v = scoreFor[key]
            const evidence = fb.criteria?.[key]?.evidence
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{v.toFixed(1)}</span>
                </div>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                  <div style={{ width: `${(v / 9) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }}/>
                </div>
                {evidence && <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '5px 0 0', lineHeight: 1.5 }}>{evidence}</p>}
                {key === 'pronunciation' && result.pronunciation_notes && (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '5px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>{result.pronunciation_notes}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Overview */}
      {fb.overview && (
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'var(--text)' }}>{fb.overview}</p>
        </div>
      )}

      {/* Strengths + improvements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {fb.strengths?.length > 0 && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 12 }}>STRENGTHS</div>
            {fb.strengths.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', marginBottom: 8 }}>
                <span style={{ color: 'var(--accent)' }}>✓</span><span>{s}</span>
              </div>
            ))}
          </div>
        )}
        {fb.improvements?.length > 0 && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--warn)', marginBottom: 12 }}>WHAT TO IMPROVE</div>
            {fb.improvements.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', marginBottom: 8 }}>
                <span style={{ color: 'var(--warn)' }}>→</span><span>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next band tip */}
      {fb.next_band_tip && (
        <div className="card" style={{ padding: 24, background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 8 }}>TO REACH THE NEXT BAND</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'var(--text)' }}>{fb.next_band_tip}</p>
        </div>
      )}
    </div>
  )
}

/* ── Live exam (always dark) ─────────────────────────────────────────────── */
type RecState = 'idle' | 'recording' | 'transcribing'

function LiveExam({ part, setPart, topic, setTopic, transcript, setTranscript, loading, error, onSubmit, onEndTest }: {
  part: 1 | 2 | 3; setPart: (p: 1 | 2 | 3) => void
  topic: string; setTopic: (t: string) => void
  transcript: string; setTranscript: (updater: string | ((prev: string) => string)) => void
  loading: boolean; error: string; onSubmit: () => void; onEndTest: () => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const [recState, setRecState] = useState<RecState>('idle')
  const [recSeconds, setRecSeconds] = useState(0)
  const [micError, setMicError] = useState('')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // recording timer (recSeconds is reset in startRecording)
  useEffect(() => {
    if (recState !== 'recording') return
    const id = setInterval(() => setRecSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [recState])

  // stop tracks on unmount
  useEffect(() => () => { mediaRef.current?.stream?.getTracks().forEach(t => t.stop()) }, [])

  const startRecording = useCallback(async () => {
    setMicError('')
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicError('Recording is not supported in this browser — type your answer instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      setRecSeconds(0)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size === 0) { setRecState('idle'); return }
        setRecState('transcribing')
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'speech.webm')
          const res = await fetch('/api/ai/transcribe', { method: 'POST', body: fd })
          const data = await res.json()
          if (res.ok && data.transcript) {
            setTranscript(prev => (prev.trim() ? prev.trim() + ' ' : '') + data.transcript)
          } else {
            setMicError(data.error ?? 'Could not transcribe — please try again or type your answer.')
          }
        } catch {
          setMicError('Could not reach the transcription service.')
        } finally {
          setRecState('idle')
        }
      }
      mr.start()
      mediaRef.current = mr
      setRecState('recording')
    } catch {
      setMicError('Microphone access denied. Type your answer instead.')
    }
  }, [setTranscript])

  const stopRecording = useCallback(() => { mediaRef.current?.stop() }, [])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0
  const busy = loading || recState === 'transcribing'

  return (
    <div style={{ flex: 1, background: '#0e1011', color: '#f5f5f3', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2c2e', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3aa278', boxShadow: '0 0 0 4px rgba(58,162,120,0.25)' }}/>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3aa278' }}>LIVE · AI examiner Sarah</span>
          </div>
          <span style={{ fontSize: 13, color: '#888' }}>Part {part} of 3</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: '#ccc', fontFamily: 'var(--font-mono)' }}>{mm}:{ss}</span>
          <button onClick={onEndTest} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #444', borderRadius: 8, fontSize: 12, color: '#ccc', cursor: 'pointer' }}>End test</button>
        </div>
      </header>

      {/* Part selector */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #2a2c2e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexShrink: 0 }}>
        {([1, 2, 3] as const).map(p => (
          <button key={p} onClick={() => setPart(p)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 999,
            background: part === p ? '#1a2a23' : 'transparent',
            color: part === p ? '#3aa278' : '#666',
            fontSize: 13, fontWeight: 600,
            border: part === p ? '1px solid #3aa278' : '1px solid transparent', cursor: 'pointer',
          }}>
            {p === 1 ? 'Introduction' : p === 2 ? 'Cue card' : 'Discussion'}
          </button>
        ))}
      </div>

      {/* Topic selector */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid #2a2c2e', flexShrink: 0 }}>
        <select value={topic} onChange={e => setTopic(e.target.value)} style={{
          width: '100%', padding: '8px 12px', background: '#16191b',
          border: '1px solid #2a2c2e', borderRadius: 8, color: '#f0f0ee',
          fontSize: 13, cursor: 'pointer',
        }}>
          {SAMPLE_TOPICS[part].map((tp, i) => (
            <option key={i} value={tp}>{tp.length > 90 ? tp.slice(0, 90) + '…' : tp}</option>
          ))}
        </select>
      </div>

      {/* Examiner question bubble */}
      <div style={{ padding: '20px 24px', flexShrink: 0 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a2a23', color: '#3aa278', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #3aa278' }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#3aa278" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/>
              </svg>
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 14, background: '#16191b', fontSize: 14.5, lineHeight: 1.55, border: '1px solid #2a2c2e', flex: 1 }}>
              {part === 2
                ? `Now I'd like you to talk about "${topic}". You'll have one minute to prepare, then 1–2 minutes to speak.`
                : topic}
            </div>
          </div>
        </div>
      </div>

      {/* Transcript area */}
      <div style={{ flex: 1, padding: '0 24px', overflow: 'auto' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: '#666', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
            YOUR RESPONSE — {wordCount} words
          </div>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="Record your answer with the mic, or type it here…"
            style={{
              width: '100%', minHeight: 120, padding: '14px 16px',
              background: '#0e1011', border: '1px solid #2a2c2e', borderRadius: 14,
              color: '#f0f0ee', fontSize: 14, lineHeight: 1.6, resize: 'vertical', outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#3aa278')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a2c2e')}
          />
          {(error || micError) && <div style={{ marginTop: 8, fontSize: 13, color: '#d97a64' }}>{error || micError}</div>}
        </div>
      </div>

      {/* Input bar */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #2a2c2e', background: '#16191b', flexShrink: 0 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={recState === 'recording' ? stopRecording : startRecording}
            disabled={recState === 'transcribing'}
            aria-label={recState === 'recording' ? 'Stop recording' : 'Start recording'}
            style={{
              width: 52, height: 52, borderRadius: 26, flexShrink: 0,
              background: recState === 'recording' ? '#d97a64' : recState === 'transcribing' ? '#26272a' : '#3aa278',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: recState === 'recording' ? '0 0 0 8px rgba(217,122,100,0.2)' : 'none',
              border: 'none', cursor: recState === 'transcribing' ? 'default' : 'pointer', transition: 'all .2s',
            }}>
            {recState === 'transcribing'
              ? <Loader2 size={20} color="#888" className="animate-spin"/>
              : recState === 'recording'
                ? <svg width={18} height={18} viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                : <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>}
          </button>

          {recState === 'recording' ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 36, flex: 1 }}>
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, background: '#3aa278', borderRadius: 1, animation: `eq 0.9s ease-in-out ${i * 0.04}s infinite alternate`, height: 8 }}/>
                ))}
              </div>
              <span style={{ fontSize: 13, color: '#3aa278', fontFamily: 'var(--font-mono)' }}>
                {String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}
              </span>
              <button onClick={stopRecording} style={{ padding: '6px 14px', background: '#d97a64', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Stop</button>
            </div>
          ) : (
            <button onClick={onSubmit} disabled={busy || wordCount < 20} style={{
              flex: 1, padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: busy || wordCount < 20 ? '#26272a' : '#3aa278',
              color: busy || wordCount < 20 ? '#666' : '#fff',
              border: 'none', cursor: busy || wordCount < 20 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {recState === 'transcribing' ? <><Loader2 size={15} className="animate-spin"/> Transcribing…</>
                : loading ? <><Loader2 size={15} className="animate-spin"/> Analysing…</>
                : 'Submit for AI feedback'}
            </button>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#666', marginTop: 8 }}>
          Tap the mic to record · or type your response · Minimum 20 words
        </div>
      </div>

      <style>{`@keyframes eq { from { height: 6px; opacity: .5 } to { height: 30px; opacity: 1 } }`}</style>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function SpeakingPage() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [part, setPart] = useState<1 | 2 | 3>(1)
  const [topic, setTopic] = useState(SAMPLE_TOPICS[1][0])
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FeedbackResult | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit() {
    const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0
    if (wordCount < 20) return
    setError(''); setResult(null); setLoading(true)
    try {
      const res = await fetch('/api/ai/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, part, topic }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to get feedback.') }
      else { setResult(data); setPhase('feedback') }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  // Switching part resets the topic AND clears the previous answer.
  function changePart(p: 1 | 2 | 3) {
    setPart(p); setTopic(SAMPLE_TOPICS[p][0]); setTranscript(''); setError('')
  }

  if (phase === 'ready') return <ReadyScreen onStart={() => { setTranscript(''); setError(''); setPhase('live') }} />
  if (phase === 'feedback' && result) return <FeedbackScreen result={result} onBack={() => { setPhase('ready'); setTranscript(''); setResult(null) }} />

  return (
    <LiveExam
      part={part} setPart={changePart}
      topic={topic} setTopic={setTopic}
      transcript={transcript} setTranscript={setTranscript}
      loading={loading} error={error}
      onSubmit={handleSubmit}
      onEndTest={() => { setPhase('ready'); setTranscript(''); setError('') }}
    />
  )
}
