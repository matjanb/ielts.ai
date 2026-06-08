'use client'

import type { CSSProperties } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export interface FeedbackResult {
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
    corrections?: { quote: string; issue: string; fix: string; type: string }[]
    task_checks?: { label: string; passed: boolean; note: string }[]
    off_topic?: { flag: boolean; note: string }
  }
}

// The examiner result panel — shared by the live editor and the essay history,
// so a past submission shows exactly the same breakdown.
export function WritingFeedback({ result, taskType, style }: { result: FeedbackResult; taskType: '1' | '2'; style?: CSSProperties }) {
  const { t } = useLanguage()
  const fb = result.feedback
  return (
    <div style={{ background: '#0e1011', color: '#f5f5f3', overflow: 'auto', padding: 24, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#3aa278" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278' }}>{t('wtest.aiExaminer')}</span>
      </div>

      <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', opacity: 0.5, marginBottom: 6 }}>{t('wtest.overallBand')}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 72, lineHeight: 1, color: '#3aa278', fontWeight: 500 }}>
          {result.band_score.toFixed(1)}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
        {[
          { k: t('wtest.critTask'),      v: result.task_achievement },
          { k: t('wtest.critCoherence'), v: result.coherence_cohesion },
          { k: t('wtest.critLexical'),   v: result.lexical_resource },
          { k: t('wtest.critGrammar'),   v: result.grammatical_accuracy },
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

      {fb.off_topic?.flag && (
        <div style={{ marginTop: 16, padding: 14, background: 'rgba(217,122,100,0.12)', border: '1px solid rgba(217,122,100,0.4)', borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#d97a64', marginBottom: 6 }}>⚠ {t('wtest.offTopic')}</div>
          <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0, opacity: 0.9 }}>{fb.off_topic.note}</p>
        </div>
      )}

      {fb.overview && (
        <div style={{ marginTop: 16, padding: 14, background: '#16191b', borderRadius: 10 }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0, opacity: 0.85 }}>{fb.overview}</p>
        </div>
      )}

      {fb.task_checks && fb.task_checks.length > 0 && (
        <div style={{ marginTop: 10, padding: 14, background: '#16191b', borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 8 }}>{t('wtest.taskChecks')}</div>
          {fb.task_checks.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6, fontSize: 12, lineHeight: 1.5, opacity: 0.85 }}>
              <span style={{ flexShrink: 0, color: c.passed ? '#3aa278' : '#d97a64', fontWeight: 700 }}>{c.passed ? '✓' : '✗'}</span>
              <span><strong style={{ opacity: 0.95 }}>{c.label}.</strong> {c.note}</span>
            </div>
          ))}
        </div>
      )}

      {fb.strengths.length > 0 && (
        <div style={{ marginTop: 10, padding: 14, background: '#16191b', borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 8 }}>{t('wtest.strengths')}</div>
          {fb.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5, opacity: 0.8 }}>✓ {s}</div>)}
        </div>
      )}

      {fb.improvements.length > 0 && (
        <div style={{ marginTop: 10, padding: 14, background: '#16191b', borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#e4b54f', marginBottom: 8 }}>{t('wtest.improve')}</div>
          {fb.improvements.map((s, i) => <div key={i} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5, opacity: 0.8 }}>→ {s}</div>)}
        </div>
      )}

      {fb.corrections && fb.corrections.length > 0 && (
        <div style={{ marginTop: 10, padding: 14, background: '#16191b', borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#e4b54f', marginBottom: 10 }}>{t('wtest.corrections')}</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {fb.corrections.map((c, i) => (
              <div key={i} style={{ borderLeft: '2px solid rgba(228,181,79,0.5)', paddingLeft: 10 }}>
                <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#d97a64', textDecoration: 'line-through', opacity: 0.8 }}>{c.quote}</div>
                <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#3aa278', marginTop: 2 }}>{c.fix}</div>
                <div style={{ fontSize: 11, lineHeight: 1.45, opacity: 0.6, marginTop: 3 }}>
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, fontSize: 9.5 }}>{c.type}</span> · {c.issue}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fb.rewritten_paragraph && (
        <div style={{ marginTop: 10, padding: 14, background: '#16191b', borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 8 }}>{t('wtest.band8')}</div>
          <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, fontStyle: 'italic', opacity: 0.75 }}>{fb.rewritten_paragraph}</p>
        </div>
      )}

      <div style={{ marginTop: 14, padding: 14, background: '#16191b', borderRadius: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 6 }}>{t('wtest.nextStep')}</div>
        <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
          {taskType === '2' ? t('wtest.nextTask2') : t('wtest.nextTask1')}
        </p>
      </div>
    </div>
  )
}
