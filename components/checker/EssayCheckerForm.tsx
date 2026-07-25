'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { track } from '@/lib/analytics/track'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const MIN_WORDS_ESSAY = 50
// Mini diagnostic: a few sentences typed on a phone — most mobile visitors
// don't have an essay at hand (200 page views → 2 submissions before this).
const MIN_WORDS_MINI = 30
const MAX_WORDS = 500

// The writing sample itself is always in English.
const MINI_PROMPTS = [
  'Some people prefer to study alone, while others learn better in a group. Which do you prefer, and why?',
  'Is it better to live in a big city or in a small town? Explain your choice.',
  'Some people believe technology makes our lives easier. Do you agree or disagree? Why?',
]

interface CheckerResult {
  band: number
  criteria: { task: number; coherence: number; lexical: number; grammar: number }
  teaserIssues: { quote: string; issue: string }[]
  totalIssues: number
}

const card: React.CSSProperties = { background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }

export function EssayCheckerForm() {
  const [taskType, setTaskType] = useState<'1' | '2'>('2')
  const [mode, setMode] = useState<'essay' | 'mini'>('essay')
  const [miniPrompt] = useState(() => MINI_PROMPTS[Math.floor(Math.random() * MINI_PROMPTS.length)])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CheckerResult | null>(null)
  const [error, setError] = useState('')
  const [limitHit, setLimitHit] = useState(false)
  const [token, setToken] = useState('')
  const turnstileRef = useRef<HTMLDivElement>(null)

  useEffect(() => { track('checker_viewed') }, [])

  // Render the Turnstile widget as soon as its script is available. Polling
  // (rather than relying on Script.onLoad) handles a cached script that never
  // re-fires onLoad. Non-blocking: if it never loads, submit still works.
  useEffect(() => {
    if (!SITE_KEY) return
    let tries = 0
    const id = setInterval(() => {
      const ts = (window as unknown as { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => void } }).turnstile
      if (ts && turnstileRef.current && turnstileRef.current.childElementCount === 0) {
        ts.render(turnstileRef.current, {
          sitekey: SITE_KEY,
          callback: (t: string) => setToken(t),
          'expired-callback': () => setToken(''),
          'error-callback': () => setToken(''),
        })
        clearInterval(id)
      }
      if (++tries > 50) clearInterval(id) // give up after ~10s
    }, 200)
    return () => clearInterval(id)
  }, [])

  const minWords = mode === 'mini' ? MIN_WORDS_MINI : MIN_WORDS_ESSAY
  const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0
  const tooShort = words > 0 && words < minWords
  // Captcha never blocks the button — it's verified server-side only if a token
  // is present (soft). The button lights as soon as there are enough words.
  const canSubmit = words >= minWords && !loading

  async function submit() {
    if (!canSubmit) return
    setLoading(true); setError(''); setResult(null); setLimitHit(false)
    track('checker_submitted', { taskType, words, mode })
    try {
      const res = await fetch('/api/checker/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          taskType: mode === 'mini' ? '2' : taskType,
          mode,
          ...(mode === 'mini' ? { prompt: miniPrompt } : {}),
          turnstileToken: token,
        }),
      })
      if (res.status === 429) { setLimitHit(true); return }
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong. Please try again.'); return }
      setResult(data as CheckerResult)
      track('checker_result_viewed', { band: data.band })
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {SITE_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}

      {/* ── Input ─────────────────────────────────────────────────────────────── */}
      {!result && !limitHit && (
        <div style={{ ...card, padding: 'clamp(16px, 4vw, 24px)' }}>
          {mode === 'essay' ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {(['1', '2'] as const).map(tt => (
                  <button key={tt} onClick={() => setTaskType(tt)} style={{
                    flex: 1, padding: '10px', minHeight: 44, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${taskType === tt ? 'var(--accent)' : 'var(--border-strong)'}`,
                    background: taskType === tt ? 'var(--accent-soft)' : 'var(--bg-elev)',
                    color: taskType === tt ? 'var(--accent)' : 'var(--text)',
                  }}>Writing Task {tt}</button>
                ))}
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 10px' }}>
                {taskType === '1' ? 'Task 1 — report/letter (aim for 150+ words).' : 'Task 2 — opinion/discussion essay (aim for 250+ words).'}
              </p>
            </>
          ) : (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--accent-soft)', marginBottom: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
                Your topic
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.45 }}>{miniPrompt}</div>
            </div>
          )}

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={mode === 'mini' ? 'Write 3–4 sentences in English here…' : 'Paste your IELTS essay here…'}
            rows={mode === 'mini' ? 6 : 12}
            style={{
              // 16px keeps iOS Safari from zooming into the field.
              width: '100%', resize: 'vertical', padding: 14, borderRadius: 12, fontSize: 16, lineHeight: 1.6,
              border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--text)',
              outline: 'none', fontFamily: 'var(--font-sans)',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
            <span style={{ color: tooShort ? 'var(--danger)' : words > MAX_WORDS ? 'var(--warn)' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
              {words} words {tooShort ? `· need ${minWords}+` : words > MAX_WORDS ? `· max ${MAX_WORDS} graded` : ''}
            </span>
            <button
              onClick={() => { setMode(m => m === 'mini' ? 'essay' : 'mini') }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 0', textAlign: 'right' }}
            >
              {mode === 'mini' ? 'I have a full essay — paste it' : 'No essay? Write a few sentences'}
            </button>
          </div>

          {SITE_KEY && <div ref={turnstileRef} style={{ marginTop: 14 }} />}
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</div>}

          <button onClick={submit} disabled={!canSubmit} style={{
            marginTop: 16, width: '100%', minHeight: 50, padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 700, border: 'none',
            background: canSubmit ? 'var(--accent)' : 'var(--bg-soft)', color: canSubmit ? 'var(--accent-fg)' : 'var(--text-3)',
            cursor: canSubmit ? 'pointer' : 'default',
          }}>
            {loading ? 'Analysing…' : words < minWords ? `Add ${minWords - words} more words` : 'Check my band score'}
          </button>
        </div>
      )}

      {/* ── Rate-limit → signup ───────────────────────────────────────────────── */}
      {limitHit && (
        <div style={{ ...card, padding: 28, textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>You&apos;ve used your free checks for today</h2>
          <p style={{ color: 'var(--text-2)', margin: '0 0 20px' }}>Sign up free to keep checking your essays and unlock the full breakdown.</p>
          <SignupCta />
        </div>
      )}

      {/* ── Result (the conversion moment) ────────────────────────────────────── */}
      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ ...card, padding: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Estimated overall band</div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 72, lineHeight: 1, color: 'var(--accent)', fontWeight: 600, margin: '6px 0 16px' }}>
              {result.band.toFixed(1)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
              {([['Task', result.criteria.task], ['Coherence', result.criteria.coherence], ['Lexical', result.criteria.lexical], ['Grammar', result.criteria.grammar]] as const).map(([label, v]) => (
                <div key={label} style={{ padding: '10px 6px', background: 'var(--bg-soft)', borderRadius: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(1)}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {result.teaserIssues.length > 0 && (
            <div style={{ ...card, padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>A few issues we spotted</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {result.teaserIssues.map((iss, i) => (
                  <div key={i} style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--danger)', fontStyle: 'italic' }}>“{iss.quote}”</span>{' — '}
                    <span style={{ color: 'var(--text-2)' }}>{iss.issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gated value — teaser, blurred, behind signup */}
          <div style={{ ...card, padding: 24, position: 'relative', overflow: 'hidden' }}>
            <div aria-hidden style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none', opacity: 0.6 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px' }}>Full examiner feedback</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                Per-criterion evidence, your {result.totalIssues} corrections with exact fixes, a model rewrite of your
                opening paragraph, and the single change that takes you to the next half band…
              </p>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 20, background: 'color-mix(in srgb, var(--bg-elev) 55%, transparent)' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Fix every mistake → get the full breakdown</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{result.totalIssues} corrections + per-criterion feedback are ready.</div>
              <SignupCta />
            </div>
          </div>

          <button onClick={() => { setResult(null); setContent('') }} style={{
            justifySelf: 'center', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--text-2)', cursor: 'pointer',
          }}>
            Check another essay
          </button>
        </div>
      )}
    </div>
  )
}

function SignupCta() {
  return (
    <Link href="/signup" onClick={() => track('checker_signup_cta_clicked')} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 12,
      fontSize: 14, fontWeight: 700, background: 'var(--accent)', color: 'var(--accent-fg)', textDecoration: 'none',
    }}>
      Sign up free →
    </Link>
  )
}
