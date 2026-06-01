'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getTestById, getWritingPromptsForTest, type WritingPrompt } from '@/lib/services/tests'
import type { IeltsTest } from '@/lib/types/database'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface FeedbackResult {
  band_score: number
  task_achievement: number
  coherence_cohesion: number
  lexical_resource: number
  grammatical_accuracy: number
  feedback: { overview: string; strengths: string[]; improvements: string[]; rewritten_paragraph: string }
}

export default function WritingTestPage() {
  const { t } = useLanguage()
  const params = useParams<{ testId: string }>()
  const router = useRouter()
  const testId = params.testId

  const [test, setTest] = useState<IeltsTest | null>(null)
  const [taskType, setTaskType] = useState<'1' | '2'>('1')

  const [htmlContents, setHtmlContents] = useState<Record<'1' | '2', string>>({ '1': '', '2': '' })
  const [plainTexts, setPlainTexts]     = useState<Record<'1' | '2', string>>({ '1': '', '2': '' })
  const content = plainTexts[taskType]

  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<FeedbackResult | null>(null)
  const [error, setError]       = useState('')

  const editorRef = useRef<HTMLDivElement>(null)

  const [allPrompts, setAllPrompts]       = useState<WritingPrompt[]>([])
  const [promptsLoading, setPromptsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [testData, prompts] = await Promise.all([
        getTestById(testId),
        getWritingPromptsForTest(testId).catch(() => []),
      ])
      setTest(testData)
      setAllPrompts(prompts)
      setPromptsLoading(false)
    }
    load()
  }, [testId])

  // Restore saved HTML when switching task type
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = htmlContents[taskType]
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskType])

  const prompts = useMemo(() => allPrompts.filter(p => p.taskType === taskType), [allPrompts, taskType])
  const currentPrompt = prompts[0] ?? null
  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0
  const minWords  = currentPrompt?.minWords ?? (taskType === '1' ? 150 : 250)
  const minutes   = currentPrompt?.minutes  ?? (taskType === '1' ? 20  : 40)

  function handleTaskTypeChange(type: '1' | '2') {
    setTaskType(type); setResult(null); setError('')
  }

  function handleEditorInput() {
    const el = editorRef.current
    if (!el) return
    setHtmlContents(prev => ({ ...prev, [taskType]: el.innerHTML }))
    setPlainTexts(prev   => ({ ...prev, [taskType]: el.innerText }))
  }

  function applyFormat(command: 'bold' | 'italic' | 'underline') {
    editorRef.current?.focus()
    document.execCommand(command, false)
  }

  function handleCut()  { editorRef.current?.focus(); document.execCommand('cut') }
  function handleCopy() { editorRef.current?.focus(); document.execCommand('copy') }

  async function handlePaste() {
    editorRef.current?.focus()
    try {
      const text = await navigator.clipboard.readText()
      const selection = window.getSelection()
      if (!selection?.rangeCount) return
      const range = selection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(document.createTextNode(text))
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
      handleEditorInput()
    } catch { /* clipboard access denied */ }
  }

  async function handleSubmit() {
    if (wordCount < 50 || !currentPrompt) return
    setError(''); setResult(null); setLoading(true)
    try {
      const res = await fetch('/api/ai/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, task_type: taskType, prompt: currentPrompt.text }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? t('wtest.failed'))
      else setResult(data)
    } catch { setError(t('wtest.networkError')) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <style>{`
        .writing-editor:empty::before {
          content: attr(data-placeholder);
          color: var(--text-3);
          pointer-events: none;
        }
      `}</style>

      {/* IELTS dark header */}
      <div style={{ background: '#2b2b2b', color: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontWeight: 700, fontSize: 14 }}>
          <button onClick={() => router.push('/dashboard/writing')} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            fontSize: 18, lineHeight: 1, padding: '0 4px', display: 'flex', alignItems: 'center',
          }}>←</button>
          <span style={{ background: '#ffcb05', color: '#000', padding: '3px 8px', borderRadius: 2, fontSize: 11 }}>IELTS</span>
          <span style={{ opacity: 0.7, fontWeight: 400, fontSize: 12 }}>{test?.title ?? t('dashboard.writing')}</span>
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
            {wordCount} / {minWords} {t('wtest.words')}
          </span>
          <button onClick={handleSubmit} disabled={loading || wordCount < 50 || !currentPrompt} style={{
            padding: '5px 14px', background: '#0066b3', color: '#fff', fontSize: 12, fontWeight: 700,
            borderRadius: 2, border: 'none', cursor: (wordCount < 50 || !currentPrompt) ? 'not-allowed' : 'pointer',
            opacity: (loading || wordCount < 50 || !currentPrompt) ? 0.6 : 1,
          }}>
            {loading ? t('wtest.analysing') : t('wtest.submit')}
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
            {t('wtest.spend', { min: String(minutes) })}
          </p>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }}/>

          {promptsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '20px 0' }}>
              <Loader2 size={14} className="animate-spin" /> {t('wtest.loadingTask')}
            </div>
          ) : !currentPrompt ? (
            <div style={{ padding: '20px 0', color: 'var(--text-3)', fontSize: 13, lineHeight: 1.55 }}>
              {t('wtest.noPrompt', { n: taskType })}
            </div>
          ) : (
            <>
              <p style={{ fontSize: 15, lineHeight: 1.65, fontWeight: 500, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: 16 }}>
                {currentPrompt.text}
              </p>
              {currentPrompt.note && (
                <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-3)', whiteSpace: 'pre-wrap' }}>{currentPrompt.note}</p>
              )}
              {currentPrompt.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPrompt.imageUrl}
                  alt={`Writing Task ${taskType} chart`}
                  style={{ marginTop: 16, width: '100%', borderRadius: 8, border: '1px solid var(--border)', background: '#fff' }}
                />
              )}
              {taskType === '2' && !currentPrompt.imageUrl && (
                <div style={{ marginTop: 20, padding: 14, background: 'color-mix(in srgb, var(--warn) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)' }}>
                  <strong>{t('wtest.tipLabel')}</strong> {t('wtest.tipText')}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pane 2: Writing area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-elev)' }}>
          <div style={{ padding: '10px 16px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => applyFormat('bold')}      style={{ padding: '3px 9px', fontSize: 12, fontWeight: 700, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>B</button>
              <button onClick={() => applyFormat('italic')}    style={{ padding: '3px 9px', fontSize: 12, fontStyle: 'italic', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>I</button>
              <button onClick={() => applyFormat('underline')} style={{ padding: '3px 9px', fontSize: 12, textDecoration: 'underline', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>U</button>
              <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }}/>
              <button onClick={handleCut}   style={{ padding: '3px 9px', fontSize: 11, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>{t('wtest.cut')}</button>
              <button onClick={handleCopy}  style={{ padding: '3px 9px', fontSize: 11, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>{t('wtest.copy')}</button>
              <button onClick={handlePaste} style={{ padding: '3px 9px', fontSize: 11, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>{t('wtest.paste')}</button>
            </div>
            <div style={{ fontSize: 12, color: wordCount >= minWords ? 'var(--accent)' : 'var(--text-3)' }}>
              <strong style={{ color: wordCount >= minWords ? 'var(--accent)' : 'var(--danger)' }}>{wordCount}</strong>
              {' / '}{minWords} {t('wtest.wordsMin')}
            </div>
          </div>

          <div
            ref={editorRef}
            className="writing-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            data-placeholder={t('wtest.placeholder')}
            style={{
              flex: 1, padding: '20px 24px', outline: 'none', overflow: 'auto',
              fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.7,
              background: 'var(--bg-elev)', color: 'var(--text)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}
          />

          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{t('wtest.autoSaved')}</span>
            {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
            {loading && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}><Loader2 size={12} className="animate-spin"/> {t('wtest.analysingEssay')}</div>}
          </div>
        </div>

        {/* Pane 3: AI Feedback */}
        {result && (
          <div style={{ width: '33%', background: '#0e1011', color: '#f5f5f3', overflow: 'auto', padding: 24, borderLeft: '1px solid #26272a' }}>
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

            {result.feedback.overview && (
              <div style={{ marginTop: 16, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0, opacity: 0.85 }}>{result.feedback.overview}</p>
              </div>
            )}

            {result.feedback.strengths.length > 0 && (
              <div style={{ marginTop: 10, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 8 }}>{t('wtest.strengths')}</div>
                {result.feedback.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5, opacity: 0.8 }}>✓ {s}</div>)}
              </div>
            )}

            {result.feedback.improvements.length > 0 && (
              <div style={{ marginTop: 10, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#e4b54f', marginBottom: 8 }}>{t('wtest.improve')}</div>
                {result.feedback.improvements.map((s, i) => <div key={i} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5, opacity: 0.8 }}>→ {s}</div>)}
              </div>
            )}

            {result.feedback.rewritten_paragraph && (
              <div style={{ marginTop: 10, padding: 14, background: '#16191b', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 8 }}>{t('wtest.band8')}</div>
                <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, fontStyle: 'italic', opacity: 0.75 }}>{result.feedback.rewritten_paragraph}</p>
              </div>
            )}

            <div style={{ marginTop: 14, padding: 14, background: '#16191b', borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#3aa278', marginBottom: 6 }}>{t('wtest.nextStep')}</div>
              <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
                {taskType === '2' ? t('wtest.nextTask2') : t('wtest.nextTask1')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
