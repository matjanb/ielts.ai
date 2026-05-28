'use client'

import { useState } from 'react'
import { BookOpen, ChevronDown, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// ── Prompt data ───────────────────────────────────────────────────────────────
const SAMPLE_PROMPTS: Record<'1' | '2', string[]> = {
  '1': [
    'The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    'The diagram below shows how solar panels convert sunlight into electricity for household use. Summarise the information by selecting and reporting the main features.',
  ],
  '2': [
    'Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime. Discuss both views and give your own opinion.',
    'In many countries, the number of people choosing to live alone is increasing. Do you think this is a positive or negative development? Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
  ],
}

interface FeedbackResult {
  band_score: number
  task_achievement: number
  coherence_cohesion: number
  lexical_resource: number
  grammatical_accuracy: number
  feedback: {
    overview: string
    strengths: string[]
    improvements: string[]
    rewritten_paragraph: string
  }
}

// ── Keep ALL existing backend logic intact ────────────────────────────────────
export default function WritingPage() {
  const { t } = useLanguage()
  const [taskType, setTaskType] = useState<'1' | '2'>('2')
  const [prompt, setPrompt]     = useState(SAMPLE_PROMPTS['2'][0])
  const [content, setContent]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<FeedbackResult | null>(null)
  const [error, setError]       = useState('')

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0
  const minWords  = taskType === '1' ? 150 : 250

  function handleTaskTypeChange(type: '1' | '2') {
    setTaskType(type)
    setPrompt(SAMPLE_PROMPTS[type][0])
    setResult(null)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('/api/ai/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, task_type: taskType, prompt }),
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
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 4l6 6L9 21H3v-6z"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 30, margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>Writing</h1>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 2 }}>
              AI feedback on all four IELTS writing criteria
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Task type toggle */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['1', '2'] as const).map(type => (
              <button key={type} type="button" onClick={() => handleTaskTypeChange(type)} style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: taskType === type ? 'var(--accent)' : 'var(--bg-soft)',
                color: taskType === type ? 'var(--accent-fg)' : 'var(--text)',
                border: taskType === type ? 'none' : '1px solid var(--border-strong)',
                cursor: 'pointer', transition: 'all .15s',
              }}>
                Task {type}
              </button>
            ))}
            <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center', marginLeft: 4 }}>
              {taskType === '1' ? '20 min · 150 words min' : '40 min · 250 words min'}
            </span>
          </div>

          {/* Prompt selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 6 }}>
              TASK PROMPT
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={prompt}
                onChange={e => { setPrompt(e.target.value); setResult(null) }}
                style={{
                  width: '100%', appearance: 'none', padding: '10px 36px 10px 14px',
                  borderRadius: 8, fontSize: 13,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-elev)', color: 'var(--text)', cursor: 'pointer', outline: 'none',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              >
                {SAMPLE_PROMPTS[taskType].map((p, i) => (
                  <option key={i} value={p}>Sample prompt {i + 1}</option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>{prompt}</p>
          </div>

          {/* Textarea */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em' }}>YOUR RESPONSE</label>
              <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: wordCount >= minWords ? 'var(--accent)' : 'var(--text-2)' }}>
                {wordCount} / {minWords} words
              </span>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={14}
              required
              placeholder={`Write your Task ${taskType} response here…`}
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

          <button type="submit" disabled={loading || wordCount < 50} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: 'var(--accent)', color: 'var(--accent-fg)',
            border: 'none', cursor: loading || wordCount < 50 ? 'not-allowed' : 'pointer',
            opacity: loading || wordCount < 50 ? 0.5 : 1, transition: 'opacity .15s',
            width: 'fit-content',
          }}>
            {loading ? (
              <><Loader2 size={15} className="animate-spin" /> Analysing…</>
            ) : (
              <><BookOpen size={15} /> Get AI Feedback</>
            )}
          </button>
        </form>

        {/* AI feedback panel */}
        {result && (
          <div style={{ background: '#0e1011', color: '#fff', padding: 24, borderRadius: 14, fontFamily: 'var(--font-sans)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#3aa278" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278' }}>AI EXAMINER</span>
            </div>

            <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 18 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 72, lineHeight: 1, color: '#3aa278', fontWeight: 500 }}>
                {result.band_score.toFixed(1)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>overall band</div>
            </div>

            {[
              { k: 'Task response', v: result.task_achievement },
              { k: 'Coherence & cohesion', v: result.coherence_cohesion },
              { k: 'Lexical resource', v: result.lexical_resource },
              { k: 'Grammar', v: result.grammatical_accuracy },
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

            {result.feedback.strengths.length > 0 && (
              <div style={{ marginTop: 12, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 8 }}>STRENGTHS</div>
                {result.feedback.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 6, opacity: 0.8 }}>✓ {s}</div>
                ))}
              </div>
            )}

            {result.feedback.improvements.length > 0 && (
              <div style={{ marginTop: 12, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#e4b54f', marginBottom: 8 }}>IMPROVE</div>
                {result.feedback.improvements.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 6, opacity: 0.8 }}>→ {s}</div>
                ))}
              </div>
            )}

            {result.feedback.rewritten_paragraph && (
              <div style={{ marginTop: 12, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 8 }}>BAND-8 VERSION</div>
                <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, fontStyle: 'italic', opacity: 0.75 }}>{result.feedback.rewritten_paragraph}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
