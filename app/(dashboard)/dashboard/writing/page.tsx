'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/* ── Prompt data ─────────────────────────────────────────────────────────── */
const SAMPLE_PROMPTS: Record<'1' | '2', { title: string; text: string; note: string }[]> = {
  '1': [
    {
      title: 'Household Spending by Age Group',
      text: 'The chart below shows the average percentages of household income spent on six categories of goods and services by people in three different age groups in the UK in 2018.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      note: 'Write at least 150 words.',
    },
    {
      title: 'Solar Panel Process',
      text: 'The diagram below shows how solar panels convert sunlight into electricity for household use. Summarise the information by selecting and reporting the main features.',
      note: 'Write at least 150 words.',
    },
  ],
  '2': [
    {
      title: 'Universities: Academic vs Career Focus',
      text: 'Some people believe that universities should focus on providing academic skills, while others think they should also prepare students for their future careers.\n\nDiscuss both views and give your own opinion.',
      note: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    },
    {
      title: 'Living Alone',
      text: 'In many countries, the number of people choosing to live alone is increasing. Do you think this is a positive or negative development?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.',
      note: 'Write at least 250 words.',
    },
  ],
}

interface FeedbackResult {
  band_score: number
  task_achievement: number
  coherence_cohesion: number
  lexical_resource: number
  grammatical_accuracy: number
  feedback: { overview: string; strengths: string[]; improvements: string[]; rewritten_paragraph: string }
}

/* ── MockBarChart ────────────────────────────────────────────────────────── */
function MockBarChart() {
  const cats = ['Food', 'Housing', 'Transport', 'Leisure', 'Health', 'Other']
  const groups = [
    { name: '18–29', values: [12, 38, 16, 18, 5, 11], color: 'var(--info)' },
    { name: '30–49', values: [15, 32, 14, 12, 8, 19], color: 'var(--accent)' },
    { name: '50+',   values: [18, 26, 11, 9, 16, 20], color: 'var(--warn)' },
  ]
  return (
    <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-soft)', borderRadius: 8, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', marginBottom: 12, color: 'var(--text-2)' }}>
        Household spending by age group (% of income), UK 2018
      </div>
      <svg viewBox="0 0 400 180" style={{ width: '100%' }}>
        {[0, 10, 20, 30, 40].map(v => (
          <g key={v}>
            <line x1="40" x2="400" y1={170 - v * 3.5} y2={170 - v * 3.5} stroke="var(--border)"/>
            <text x="36" y={174 - v * 3.5} fontSize="9" fill="var(--text-3)" textAnchor="end">{v}%</text>
          </g>
        ))}
        {cats.map((c, ci) => (
          <g key={c}>
            {groups.map((g, gi) => {
              const h = g.values[ci] * 3.5
              const x = 50 + ci * 58 + gi * 14
              return <rect key={gi} x={x} y={170 - h} width={12} height={h} fill={g.color} opacity="0.85"/>
            })}
            <text x={50 + ci * 58 + 21} y={180} fontSize="9" fill="var(--text-3)" textAnchor="middle">{c}</text>
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: 10, color: 'var(--text-2)' }}>
        {groups.map(g => (
          <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: g.color, display: 'inline-block' }}/>{g.name}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main page — keep ALL existing API logic ─────────────────────────────── */
export default function WritingPage() {
  const { t } = useLanguage()
  const [taskType, setTaskType] = useState<'1' | '2'>('2')
  const [promptIdx, setPromptIdx] = useState(0)
  const [content, setContent]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<FeedbackResult | null>(null)
  const [error, setError]       = useState('')
  const [submitted, setSubmitted] = useState(false)

  const prompts = SAMPLE_PROMPTS[taskType]
  const currentPrompt = prompts[promptIdx]
  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0
  const minWords  = taskType === '1' ? 150 : 250

  function handleTaskTypeChange(type: '1' | '2') {
    setTaskType(type); setPromptIdx(0); setResult(null); setError(''); setContent(''); setSubmitted(false)
  }

  // Existing API logic — unchanged
  async function handleSubmit() {
    if (wordCount < 50) return
    setError(''); setResult(null); setLoading(true); setSubmitted(true)
    try {
      const res = await fetch('/api/ai/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, task_type: taskType, prompt: currentPrompt.text }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Failed to get feedback.')
      else setResult(data)
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ margin: '-24px -32px -24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>

      {/* IELTS dark header */}
      <div style={{ background: '#2b2b2b', color: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontWeight: 700, fontSize: 14 }}>
          <span style={{ background: '#ffcb05', color: '#000', padding: '3px 8px', borderRadius: 2, fontSize: 11 }}>IELTS</span>
          ielts.camp · Practice Writing
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            {(['1', '2'] as const).map(n => (
              <button key={n} onClick={() => handleTaskTypeChange(n)} style={{
                padding: '4px 12px', fontSize: 12, fontWeight: 700,
                background: taskType === n ? '#ffcb05' : '#444',
                color: taskType === n ? '#000' : '#fff',
                borderRadius: 2, border: 'none', cursor: 'pointer',
              }}>Task {n}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: wordCount >= minWords ? '#3aa278' : 'rgba(255,255,255,0.7)' }}>
            {wordCount} / {minWords} words
          </span>
          <button onClick={handleSubmit} disabled={loading || wordCount < 50} style={{
            padding: '5px 14px', background: '#0066b3', color: '#fff', fontSize: 12, fontWeight: 700,
            borderRadius: 2, border: 'none', cursor: wordCount < 50 ? 'not-allowed' : 'pointer',
            opacity: (loading || wordCount < 50) ? 0.6 : 1,
          }}>
            {loading ? 'Analysing…' : 'Submit for AI grading'}
          </button>
        </div>
      </div>

      {/* Three-pane body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Pane 1: Prompt */}
        <div style={{ width: result ? '33%' : '50%', borderRight: '2px solid var(--border)', background: 'var(--bg-elev)', overflow: 'auto', padding: '20px 24px', transition: 'width .3s' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 4 }}>
            Writing Task {taskType}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
            You should spend about {taskType === '1' ? '20' : '40'} minutes on this task.
          </p>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }}/>

          {/* Prompt selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {prompts.map((p, i) => (
              <button key={i} onClick={() => { setPromptIdx(i); setResult(null) }} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: promptIdx === i ? 'var(--accent-soft)' : 'var(--bg-soft)',
                color: promptIdx === i ? 'var(--accent)' : 'var(--text-2)',
                border: `1px solid ${promptIdx === i ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer',
              }}>
                Sample {i + 1}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.65, fontWeight: 500, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: 16 }}>
            {currentPrompt.text}
          </p>
          <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-3)', whiteSpace: 'pre-wrap' }}>{currentPrompt.note}</p>

          {taskType === '1' && <MockBarChart />}

          {taskType === '2' && (
            <div style={{ marginTop: 20, padding: 14, background: 'color-mix(in srgb, var(--warn) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)' }}>
              <strong>Question type:</strong> Discussion + opinion. Address both views with examples before stating your position.
            </div>
          )}
        </div>

        {/* Pane 2: Writing area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-elev)' }}>
          {/* Toolbar */}
          <div style={{ padding: '10px 16px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {['B', 'I', 'U'].map(f => (
                <button key={f} style={{ padding: '3px 9px', fontSize: 12, fontWeight: f === 'B' ? 700 : 400, fontStyle: f === 'I' ? 'italic' : 'normal', textDecoration: f === 'U' ? 'underline' : 'none', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>
                  {f}
                </button>
              ))}
              <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }}/>
              {['Cut', 'Copy', 'Paste'].map(a => (
                <button key={a} style={{ padding: '3px 9px', fontSize: 11, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>{a}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: wordCount >= minWords ? 'var(--accent)' : 'var(--text-3)' }}>
              <strong style={{ color: wordCount >= minWords ? 'var(--accent)' : 'var(--danger)' }}>{wordCount}</strong>
              {' / '}{minWords} words minimum
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Start writing your response here…"
            style={{
              flex: 1, padding: '20px 24px', border: 'none', outline: 'none', resize: 'none',
              fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.7,
              background: 'var(--bg-elev)', color: 'var(--text)',
            }}
          />

          {/* Status bar */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Auto-saved</span>
            {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
            {loading && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}><Loader2 size={12} className="animate-spin"/> Analysing essay…</div>}
          </div>
        </div>

        {/* Pane 3: AI Feedback (dark panel) */}
        {result && (
          <div style={{ width: '33%', background: '#0e1011', color: '#f5f5f3', overflow: 'auto', padding: 24, borderLeft: '1px solid #26272a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#3aa278" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278' }}>AI EXAMINER</span>
            </div>

            <div style={{ textAlign: 'center', padding: '16px 0 20px', background: '#0e1011', borderRadius: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', opacity: 0.5, marginBottom: 6 }}>OVERALL BAND</div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 72, lineHeight: 1, color: '#3aa278', fontWeight: 500 }}>
                {result.band_score.toFixed(1)}
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
              {[
                { k: 'Task response',      v: result.task_achievement },
                { k: 'Coherence & cohesion', v: result.coherence_cohesion },
                { k: 'Lexical resource',   v: result.lexical_resource },
                { k: 'Grammar',            v: result.grammatical_accuracy },
              ].map(row => (
                <div key={row.k} style={{ background: '#16191b', padding: 14, borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{row.k}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: row.v >= 7 ? '#3aa278' : row.v >= 6 ? '#e4b54f' : '#d97a64' }}>{row.v.toFixed(1)}</span>
                  </div>
                  <div style={{ height: 4, background: '#26272a', borderRadius: 2 }}>
                    <div style={{ width: `${(row.v / 9) * 100}%`, height: '100%', background: '#3aa278', borderRadius: 2 }}/>
                  </div>
                </div>
              ))}
            </div>

            {result.feedback.overview && (
              <div style={{ marginTop: 16, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0, opacity: 0.85 }}>{result.feedback.overview}</p>
              </div>
            )}

            {result.feedback.strengths.length > 0 && (
              <div style={{ marginTop: 10, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 8 }}>STRENGTHS</div>
                {result.feedback.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5, opacity: 0.8 }}>✓ {s}</div>)}
              </div>
            )}

            {result.feedback.improvements.length > 0 && (
              <div style={{ marginTop: 10, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#e4b54f', marginBottom: 8 }}>IMPROVE</div>
                {result.feedback.improvements.map((s, i) => <div key={i} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5, opacity: 0.8 }}>→ {s}</div>)}
              </div>
            )}

            {result.feedback.rewritten_paragraph && (
              <div style={{ marginTop: 10, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 8 }}>BAND-8 VERSION</div>
                <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, fontStyle: 'italic', opacity: 0.75 }}>{result.feedback.rewritten_paragraph}</p>
              </div>
            )}

            <div style={{ marginTop: 14, padding: 14, background: '#16191b', borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 6 }}>NEXT STEP</div>
              <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
                {taskType === '2' ? 'Two more discussion essays this week, then move to Problem-Solution.' : 'Practice summarising data trends with accurate comparisons.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
