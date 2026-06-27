'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getTestById, getWritingPromptsForTest, type WritingPrompt } from '@/lib/services/tests'
import type { IeltsTest } from '@/lib/types/database'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { redirectToPaywallOn403 } from '@/lib/paywall'
import { WritingFeedback, type FeedbackResult } from '@/components/writing/WritingFeedback'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

// Embeddable Writing exam. Standalone route renders it via the wrapper below.
// In the mock it grades both tasks, then reports the IELTS-weighted band
// (Task 2 counts double) via onComplete instead of showing inline feedback.
export function WritingExam({ testId, embedded = false, onComplete }: { testId: string; embedded?: boolean; onComplete?: (band: number) => void }) {
  const { t } = useLanguage()
  const router = useRouter()

  const [test, setTest] = useState<IeltsTest | null>(null)
  const [taskType, setTaskType] = useState<'1' | '2'>('1')
  // Per-task bands captured in embedded (mock) mode; section completes at both.
  const [gradedBands, setGradedBands] = useState<Partial<Record<'1' | '2', number>>>({})

  const [htmlContents, setHtmlContents] = useState<Record<'1' | '2', string>>({ '1': '', '2': '' })
  const [plainTexts, setPlainTexts]     = useState<Record<'1' | '2', string>>({ '1': '', '2': '' })
  const content = plainTexts[taskType]

  // Signature of the text that was last graded — so the same essay can't be
  // re-submitted (and re-billed) without any change. Resets on edit/task switch.
  const [gradedSig, setGradedSig] = useState<string | null>(null)
  const sigOf = (c: string, tt: '1' | '2') => `${tt}:${c.trim()}`
  const currentSig = sigOf(content, taskType)
  const alreadyGraded = currentSig === gradedSig

  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<FeedbackResult | null>(null)
  // After grading we switch the whole pane to a full results screen (not a cramped
  // sidebar). "Back to essay" returns to editing; the result stays saved in the DB.
  const [showResult, setShowResult] = useState(false)
  const [error, setError]       = useState('')

  const editorRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftWidth, setLeftWidth] = useState(42)
  const isResizing = useRef(false)

  const startResize = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    e.preventDefault()
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setLeftWidth(Math.min(70, Math.max(25, ((e.clientX - rect.left) / rect.width) * 100)))
    }
    const onUp = () => { isResizing.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp, { once: true })
  }, [])

  const [allPrompts, setAllPrompts]       = useState<WritingPrompt[]>([])
  const [promptsLoading, setPromptsLoading] = useState(true)

  const isMobile = useIsMobile()
  // On phones the prompt can't sit beside the editor — it collapses to a tappable
  // bar so the essay area gets the full screen.
  const [promptOpen, setPromptOpen] = useState(true)

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
      if (redirectToPaywallOn403(res)) return
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? t('wtest.failed')); return }
      setGradedSig(sigOf(content, taskType))
      if (embedded) {
        // Record this task's band; complete the section once both are graded.
        const band = Number(data.band_score ?? 0)
        const next = { ...gradedBands, [taskType]: band }
        setGradedBands(next)
        if (next['1'] != null && next['2'] != null) {
          onComplete?.(Math.round(((next['1'] + next['2'] * 2) / 3) * 2) / 2)
        } else {
          setTaskType(next['1'] == null ? '1' : '2') // jump to the ungraded task
        }
        return
      }
      setResult(data); setShowResult(true); window.scrollTo({ top: 0 })
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
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, fontWeight: 700, fontSize: 14, minWidth: 0 }}>
          {!embedded && (
            <button onClick={() => router.push('/dashboard/writing')} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              fontSize: 18, lineHeight: 1, padding: '0 4px', display: 'flex', alignItems: 'center', flexShrink: 0,
            }}>←</button>
          )}
          <span style={{ background: '#ffcb05', color: '#000', padding: '3px 8px', borderRadius: 2, fontSize: 11, flexShrink: 0 }}>IELTS</span>
          {!isMobile && <span style={{ opacity: 0.7, fontWeight: 400, fontSize: 12 }}>{test?.title ?? t('dashboard.writing')}</span>}
          <div style={{ display: 'flex', gap: 4, marginLeft: isMobile ? 0 : 8, flexShrink: 0 }}>
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
          {showResult ? (
            <button onClick={() => setShowResult(false)} style={{ padding: '5px 14px', background: '#444', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 2, border: 'none', cursor: 'pointer' }}>
              ← {t('wtest.backToEssay')}
            </button>
          ) : (
            <>
              {!isMobile && <span style={{ fontVariantNumeric: 'tabular-nums', color: wordCount >= minWords ? '#3aa278' : 'rgba(255,255,255,0.7)' }}>
                {wordCount} / {minWords} {t('wtest.words')}
              </span>}
              {result && alreadyGraded && (
                <button onClick={() => { setShowResult(true); window.scrollTo({ top: 0 }) }} style={{ padding: '5px 14px', background: '#2f6b4f', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 2, border: 'none', cursor: 'pointer' }}>
                  {t('wtest.viewResult')}
                </button>
              )}
              <button onClick={handleSubmit} disabled={loading || wordCount < 50 || !currentPrompt || alreadyGraded} style={{
                padding: '5px 14px', background: '#0066b3', color: '#fff', fontSize: 12, fontWeight: 700,
                borderRadius: 2, border: 'none', cursor: (wordCount < 50 || !currentPrompt || alreadyGraded) ? 'not-allowed' : 'pointer',
                opacity: (loading || wordCount < 50 || !currentPrompt || alreadyGraded) ? 0.6 : 1,
              }}>
                {loading ? t('wtest.analysing') : alreadyGraded ? `✓ ${t('wtest.graded')}` : t('wtest.submit')}
              </button>
            </>
          )}
        </div>
      </div>

      {showResult && result ? (
        /* Full results screen */
        <div style={{ flex: 1, overflow: 'auto', background: '#0e1011' }}>
          <WritingFeedback result={result} taskType={taskType} style={{ background: 'transparent', maxWidth: 760, margin: '0 auto', width: '100%' }} />
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px 60px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,245,243,0.4)', margin: '4px 0 8px' }}>{t('wtest.yourEssay')}</div>
            <div style={{ background: '#16191b', borderRadius: 10, padding: 16, color: '#d8d8d4', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{content}</div>
          </div>
        </div>
      ) : (
      /* Two-pane body: prompt + editor */
      <div ref={containerRef} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, minHeight: 0 }}>

        {/* Pane 1: Prompt — collapses to a tappable bar on mobile */}
        <div style={{
          width: isMobile ? '100%' : `${leftWidth}%`,
          borderRight: isMobile ? 'none' : 'none',
          borderBottom: isMobile ? '1px solid var(--border)' : undefined,
          background: 'var(--bg-elev)', overflow: 'auto', flexShrink: 0,
          padding: isMobile ? '0 16px' : '20px 24px',
          maxHeight: isMobile && promptOpen ? '40vh' : undefined,
        }}>
          {isMobile && (
            <button onClick={() => setPromptOpen(o => !o)} style={{
              position: 'sticky', top: 0, zIndex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', background: 'var(--bg-elev)', border: 'none', cursor: 'pointer', color: 'var(--text)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-2)' }}>
                Writing Task {taskType}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{promptOpen ? '▲' : '▼'}</span>
            </button>
          )}
          {(!isMobile || promptOpen) && (<>
          {!isMobile && <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 4 }}>
            Writing Task {taskType}
          </div>}
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
              <p style={{ fontSize: 16, lineHeight: 1.7, fontWeight: 500, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: 16 }}>
                {currentPrompt.text}
              </p>
              {currentPrompt.note && (
                <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text-3)', whiteSpace: 'pre-wrap' }}>{currentPrompt.note}</p>
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
          </>)}
        </div>

        {/* Drag divider — desktop only */}
        {!isMobile && (
          <div onMouseDown={startResize} style={{ width: 6, background: 'var(--border)', cursor: 'col-resize', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 3, height: 40, borderRadius: 999, background: 'var(--border-strong)' }}/>
          </div>
        )}

        {/* Pane 2: Writing area */}
        <div style={{ width: isMobile ? '100%' : `${100 - leftWidth}%`, display: 'flex', flexDirection: 'column', background: 'var(--bg-elev)' }}>
          <div style={{ padding: '10px 16px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => applyFormat('bold')}      style={{ padding: '3px 9px', fontSize: 12, fontWeight: 700, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>B</button>
              <button onClick={() => applyFormat('italic')}    style={{ padding: '3px 9px', fontSize: 12, fontStyle: 'italic', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>I</button>
              <button onClick={() => applyFormat('underline')} style={{ padding: '3px 9px', fontSize: 12, textDecoration: 'underline', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>U</button>
              {!isMobile && <>
                <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }}/>
                <button onClick={handleCut}   style={{ padding: '3px 9px', fontSize: 11, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>{t('wtest.cut')}</button>
                <button onClick={handleCopy}  style={{ padding: '3px 9px', fontSize: 11, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>{t('wtest.copy')}</button>
                <button onClick={handlePaste} style={{ padding: '3px 9px', fontSize: 11, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text)' }}>{t('wtest.paste')}</button>
              </>}
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
              flex: 1, padding: isMobile ? '16px' : '20px 24px', outline: 'none', overflow: 'auto',
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
      </div>
      )}
    </div>
  )
}

// Standalone /writing/[testId] route — full experience with inline feedback.
export default function WritingTestPage() {
  const params = useParams<{ testId: string }>()
  return <WritingExam testId={params.testId} />
}
