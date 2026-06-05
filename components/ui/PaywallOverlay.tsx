'use client'

import { useState } from 'react'
import { openCheckout } from '@/lib/paddle/client'

/* Plans mirror app/subscription/page.tsx. Shown over a blurred dashboard for
 * logged-in users without an active subscription, so they can buy in place. */
const PLANS = [
  { id: '1mo',  label: '1 month',   price: 19.99,  discountPct: 0,  months: 1,  popular: false },
  { id: '3mo',  label: '3 months',  price: 45.99,  discountPct: 30, months: 3,  popular: true  },
  { id: '12mo', label: '12 months', price: 119.99, discountPct: 50, months: 12, popular: false },
]

const FEATURES = [
  'Diagnostic & placement test',
  'Unlimited mock exams',
  'AI Writing examiner (Task 1 + 2)',
  'AI Speaking examiner (live)',
  'Adaptive daily study plan',
  'Full progress analytics',
]

function Check() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M5 12l5 5L20 7"/>
    </svg>
  )
}

export function PaywallOverlay({ user }: { user: { id?: string; email?: string } | null }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [selected, setSelected] = useState('3mo')

  async function buy(planId: string) {
    setLoading(planId)
    try {
      const opened = await openCheckout(planId, user)
      if (!opened) alert('Checkout is not available yet.')
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50, padding: 24,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto',
    }}>
      <div style={{
        maxWidth: 480, width: '100%', margin: 'auto', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: 20, padding: 28,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}>
        {/* Social proof */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px',
          borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)',
          fontSize: 12.5, fontWeight: 600, marginBottom: 16,
        }}>
          <span style={{ fontSize: 13 }}>★</span> Join 100,000+ learners
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Unlock full access
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 22, lineHeight: 1.5 }}>
          Subscribe to use the dashboard, all practice tests and unlimited AI feedback.
        </div>

        {/* Plans */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {PLANS.map(p => {
            const perMonth = (p.price / p.months).toFixed(2)
            const original = (p.price / (1 - p.discountPct / 100)).toFixed(2)
            const isSel = selected === p.id
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                disabled={loading !== null}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '15px 18px', borderRadius: 14, cursor: 'pointer', width: '100%', textAlign: 'left',
                  border: isSel ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: isSel ? 'var(--accent-soft)' : 'var(--bg-soft)',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                {p.popular && (
                  <span style={{
                    position: 'absolute', top: -9, left: 16, padding: '2px 8px', borderRadius: 999,
                    background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 11, fontWeight: 700,
                  }}>
                    MOST POPULAR
                  </span>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{p.label}</span>
                    {p.discountPct > 0 && (
                      <span style={{ padding: '1px 7px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 11, fontWeight: 700 }}>
                        −{p.discountPct}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3 }}>${perMonth}/mo</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {p.discountPct > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'line-through' }}>${original}</div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>${p.price.toFixed(2)}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* CTA */}
        <button
          onClick={() => buy(selected)}
          disabled={loading !== null}
          style={{
            width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 20px', borderRadius: 12, cursor: 'pointer', border: 'none',
            background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 16, fontWeight: 700,
            opacity: loading !== null ? 0.7 : 1, marginBottom: 22,
          }}
        >
          {loading ? 'Opening checkout…' : 'Continue to payment'}
        </button>

        {/* What you get */}
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Everything included
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
          {FEATURES.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5, color: 'var(--text)' }}>
              <Check /><span>{f}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 20 }}>
          Cancel anytime · Secure payment by Paddle
        </div>
      </div>
    </div>
  )
}
