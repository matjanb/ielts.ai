'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider, useLanguage } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

// Keep existing Stripe checkout logic unchanged
async function handleCheckout(plan: 'monthly' | 'yearly') {
  console.log('Initiating checkout for plan:', plan)
  alert('Stripe integration coming soon. Add your Stripe keys to enable payments.')
}

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    monthly: 19,
    yearly: 14,
    tag: 'Most popular',
    features: [
      'Diagnostic & placement test',
      'Unlimited mock exams',
      'AI Writing examiner (Task 1 + 2)',
      'AI Speaking examiner (live)',
      'Adaptive daily study plan',
      'Full progress analytics',
    ],
    cta: 'Start 7-day trial',
    popular: true,
    elite: false,
  },
  {
    id: 'elite',
    name: 'Elite',
    monthly: 39,
    yearly: 29,
    tag: '+ human tutor',
    features: [
      'Everything in Pro',
      'Weekly 1:1 tutor session',
      'Hand-graded writing reviews',
      'Priority Speaking feedback (4h)',
      'Exam-week boot camp',
    ],
    cta: 'Join Elite',
    popular: false,
    elite: true,
  },
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
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [selected, setSelected] = useState('pro')

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
          Back to dashboard
        </Link>
        <ThemeToggle />
      </header>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '60px 32px 80px' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--text)' }}>
            {t('subscription.title')}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-2)', margin: 0 }}>
            {t('subscription.subtitle')}
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', marginTop: 28, padding: 4, borderRadius: 999, background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
            {(['monthly', 'yearly'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                padding: '8px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: billing === b ? 'var(--bg-elev)' : 'transparent',
                color: billing === b ? 'var(--text)' : 'var(--text-2)',
                boxShadow: billing === b ? 'var(--shadow-sm)' : 'none',
                transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {b === 'monthly' ? 'Monthly' : 'Yearly'}
                {b === 'yearly' && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    -26%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, maxWidth: 760, margin: '0 auto' }}>
          {PLANS.map(plan => {
            const price = billing === 'monthly' ? plan.monthly : plan.yearly
            const isSelected = selected === plan.id
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
                    borderRadius: 999, fontSize: 11, fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}>
                    {plan.tag}
                  </div>
                )}
                {plan.elite && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    padding: '4px 14px', background: 'var(--warn)', color: 'white',
                    borderRadius: 999, fontSize: 11, fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}>
                    {plan.tag}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{plan.name}</h3>
                  {!plan.popular && !plan.elite && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'var(--bg-soft)', padding: '3px 9px', borderRadius: 999, border: '1px solid var(--border)' }}>
                      {plan.tag}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 16, color: 'var(--text-2)' }}>$</span>
                  <span style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{price}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-2)' }}>/ month</span>
                </div>
                {billing === 'yearly' && plan.monthly > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 18 }}>
                    billed ${price * 12}/year · save ${(plan.monthly - plan.yearly) * 12}
                  </div>
                )}

                <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', display: 'grid', gap: 10 }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, alignItems: 'flex-start', color: 'var(--text)' }}>
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={e => { e.stopPropagation(); handleCheckout(billing) }}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                    background: plan.popular ? 'var(--accent)' : 'var(--bg-soft)',
                    color: plan.popular ? 'var(--accent-fg)' : 'var(--text)',
                    border: plan.popular ? 'none' : '1px solid var(--border-strong)',
                    cursor: 'pointer', transition: 'background .15s',
                    justifyContent: 'center', display: 'flex', alignItems: 'center',
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        {/* Trust row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 48, color: 'var(--text-2)', fontSize: 13 }}>
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
