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
const PART_LABELS: Record<1 | 2 | 3, string> = { 1: 'Introduction', 2: 'Cue card', 3: 'Discussion' }

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

const MicIcon = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>
)

/* ── Ready screen ────────────────────────────────────────────────────────── */
function ReadyScreen({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ flex: 1, background: 'radial-gradient(120% 80% at 50% -10%, #16221c 0%, #0e1011 55%)', color: '#f5f5f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="animate-fade-up" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: 26, borderRadius: '50%', background: '#1a2a23', marginBottom: 26, boxShadow: '0 0 0 1px rgba(58,162,120,0.25), 0 0 60px -10px rgba(58,162,120,0.4)' }}>
          <MicIcon size={46} color="#3aa278" />
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 14px', color: '#f5f5f3' }}>Ready when you are</h1>
        <p style={{ fontSize: 15, color: '#a8a9a7', lineHeight: 1.6, margin: '0 0 34px' }}>
          Find a quiet spot. Record your answer — or type it — and get instant examiner feedback across the official band descriptors.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 34, textAlign: 'left' }}>
          {['Part 1 — Introduction & interview', 'Part 2 — Long turn on a cue card', 'Part 3 — Two-way discussion', 'Detailed AI feedback at the end'].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 16px', background: '#16191b', borderRadius: 12, border: '1px solid #21241f' }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#3aa278" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
              <span style={{ fontSize: 14, color: '#f0f0ee' }}>{s}</span>
            </div>
          ))}
        </div>
        <button onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 34px', borderRadius: 14, fontSize: 15, fontWeight: 700, background: '#3aa278', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px -10px rgba(58,162,120,0.6)' }}>
          <MicIcon size={17} color="#fff" /> Begin Speaking test
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

function BandRing({ band }: { band: number }) {
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
        <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-3)', marginTop: 2 }}>BAND</div>
      </div>
    </div>
  )
}

function FeedbackScreen({ result, onBack }: { result: FeedbackResult; onBack: () => void }) {
  const scoreFor = { fluency: result.fluency_score, lexical: result.lexical_score, grammar: result.grammar_score, pronunciation: result.pronunciation_score }
  const fb = result.feedback

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 860, margin: '0 auto' }} className="animate-fade-up">
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', marginBottom: 22 }}>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 19l-7-7 7-7"/></svg>
        Back to Speaking
      </button>

      <h1 style={{ fontSize: 32, letterSpacing: '-0.025em', margin: '0 0 4px', fontWeight: 700, color: 'var(--text)' }}>Your result</h1>
      <p style={{ color: 'var(--text-2)', margin: '0 0 24px', fontSize: 15 }}>Assessed against the official IELTS band descriptors.</p>

      {/* Hero: band ring + criteria with evidence */}
      <div className="card" style={{ padding: 28, display: 'grid', gridTemplateColumns: '148px 1fr', gap: 36, alignItems: 'center', marginBottom: 16 }}>
        <BandRing band={result.band_score} />
        <div style={{ display: 'grid', gap: 16 }}>
          {CRIT_META.map(({ key, label }) => {
            const v = scoreFor[key]
            const evidence = fb.criteria?.[key]?.evidence
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
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

      {fb.overview && (
        <div className="card" style={{ padding: 22, marginBottom: 16 }}>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, margin: 0, color: 'var(--text)' }}>{fb.overview}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {fb.strengths?.length > 0 && (
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 12 }}>STRENGTHS</div>
            {fb.strengths.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', marginBottom: 9 }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✓</span><span>{s}</span>
              </div>
            ))}
          </div>
        )}
        {fb.improvements?.length > 0 && (
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--warn)', marginBottom: 12 }}>WHAT TO IMPROVE</div>
            {fb.improvements.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)', marginBottom: 9 }}>
                <span style={{ color: 'var(--warn)', flexShrink: 0 }}>→</span><span>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {fb.next_band_tip && (
        <div className="card" style={{ padding: 22, background: 'var(--accent-soft)', borderColor: 'transparent', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/></svg>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 5 }}>TO REACH THE NEXT BAND</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'var(--text)' }}>{fb.next_band_tip}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Live exam ───────────────────────────────────────────────────────────── */
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

  useEffect(() => {
    if (recState !== 'recording') return
    const id = setInterval(() => setRecSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [recState])

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

  const nextQuestion = () => {
    const list = SAMPLE_TOPICS[part]
    const i = list.indexOf(topic)
    setTopic(list[(i + 1) % list.length])
    setTranscript('')
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0
  const busy = loading || recState === 'transcribing'

  return (
    <div style={{ flex: 1, background: '#0e1011', color: '#f5f5f3', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f2123', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3aa278', boxShadow: '0 0 0 4px rgba(58,162,120,0.2)' }}/>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#3aa278' }}>AI examiner</span>
          <span style={{ fontSize: 13, color: '#5f6163' }}>· Sarah</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13.5, color: '#bcbdbe', fontFamily: 'var(--font-mono)' }}>{mm}:{ss}</span>
          <button onClick={onEndTest} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #34373a', borderRadius: 8, fontSize: 12, color: '#bcbdbe', cursor: 'pointer' }}>End test</button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Segmented part control */}
          <div style={{ display: 'flex', gap: 4, padding: 4, background: '#16191b', borderRadius: 12, border: '1px solid #1f2123' }}>
            {([1, 2, 3] as const).map(p => (
              <button key={p} onClick={() => setPart(p)} style={{
                flex: 1, padding: '9px 10px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: part === p ? '#1a2a23' : 'transparent',
                color: part === p ? '#3aa278' : '#7d7f81',
                border: part === p ? '1px solid #2c4a3b' : '1px solid transparent', cursor: 'pointer', transition: 'all .15s',
              }}>
                <span style={{ opacity: 0.6, marginRight: 6 }}>P{p}</span>{PART_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Question card */}
          <div style={{ background: '#16191b', border: '1px solid #1f2123', borderRadius: 18, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a2a23', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2c4a3b' }}>
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#3aa278" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/></svg>
                </div>
                <span style={{ fontSize: 11, letterSpacing: '0.08em', color: '#6b6d6f', fontWeight: 600 }}>EXAMINER ASKS</span>
              </div>
              <button onClick={nextQuestion} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#8a8c8e', background: 'transparent', border: '1px solid #2a2c2e', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v6h6M20 20v-6h-6"/><path d="M20 9a8 8 0 0 0-14-3M4 15a8 8 0 0 0 14 3"/></svg>
                New question
              </button>
            </div>
            <p style={{ fontSize: 17, lineHeight: 1.5, color: '#f0f0ee', margin: 0, fontWeight: 500 }}>
              {part === 2 ? `Talk about: "${topic}"` : topic}
            </p>
            {part === 2 && (
              <p style={{ fontSize: 12.5, color: '#7d7f81', margin: '10px 0 0' }}>You have one minute to prepare, then speak for 1–2 minutes.</p>
            )}
          </div>

          {/* Response */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, color: '#6b6d6f', letterSpacing: '0.08em', fontWeight: 600 }}>YOUR RESPONSE</span>
              <span style={{ fontSize: 11, color: wordCount >= 20 ? '#3aa278' : '#6b6d6f', fontFamily: 'var(--font-mono)' }}>{wordCount} / 20 words</span>
            </div>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Tap the mic below to record — or type your answer here…"
              style={{
                width: '100%', minHeight: 150, padding: '16px 18px',
                background: '#131517', border: '1px solid #23262a', borderRadius: 16,
                color: '#f0f0ee', fontSize: 14.5, lineHeight: 1.65, resize: 'vertical', outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#3aa278')}
              onBlur={e => (e.currentTarget.style.borderColor = '#23262a')}
            />
            {(error || micError) && <div style={{ marginTop: 10, fontSize: 13, color: '#e0937f' }}>{error || micError}</div>}
          </div>
        </div>
      </div>

      {/* Dock */}
      <div style={{ padding: '18px 24px 22px', borderTop: '1px solid #1f2123', background: '#121315', flexShrink: 0 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {recState === 'recording' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={stopRecording} aria-label="Stop recording" style={{ width: 56, height: 56, borderRadius: 28, flexShrink: 0, background: '#d97a64', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 0 0 8px rgba(217,122,100,0.18)' }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>
              </button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3, height: 40 }}>
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, background: '#3aa278', borderRadius: 2, animation: `eq 0.9s ease-in-out ${i * 0.035}s infinite alternate`, height: 8 }}/>
                ))}
              </div>
              <span style={{ fontSize: 14, color: '#3aa278', fontFamily: 'var(--font-mono)', minWidth: 48, textAlign: 'right' }}>
                {String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={startRecording}
                disabled={recState === 'transcribing'}
                aria-label="Start recording"
                style={{ width: 56, height: 56, borderRadius: 28, flexShrink: 0, background: recState === 'transcribing' ? '#26272a' : '#3aa278', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: recState === 'transcribing' ? 'default' : 'pointer', boxShadow: recState === 'transcribing' ? 'none' : '0 8px 24px -8px rgba(58,162,120,0.7)', transition: 'all .2s' }}>
                {recState === 'transcribing' ? <Loader2 size={20} color="#888" className="animate-spin"/> : <MicIcon size={22} color="#fff" />}
              </button>
              <div style={{ flex: 1 }}>
                <button onClick={onSubmit} disabled={busy || wordCount < 20} style={{
                  width: '100%', padding: '15px', borderRadius: 14, fontSize: 14.5, fontWeight: 700,
                  background: busy || wordCount < 20 ? '#1f2123' : '#3aa278',
                  color: busy || wordCount < 20 ? '#5f6163' : '#fff',
                  border: 'none', cursor: busy || wordCount < 20 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .15s',
                }}>
                  {recState === 'transcribing' ? <><Loader2 size={15} className="animate-spin"/> Transcribing…</>
                    : loading ? <><Loader2 size={15} className="animate-spin"/> Analysing…</>
                    : wordCount < 20 ? 'Record or type at least 20 words'
                    : 'Submit for AI feedback'}
                </button>
              </div>
            </div>
          )}
          <div style={{ textAlign: 'center', fontSize: 11, color: '#5f6163', marginTop: 12 }}>
            {recState === 'recording' ? 'Speak naturally — tap stop when you finish' : 'Tap the mic to record · or type your answer'}
          </div>
        </div>
      </div>

      <style>{`@keyframes eq { from { height: 6px; opacity: .45 } to { height: 34px; opacity: 1 } }`}</style>
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
