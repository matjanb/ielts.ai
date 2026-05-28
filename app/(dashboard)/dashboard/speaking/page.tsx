'use client'

import { useState } from 'react'
import { Mic, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// ── Topic data ────────────────────────────────────────────────────────────────
const SAMPLE_TOPICS: Record<1 | 2 | 3, string[]> = {
  1: [
    'Tell me about your hometown.',
    'Do you enjoy cooking? Why or why not?',
    'What kind of music do you like?',
  ],
  2: [
    'Describe a book you have read recently. You should say: what the book was about, why you chose to read it, what you liked or disliked about it, and explain what effect it had on you.',
    'Describe a journey that you remember well. You should say: where you went, how you travelled, who you were with, and explain why you remember it so well.',
  ],
  3: [
    'How has technology changed the way people communicate in your country?',
    'Do you think environmental problems are best solved by governments or individuals?',
  ],
}

interface FeedbackResult {
  band_score: number
  fluency_score: number
  lexical_score: number
  grammar_score: number
  pronunciation_notes: string
  feedback: {
    overview: string
    strengths: string[]
    improvements: string[]
  }
}

// ── Keep ALL existing backend logic intact ────────────────────────────────────
export default function SpeakingPage() {
  const { t } = useLanguage()
  const [part, setPart]           = useState<1 | 2 | 3>(2)
  const [topic, setTopic]         = useState(SAMPLE_TOPICS[2][0])
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<FeedbackResult | null>(null)
  const [error, setError]         = useState('')

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).filter(Boolean).length : 0

  function handlePartChange(p: 1 | 2 | 3) {
    setPart(p)
    setTopic(SAMPLE_TOPICS[p][0])
    setResult(null)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('/api/ai/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, part, topic }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to get feedback.')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Hub header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={22} style={{ color: 'var(--accent)' }} strokeWidth={1.8} />
          </div>
          <div>
            <h1 style={{ fontSize: 30, margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>Speaking</h1>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 2 }}>
              Paste your transcript and get AI feedback on all four criteria
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Part selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 8 }}>SPEAKING PART</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([1, 2, 3] as const).map(p => (
                <button key={p} type="button" onClick={() => handlePartChange(p)} style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: part === p ? 'var(--accent)' : 'var(--bg-soft)',
                  color: part === p ? 'var(--accent-fg)' : 'var(--text)',
                  border: part === p ? 'none' : '1px solid var(--border-strong)',
                  cursor: 'pointer', transition: 'all .15s',
                }}>
                  Part {p}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 6 }}>TOPIC / QUESTION</label>
            <select value={topic} onChange={e => { setTopic(e.target.value); setResult(null) }} style={{
              width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 13,
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-elev)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
            }}>
              {SAMPLE_TOPICS[part].map((tp, i) => (
                <option key={i} value={tp}>{tp.length > 70 ? tp.slice(0, 70) + '…' : tp}</option>
              ))}
            </select>
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{topic}</p>
          </div>

          {/* Transcript */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em' }}>YOUR RESPONSE (transcript)</label>
              <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: wordCount >= 20 ? 'var(--accent)' : 'var(--text-2)' }}>{wordCount} words</span>
            </div>
            <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={10} required
              placeholder="Type or paste your spoken response here. Minimum 20 words…"
              style={{
                width: '100%', padding: '14px', borderRadius: 10, fontSize: 14, lineHeight: 1.7,
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-elev)', color: 'var(--text)',
                fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
            />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'color-mix(in srgb, var(--danger) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', fontSize: 13, color: 'var(--danger)' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || wordCount < 20} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: 'var(--accent)', color: 'var(--accent-fg)',
            border: 'none', cursor: loading || wordCount < 20 ? 'not-allowed' : 'pointer',
            opacity: loading || wordCount < 20 ? 0.5 : 1, transition: 'opacity .15s',
            width: 'fit-content',
          }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Analysing…</> : <><Mic size={15} /> Get AI Feedback</>}
          </button>
        </form>

        {/* AI feedback panel */}
        {result && (
          <div style={{ background: '#0e1011', color: '#fff', padding: 24, borderRadius: 14, fontFamily: 'var(--font-sans)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Mic size={14} style={{ color: '#3aa278' }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278' }}>AI EXAMINER</span>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 18 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 72, lineHeight: 1, color: '#3aa278', fontWeight: 500 }}>
                {result.band_score.toFixed(1)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>overall band</div>
            </div>
            {[
              { k: 'Fluency & coherence', v: result.fluency_score },
              { k: 'Lexical resource', v: result.lexical_score },
              { k: 'Grammatical range', v: result.grammar_score },
            ].map(row => (
              <div key={row.k} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ opacity: 0.8 }}>{row.k}</span>
                  <span style={{ fontWeight: 700, color: row.v >= 7 ? '#3aa278' : row.v >= 6 ? '#e4b54f' : '#d97a64' }}>{row.v.toFixed(1)}</span>
                </div>
                <div style={{ height: 4, background: '#26272a', borderRadius: 2 }}>
                  <div style={{ width: `${(row.v / 9) * 100}%`, height: '100%', background: '#3aa278', borderRadius: 2 }}/>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 20, padding: 14, background: '#16191b', borderRadius: 10 }}>
              <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, opacity: 0.85 }}>{result.feedback.overview}</p>
            </div>
            {result.pronunciation_notes && (
              <div style={{ marginTop: 12, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 6 }}>PRONUNCIATION</div>
                <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0, opacity: 0.75 }}>{result.pronunciation_notes}</p>
              </div>
            )}
            {result.feedback.strengths.length > 0 && (
              <div style={{ marginTop: 12, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 8 }}>STRENGTHS</div>
                {result.feedback.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 6, opacity: 0.8 }}>✓ {s}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
