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
import type { CurrentLevel, Timeline } from '@/lib/types/database'

const TOTAL_STEPS = 3
const BAND_MIN = 4
const BAND_MAX = 9

type Answers = {
  targetBand: number
  currentLevel: CurrentLevel | null
  timeline: Timeline | null
}

function OnboardingContent() {
  const { t } = useLanguage()
  const router = useRouter()
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
  }, [router])

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
    router.push('/dashboard')
  }

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elev)',
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 540 }}>
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
              <StepCard eyebrow={`${t('onboarding.step')} 1 / ${TOTAL_STEPS}`} title={t('onboarding.q2Title')}>
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
                padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600,
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
                  padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700,
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
                  padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none',
                  cursor: !canAdvance || saving ? 'default' : 'pointer', opacity: !canAdvance || saving ? 0.5 : 1,
                }}
              >
                {saving ? '…' : t('onboarding.finish')}
              </button>
            )}
          </div>
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
        padding: '15px 18px', borderRadius: 'var(--radius)', fontSize: 14.5, fontWeight: 500, textAlign: 'left',
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
