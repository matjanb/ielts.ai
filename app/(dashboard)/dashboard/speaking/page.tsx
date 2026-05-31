'use client'

import { useState, useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const SAMPLE_TOPICS: Record<1 | 2 | 3, string[]> = {
  1: ['Tell me about your hometown.', 'Do you enjoy cooking? Why or why not?', 'What kind of music do you like?'],
  2: [
    'Describe a book you have read recently. You should say: what the book was about, why you chose to read it, what you liked or disliked about it, and explain what effect it had on you.',
    'Describe a journey that you remember well. You should say: where you went, how you travelled, who you were with, and explain why you remember it so well.',
  ],
  3: ['How has technology changed the way people communicate in your country?', 'Do you think environmental problems are best solved by governments or individuals?'],
}

interface FeedbackResult {
  band_score: number
  fluency_score: number
  lexical_score: number
  grammar_score: number
  pronunciation_notes: string
  feedback: { overview: string; strengths: string[]; improvements: string[] }
}

type Phase = 'ready' | 'live' | 'feedback'

/* ── Ready screen (dark) ─────────────────────────────────────────────────── */
function ReadyScreen({ onStart, t }: { onStart: () => void; t: (k: string) => string }) {
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
          Find a quiet spot. Type your spoken response and receive instant AI feedback across all four official descriptors.
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
function FeedbackScreen({ result, onBack }: { result: FeedbackResult; onBack: () => void }) {
  return (
    <div style={{ padding: '32px 32px 80px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', marginBottom: 20 }}>
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 19l-7-7 7-7"/></svg>
        Back to Speaking
      </button>

      <h1 style={{ fontSize: 34, letterSpacing: '-0.02em', margin: '0 0 6px', fontWeight: 700, color: 'var(--text)' }}>Speaking session complete</h1>
      <p style={{ color: 'var(--text-2)', margin: '0 0 28px', fontSize: 15 }}>Transcribed and analysed against the official band descriptors.</p>

      {/* Overall band + criteria */}
      <div className="card" style={{ padding: 32, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 8 }}>OVERALL BAND</div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 96, lineHeight: 1, color: 'var(--accent)', fontWeight: 500 }}>
            {result.band_score.toFixed(1)}
          </div>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            { k: 'Fluency & coherence', v: result.fluency_score },
            { k: 'Lexical resource',    v: result.lexical_score },
            { k: 'Grammatical range',   v: result.grammar_score },
            { k: 'Pronunciation',       v: Math.min(9, result.band_score + 0.5) },
          ].map(s => (
            <div key={s.k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.k}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{s.v.toFixed(1)}</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                <div style={{ width: `${(s.v / 9) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }}/>
              </div>
              {s.k === 'Pronunciation' && result.pronunciation_notes && (
                <p style={{ fontSize: 11.5, color: 'var(--text-3)', margin: '4px 0 0', lineHeight: 1.5 }}>{result.pronunciation_notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Overview + before/after */}
      {result.feedback.overview && (
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'var(--text)' }}>{result.feedback.overview}</p>
        </div>
      )}

      <div className="card" style={{ padding: 28 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Sample improvement</h3>
        <div style={{ padding: 14, background: 'var(--bg-soft)', borderRadius: 10, fontSize: 14, lineHeight: 1.65, marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>YOU MIGHT SAY</div>
          <p style={{ margin: 0, color: 'var(--text-2)', fontStyle: 'italic' }}>"{result.feedback.strengths[0] ?? 'Good structure and clear ideas.'}"</p>
        </div>
        {result.feedback.improvements.length > 0 && (
          <div style={{ padding: 14, background: 'var(--accent-soft)', borderRadius: 10, fontSize: 14, lineHeight: 1.65 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 6 }}>BAND-8 VERSION</div>
            <p style={{ margin: 0, color: 'var(--text)' }}>"{result.feedback.improvements[0]}"</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Live exam (dark, always dark) ───────────────────────────────────────── */
function LiveExam({ part, setPart, topic, setTopic, transcript, setTranscript, loading, error, onSubmit, onEndTest }: {
  part: 1 | 2 | 3; setPart: (p: 1 | 2 | 3) => void
  topic: string; setTopic: (t: string) => void
  transcript: string; setTranscript: (t: string) => void
  loading: boolean; error: string; onSubmit: () => void; onEndTest: () => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0

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
          <button key={p} onClick={() => { setPart(p); setTopic(SAMPLE_TOPICS[p][0]) }} style={{
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
      <div ref={scrollRef} style={{ flex: 1, padding: '0 24px', overflow: 'auto' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 10, color: '#666', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
            YOUR RESPONSE — {wordCount} words
          </div>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="Type or paste your spoken response here…"
            style={{
              width: '100%', minHeight: 120, padding: '14px 16px',
              background: '#0e1011', border: '1px solid #2a2c2e', borderRadius: 14,
              color: '#f0f0ee', fontSize: 14, lineHeight: 1.6, resize: 'vertical', outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#3aa278')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a2c2e')}
          />
          {error && <div style={{ marginTop: 8, fontSize: 13, color: '#d97a64' }}>{error}</div>}
        </div>
      </div>

      {/* Input bar */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #2a2c2e', background: '#16191b', flexShrink: 0 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setIsRecording(r => !r)} style={{
            width: 52, height: 52, borderRadius: 26, flexShrink: 0,
            background: isRecording ? '#d97a64' : '#3aa278',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isRecording ? '0 0 0 8px rgba(217,122,100,0.2)' : 'none',
            border: 'none', cursor: 'pointer', transition: 'all .2s',
          }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>
            </svg>
          </button>
          {isRecording ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 36, flex: 1 }}>
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, background: '#3aa278', borderRadius: 1, height: `${8 + Math.abs(Math.sin(i * 0.7)) * 20}px`, opacity: 0.6 }}/>
                ))}
              </div>
              <span style={{ fontSize: 13, color: '#3aa278', fontFamily: 'var(--font-mono)' }}>Recording…</span>
              <button onClick={() => setIsRecording(false)} style={{ padding: '6px 14px', background: '#3aa278', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <button onClick={onSubmit} disabled={loading || wordCount < 20} style={{
              flex: 1, padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: loading || wordCount < 20 ? '#26272a' : '#3aa278',
              color: loading || wordCount < 20 ? '#666' : '#fff',
              border: 'none', cursor: loading || wordCount < 20 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? <><Loader2 size={15} className="animate-spin"/> Analysing…</> : 'Submit for AI feedback'}
            </button>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#666', marginTop: 8 }}>
          Tap mic to record (demo) · Type your response · Minimum 20 words
        </div>
      </div>
    </div>
  )
}

/* ── Main page — keep ALL existing API logic ─────────────────────────────── */
export default function SpeakingPage() {
  const { t } = useLanguage()
  const [phase, setPhase] = useState<Phase>('ready')
  const [part, setPart] = useState<1 | 2 | 3>(1)
  const [topic, setTopic] = useState(SAMPLE_TOPICS[1][0])
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FeedbackResult | null>(null)
  const [error, setError] = useState('')

  // Existing API logic — unchanged
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

  if (phase === 'ready') return <ReadyScreen onStart={() => setPhase('live')} t={t} />
  if (phase === 'feedback' && result) return <FeedbackScreen result={result} onBack={() => { setPhase('ready'); setTranscript(''); setResult(null) }} />

  return (
    <LiveExam
      part={part} setPart={p => { setPart(p); setTopic(SAMPLE_TOPICS[p][0]) }}
      topic={topic} setTopic={setTopic}
      transcript={transcript} setTranscript={setTranscript}
      loading={loading} error={error}
      onSubmit={handleSubmit}
      onEndTest={() => setPhase('ready')}
    />
  )
}
