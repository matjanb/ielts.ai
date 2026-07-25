'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage, LanguageProvider } from '@/lib/i18n/LanguageContext'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { createClient } from '@/lib/supabase/client'
import { saveOnboardingData, completeOnboarding } from '@/lib/services/user'
import { track } from '@/lib/analytics/track'
import type { CurrentLevel, Timeline } from '@/lib/types/database'

const TOTAL_STEPS = 3
const BAND_MIN = 4
const BAND_MAX = 9
const MIN_WORDS_MINI = 30
const MIN_WORDS_ESSAY = 50

// The writing sample itself is always in English — only the UI is localised.
const MINI_PROMPTS = [
  'Some people prefer to study alone, while others learn better in a group. Which do you prefer, and why?',
  'Is it better to live in a big city or in a small town? Explain your choice.',
  'Some people believe technology makes our lives easier. Do you agree or disagree? Why?',
]

type Phase = 'aha' | 'result' | 'survey'

interface CheckResult {
  band: number
  criteria: { task: number; coherence: number; lexical: number; grammar: number }
  teaserIssues: { quote: string; issue: string; fix?: string }[]
  nextBandTip?: string
}

type Answers = {
  targetBand: number
  currentLevel: CurrentLevel | null
  timeline: Timeline | null
}

function OnboardingContent() {
  const { t } = useLanguage()
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('aha')
  const [miniPrompt] = useState(() => MINI_PROMPTS[Math.floor(Math.random() * MINI_PROMPTS.length)])
  const [mode, setMode] = useState<'mini' | 'essay'>('mini')
  const [content, setContent] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [answers, setAnswers] = useState<Answers>({
    targetBand: 7,
    currentLevel: null,
    timeline: null,
  })

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
    track('onboarding_started')
  }, [router])

  const minWords = mode === 'mini' ? MIN_WORDS_MINI : MIN_WORDS_ESSAY
  const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0
  const canCheck = words >= minWords && !checking

  async function check() {
    if (!canCheck) return
    setChecking(true); setCheckError('')
    track('onboarding_aha_submitted', { mode, words })
    try {
      const res = await fetch('/api/checker/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          taskType: '2',
          mode,
          ...(mode === 'mini' ? { prompt: miniPrompt } : {}),
        }),
      })
      if (res.status === 429) { skipToSurvey(); return } // check pool exhausted — never trap
      const data = await res.json()
      if (!res.ok) { setCheckError(data.error ?? 'Something went wrong.'); return }
      setResult(data as CheckResult)
      setPhase('result')
      // Suggest a target the examiner result makes emotionally concrete.
      const suggested = Math.min(BAND_MAX, Math.max(BAND_MIN, Math.round((data.band + 1) * 2) / 2))
      setAnswers(a => ({ ...a, targetBand: suggested }))
      track('onboarding_aha_result_viewed', { band: data.band, mode })
    } catch {
      setCheckError('Network error. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  function skipToSurvey() {
    track('onboarding_aha_skipped')
    setPhase('survey')
  }

  // Can't advance until the current step has an answer (target band always has one).
  const canAdvance =
    step === 1 ? true :
    step === 2 ? answers.currentLevel != null :
    answers.timeline != null

  async function finish() {
    setSaving(true)
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) { setSaving(false); return }

    await saveOnboardingData(user.id, {
      experience: null,
      target_band: answers.targetBand,
      current_level: answers.currentLevel,
      timeline: answers.timeline,
      // Inferred later from the first mock — not asked up front.
      focus_skills: ['writing', 'speaking'],
      study_goal: null,
      daily_hours: null,
    })
    await completeOnboarding(user.id)
    track('onboarding_survey_completed', { aha: result != null })
    router.push('/dashboard')
  }

  const progress =
    phase === 'aha' ? 10 :
    phase === 'result' ? 30 :
    30 + (step / TOTAL_STEPS) * 70

  return (
    <div style={{ minHeight: 'var(--full-h)', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elev)',
      }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 16, color: 'var(--text)', textDecoration: 'none' }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <path d="M4 19L10 5l3 7 2.5-4L20 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="20" cy="6" r="2" fill="var(--accent)"/>
          </svg>
          ielts<span style={{ color: 'var(--accent)' }}>.</span>camp
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--bg-soft)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width .4s cubic-bezier(.2,.7,.2,1)' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: phase === 'survey' ? 'center' : 'flex-start', padding: 'clamp(16px, 4vw, 40px) 16px 32px' }}>
        <div style={{ width: '100%', maxWidth: 540 }}>

          {/* ── Phase 1: the aha check ─────────────────────────────────────── */}
          {phase === 'aha' && (
            <div className="animate-fade-up">
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                  {t('onboarding.ahaEyebrow')}
                </div>
                <h1 style={{ fontSize: 'clamp(22px, 6vw, 30px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.12 }}>
                  {t('onboarding.ahaTitle')}
                </h1>
                <p style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>
                  {t('onboarding.ahaSubtitle')}
                </p>
              </div>

              <div className="card" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
                {mode === 'mini' && (
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--accent-soft)', marginBottom: 12 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
                      {t('onboarding.ahaMiniPromptLabel')}
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.45 }}>{miniPrompt}</div>
                  </div>
                )}

                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={mode === 'mini' ? t('onboarding.ahaPlaceholderMini') : t('onboarding.ahaPlaceholderEssay')}
                  rows={mode === 'mini' ? 6 : 10}
                  autoFocus
                  style={{
                    width: '100%', resize: 'vertical', padding: 14, borderRadius: 12,
                    // 16px keeps iOS Safari from zooming into the field.
                    fontSize: 16, lineHeight: 1.6,
                    border: '1px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--text)',
                    outline: 'none', fontFamily: 'var(--font-sans)',
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                    {words < minWords
                      ? t('onboarding.ahaWordsMore', { n: String(minWords - words) })
                      : `${words} ✓`}
                  </span>
                  <button
                    onClick={() => { setMode(m => m === 'mini' ? 'essay' : 'mini') }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 0', textAlign: 'right' }}
                  >
                    {mode === 'mini' ? t('onboarding.ahaHaveEssay') : t('onboarding.ahaWriteMini')}
                  </button>
                </div>

                {checkError && (
                  <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>
                    {checkError} <button onClick={check} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>{t('onboarding.ahaRetry')}</button>
                  </div>
                )}

                <button onClick={check} disabled={!canCheck} style={{
                  marginTop: 14, width: '100%', minHeight: 50, padding: '14px 16px', borderRadius: 12, fontSize: 15.5, fontWeight: 700, border: 'none',
                  background: canCheck ? 'var(--accent)' : 'var(--bg-soft)', color: canCheck ? 'var(--accent-fg)' : 'var(--text-3)',
                  cursor: canCheck ? 'pointer' : 'default', transition: 'background .15s',
                }}>
                  {checking ? t('onboarding.ahaChecking') : t('onboarding.ahaCheck')}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button onClick={skipToSurvey} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '10px 16px' }}>
                  {t('onboarding.ahaSkip')} →
                </button>
              </div>
            </div>
          )}

          {/* ── Phase 2: the result (the aha moment) ───────────────────────── */}
          {phase === 'result' && result && (
            <div className="animate-fade-up" style={{ display: 'grid', gap: 14 }}>
              <div className="card" style={{ padding: 'clamp(22px, 5vw, 32px)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                  {t('onboarding.resultEyebrow')}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(64px, 20vw, 84px)', lineHeight: 1, color: 'var(--accent)', fontWeight: 600, margin: '8px 0 16px' }}>
                  {result.band.toFixed(1)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                  {([
                    ['Task', result.criteria.task],
                    ['Coherence', result.criteria.coherence],
                    ['Vocabulary', result.criteria.lexical],
                    ['Grammar', result.criteria.grammar],
                  ] as const).map(([label, v]) => (
                    <div key={label} style={{ padding: '10px 6px', background: 'var(--bg-soft)', borderRadius: 10 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(1)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {mode === 'mini' && (
                  <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '14px 0 0', lineHeight: 1.5 }}>
                    {t('onboarding.resultMiniNote')}
                  </p>
                )}
              </div>

              {result.teaserIssues.length > 0 && (
                <div className="card" style={{ padding: 'clamp(16px, 4vw, 22px)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>{t('onboarding.resultIssuesTitle')}</h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {result.teaserIssues.map((iss, i) => (
                      <div key={i} style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                        <span style={{ color: 'var(--danger)', fontStyle: 'italic' }}>“{iss.quote}”</span>{' — '}
                        <span style={{ color: 'var(--text-2)' }}>{iss.issue}</span>
                        {iss.fix && (
                          <div style={{ marginTop: 3, color: 'var(--text)' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{t('onboarding.resultFixLabel')}</span>{' '}
                            {iss.fix}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.nextBandTip && (
                <div className="card" style={{ padding: 'clamp(16px, 4vw, 22px)', borderColor: 'var(--accent)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px', color: 'var(--accent)' }}>{t('onboarding.resultTipTitle')}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{result.nextBandTip}</p>
                </div>
              )}

              <button onClick={() => setPhase('survey')} style={{
                width: '100%', minHeight: 50, padding: '14px 16px', borderRadius: 12, fontSize: 15.5, fontWeight: 700, border: 'none',
                background: 'var(--accent)', color: 'var(--accent-fg)', cursor: 'pointer',
              }}>
                {t('onboarding.resultContinue')} →
              </button>
            </div>
          )}

          {/* ── Phase 3: the 3-question survey ─────────────────────────────── */}
          {phase === 'survey' && (
            <>
              {/* Step dots */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 36 }}>
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                  <div key={i} style={{
                    height: 6, borderRadius: 999, transition: 'all .3s',
                    width: i + 1 === step ? 26 : 6,
                    background: i + 1 <= step ? 'var(--accent)' : 'var(--border-strong)',
                  }} />
                ))}
              </div>

              <div key={step} className="animate-fade-up">
                {step === 1 && (
                  <StepCard
                    eyebrow={`${t('onboarding.step')} 1 / ${TOTAL_STEPS}`}
                    title={result ? t('onboarding.surveyBandLead', { band: result.band.toFixed(1) }) : t('onboarding.q2Title')}
                  >
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 88, lineHeight: 1, color: 'var(--accent)', fontWeight: 600 }}>
                        {answers.targetBand.toFixed(1)}
                      </div>
                      <input
                        type="range"
                        min={BAND_MIN}
                        max={BAND_MAX}
                        step={0.5}
                        value={answers.targetBand}
                        onChange={e => setAnswers(a => ({ ...a, targetBand: parseFloat(e.target.value) }))}
                        style={{ width: '100%', marginTop: 28, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', marginTop: 6 }}>
                        <span>{BAND_MIN.toFixed(1)}</span>
                        <span>{BAND_MAX.toFixed(1)}</span>
                      </div>
                    </div>
                  </StepCard>
                )}

                {step === 2 && (
                  <StepCard eyebrow={`${t('onboarding.step')} 2 / ${TOTAL_STEPS}`} title={t('onboarding.q3Title')}>
                    {([
                      ['beginner', t('onboarding.q3Opt1')],
                      ['intermediate', t('onboarding.q3Opt2')],
                      ['upper_intermediate', t('onboarding.q3Opt3')],
                      ['advanced', t('onboarding.q3Opt4')],
                    ] as [CurrentLevel, string][]).map(([value, label]) => (
                      <OptionButton
                        key={value}
                        label={label}
                        selected={answers.currentLevel === value}
                        onClick={() => setAnswers(a => ({ ...a, currentLevel: value }))}
                      />
                    ))}
                  </StepCard>
                )}

                {step === 3 && (
                  <StepCard eyebrow={`${t('onboarding.step')} 3 / ${TOTAL_STEPS}`} title={t('onboarding.q4Title')}>
                    {([
                      ['within_1_month', t('onboarding.q4Opt1')],
                      ['1_3_months', t('onboarding.q4Opt2')],
                      ['3_6_months', t('onboarding.q4Opt3')],
                      ['not_sure', t('onboarding.q4Opt4')],
                    ] as [Timeline, string][]).map(([value, label]) => (
                      <OptionButton
                        key={value}
                        label={label}
                        selected={answers.timeline === value}
                        onClick={() => setAnswers(a => ({ ...a, timeline: value }))}
                      />
                    ))}
                  </StepCard>
                )}
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32 }}>
                <button
                  onClick={() => setStep(s => Math.max(1, s - 1))}
                  disabled={step === 1}
                  style={{
                    padding: '12px 16px', minHeight: 46, borderRadius: 10, fontSize: 14, fontWeight: 600,
                    background: 'transparent', border: 'none', color: 'var(--text-3)',
                    cursor: step === 1 ? 'default' : 'pointer', opacity: step === 1 ? 0 : 1,
                  }}
                >
                  ← {t('onboarding.back')}
                </button>

                {step < TOTAL_STEPS ? (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    disabled={!canAdvance}
                    style={{
                      padding: '12px 24px', minHeight: 46, borderRadius: 10, fontSize: 14, fontWeight: 700,
                      background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
                      cursor: canAdvance ? 'pointer' : 'default', opacity: canAdvance ? 1 : 0.5,
                    }}
                  >
                    {t('onboarding.next')} →
                  </button>
                ) : (
                  <button
                    onClick={finish}
                    disabled={!canAdvance || saving}
                    style={{
                      padding: '12px 24px', minHeight: 46, borderRadius: 10, fontSize: 14, fontWeight: 700,
                      background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
                      cursor: !canAdvance || saving ? 'default' : 'pointer', opacity: !canAdvance || saving ? 0.5 : 1,
                    }}
                  >
                    {saving ? '…' : t('onboarding.finish')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StepCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 'clamp(24px, 5vw, 36px)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10, textAlign: 'center' }}>
        {eyebrow}
      </div>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)', textAlign: 'center', margin: '0 0 24px', lineHeight: 1.15 }}>
        {title}
      </h1>
      <div style={{ display: 'grid', gap: 10 }}>{children}</div>
    </div>
  )
}

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
        padding: '15px 18px', minHeight: 50, borderRadius: 'var(--radius)', fontSize: 14.5, fontWeight: 500, textAlign: 'left',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-strong)'}`,
        background: selected ? 'var(--accent-soft)' : 'var(--bg-elev)',
        color: selected ? 'var(--accent)' : 'var(--text)',
        cursor: 'pointer', transition: 'border-color .15s, background .15s',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--accent)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border-strong)' }}
    >
      {label}
      <span style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-strong)'}`,
        background: selected ? 'var(--accent)' : 'transparent',
      }}>
        {selected && (
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7"/>
          </svg>
        )}
      </span>
    </button>
  )
}

export default function OnboardingPage() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <OnboardingContent />
      </LanguageProvider>
    </ThemeProvider>
  )
}
