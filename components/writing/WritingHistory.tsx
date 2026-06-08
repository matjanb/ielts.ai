'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/services/auth'
import { WritingFeedback, type FeedbackResult } from './WritingFeedback'

interface Submission {
  id: string
  task_type: string
  prompt: string
  content: string
  band_score: number | null
  task_achievement: number | null
  coherence_cohesion: number | null
  lexical_resource: number | null
  grammatical_accuracy: number | null
  ai_feedback: string | null
  created_at: string
}

function toResult(s: Submission): FeedbackResult | null {
  if (s.band_score == null) return null
  let feedback: FeedbackResult['feedback']
  try {
    feedback = typeof s.ai_feedback === 'string' ? JSON.parse(s.ai_feedback) : (s.ai_feedback as unknown as FeedbackResult['feedback'])
  } catch {
    feedback = { overview: '', strengths: [], improvements: [], rewritten_paragraph: '' }
  }
  return {
    band_score: s.band_score,
    task_achievement: s.task_achievement ?? 0,
    coherence_cohesion: s.coherence_cohesion ?? 0,
    lexical_resource: s.lexical_resource ?? 0,
    grammatical_accuracy: s.grammatical_accuracy ?? 0,
    feedback,
  }
}

export function WritingHistory() {
  const { t } = useLanguage()
  const [rows, setRows] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<Submission | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      const { user } = await getUser()
      if (!user) { if (alive) setLoading(false); return }
      const { data } = await createClient()
        .from('writing_submissions')
        .select('id, task_type, prompt, content, band_score, task_achievement, coherence_cohesion, lexical_resource, grammatical_accuracy, ai_feedback, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      if (!alive) return
      setRows((data ?? []) as Submission[])
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [])

  if (!loading && rows.length === 0) return null

  const result = open ? toResult(open) : null

  return (
    <div className="card" style={{ padding: 24, marginTop: 16 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{t('writingHistory.title')}</h3>
      <p style={{ margin: '2px 0 16px', fontSize: 12.5, color: 'var(--text-3)' }}>{t('writingHistory.sub')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(s => (
          <button key={s.id} onClick={() => setOpen(s)} style={{
            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', width: '100%',
            padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-soft)', cursor: 'pointer',
          }}>
            <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '3px 9px', borderRadius: 999 }}>
              Task {s.task_type}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.prompt}
            </span>
            <span style={{ flexShrink: 0, fontSize: 11.5, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{s.created_at.slice(0, 10)}</span>
            <span style={{ flexShrink: 0, fontSize: 15, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'right' }}>
              {s.band_score?.toFixed(1) ?? '—'}
            </span>
          </button>
        ))}
      </div>

      {/* Full breakdown overlay */}
      {open && result && (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto', padding: '40px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 760, background: '#0e1011', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
            <button onClick={() => setOpen(null)} style={{ position: 'absolute', top: 14, right: 14, zIndex: 1, width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#f5f5f3', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
            <WritingFeedback result={result} taskType={open.task_type === '2' ? '2' : '1'} style={{ background: 'transparent' }} />
            <div style={{ padding: '0 24px 28px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,245,243,0.4)', margin: '4px 0 8px' }}>{t('wtest.yourEssay')}</div>
              <div style={{ background: '#16191b', borderRadius: 10, padding: 16, color: '#d8d8d4', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{open.content}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
