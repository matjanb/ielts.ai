'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider, useLanguage } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

// Start a Stripe Checkout session for the chosen plan and redirect to it.
async function handleCheckout(planId: string) {
  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId }),
    })
    const data = await res.json()
    if (res.ok && data.url) {
      window.location.href = data.url as string
    } else {
      alert(data.error ?? 'Checkout is not available yet.')
    }
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
  { id: '1mo',  nameKey: 'dur1',  price: 14.99, original: 29.98, months: 1,  popular: false, best: false },
  { id: '3mo',  nameKey: 'dur3',  price: 19.99, original: 39.98, months: 3,  popular: true,  best: false },
  { id: '12mo', nameKey: 'dur12', price: 49.99, original: 99.98, months: 12, popular: false, best: true },
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
  const [selected, setSelected] = useState('3mo')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        padding: '20px 32px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-elev)',
      }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 14, textDecoration: 'none' }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 19l-7-7 7-7"/>
          </svg>
          {t('subscription.back')}
        </Link>
        <ThemeToggle />
      </header>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '60px 32px 80px' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h1 style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--text)' }}>
            {t('subscription.title')}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-2)', margin: 0 }}>
            {t('subscription.subtitle')}
          </p>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
          {PLANS.map(plan => {
            const isSelected = selected === plan.id
            const perMonth = (plan.price / plan.months).toFixed(2)
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
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '3px 9px', borderRadius: 999 }}>
                    {t('pricing.off50')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 6 }}>$</span>
                  <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{plan.price}</span>
                  <span style={{ fontSize: 15, color: 'var(--text-3)', textDecoration: 'line-through', marginBottom: 6 }}>${plan.original}</span>
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
          {['🔒 Stripe-encrypted', '✓ 7-day refund', '✕ Cancel anytime', '⚡ Instant access'].map(item => (
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
