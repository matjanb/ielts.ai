'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider, useLanguage } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { openCheckout } from '@/lib/paddle/client'
import { getUser, signOut } from '@/lib/services/auth'
import { getProfile } from '@/lib/services/user'
import { DiagnosticSync } from '@/components/DiagnosticSync'

// Open the Paddle overlay checkout for the chosen plan.
async function handleCheckout(planId: string) {
  try {
    const { user } = await getUser()
    const opened = await openCheckout(planId, user)
    if (!opened) alert('Checkout is not available yet.')
  } catch {
    alert('Network error. Please try again.')
  }
}

const FEATURES = [
  'Diagnostic & placement test',
  'Unlimited mock exams',
  'AI Writing examiner (Task 1 + 2)',
  'AI Speaking examiner (live)',
  'Adaptive daily study plan',
  'Full progress analytics',
]

const PLANS = [
  { id: '1mo',  nameKey: 'dur1',  price: 19.99,  discountPct: 0,  months: 1,  popular: false, best: false },
  { id: '3mo',  nameKey: 'dur3',  price: 45.99,  discountPct: 30, months: 3,  popular: true,  best: false },
  { id: '12mo', nameKey: 'dur12', price: 119.99, discountPct: 50, months: 12, popular: false, best: true },
]

function CheckIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7"/>
    </svg>
  )
}

function SubscriptionContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const [selected, setSelected] = useState('3mo')
  const [activating, setActivating] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  // Know whether the visitor already has an active plan — only then does
  // "Back to dashboard" make sense (non-subscribers would just bounce back here).
  useEffect(() => {
    getUser().then(async ({ user }) => {
      if (!user) return
      const profile = await getProfile(user.id)
      const s = profile?.subscription_status
      setSubscribed(s === 'pro' || s === 'expert')
    })
  }, [])

  // After a successful Paddle checkout we land here with ?checkout=success.
  // Poll the profile until the webhook flips the status to active, then go to
  // the dashboard. Falls back to the dashboard after a timeout (middleware re-checks).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') !== 'success') return

    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-checkout state
    setActivating(true)
    let cancelled = false
    let tries = 0

    const tick = async () => {
      if (cancelled) return
      tries++
      try {
        const { user } = await getUser()
        if (user) {
          const profile = await getProfile(user.id)
          const status = profile?.subscription_status
          if (status === 'pro' || status === 'expert') { router.replace('/dashboard'); return }
        }
      } catch { /* keep polling */ }
      if (tries < 15) setTimeout(tick, 2000)
      else router.replace('/dashboard')
    }
    tick()
    return () => { cancelled = true }
  }, [router])

  if (activating) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Activating your subscription…</div>
        <div style={{ fontSize: 14, color: 'var(--text-2)' }}>This only takes a few seconds.</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <DiagnosticSync />
      {/* Header */}
      <header style={{
        padding: '20px 32px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-elev)',
      }}>
        {subscribed ? (
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 14, textDecoration: 'none' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 19l-7-7 7-7"/>
            </svg>
            {t('subscription.back')}
          </Link>
        ) : (
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 16, color: 'var(--text)', textDecoration: 'none' }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <path d="M4 19L10 5l3 7 2.5-4L20 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="20" cy="6" r="2" fill="var(--accent)"/>
            </svg>
            ielts<span style={{ color: 'var(--accent)' }}>.</span>camp
          </Link>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={async () => { await signOut(); window.location.href = '/login' }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 14 }}
          >
            Sign out
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(36px, 8vw, 60px) 20px 80px' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h1 style={{ fontSize: 'clamp(30px, 7vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--text)' }}>
            {t('subscription.title')}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-2)', margin: 0 }}>
            {t('subscription.subtitle')}
          </p>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
          {PLANS.map(plan => {
            const isSelected = selected === plan.id
            const perMonth = (plan.price / plan.months).toFixed(2)
            const original = (plan.price / (1 - plan.discountPct / 100)).toFixed(2)
            return (
              <div
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className="card"
                style={{
                  padding: 28, position: 'relative', cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                  borderWidth: isSelected ? 2 : 1,
                  background: plan.popular ? 'var(--accent-soft)' : 'var(--bg-elev)',
                  transform: isSelected ? 'translateY(-4px)' : 'none',
                  transition: 'all .2s',
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    padding: '4px 14px', background: 'var(--accent)', color: 'var(--accent-fg)',
                    borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    {t('pricing.popular')}
                  </div>
                )}
                {plan.best && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    padding: '4px 14px', background: 'var(--warn)', color: 'white',
                    borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    {t('pricing.bestValue')}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{t(`pricing.${plan.nameKey}`)}</h3>
                  {plan.discountPct > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '3px 9px', borderRadius: 999 }}>
                      −{plan.discountPct}%
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 6 }}>$</span>
                  <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{plan.price}</span>
                  {plan.discountPct > 0 && (
                    <span style={{ fontSize: 15, color: 'var(--text-3)', textDecoration: 'line-through', marginBottom: 6 }}>${original}</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
                  {t('pricing.perMo', { p: `$${perMonth}` })}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gap: 10 }}>
                  {FEATURES.map((f, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, alignItems: 'flex-start', color: 'var(--text)' }}>
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={e => { e.stopPropagation(); handleCheckout(plan.id) }}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                    background: plan.popular ? 'var(--accent)' : 'var(--bg-soft)',
                    color: plan.popular ? 'var(--accent-fg)' : 'var(--text)',
                    border: plan.popular ? 'none' : '1px solid var(--border-strong)',
                    cursor: 'pointer', transition: 'background .15s',
                    justifyContent: 'center', display: 'flex', alignItems: 'center',
                  }}
                >
                  {t('subscription.upgradeBtn')}
                </button>
              </div>
            )
          })}
        </div>

        {/* Trust row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 48, color: 'var(--text-2)', fontSize: 13, flexWrap: 'wrap' }}>
          {['🔒 Paddle-encrypted', '✓ 7-day refund', '✕ Cancel anytime', '⚡ Instant access'].map(item => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SubscriptionContent />
      </LanguageProvider>
    </ThemeProvider>
  )
}
