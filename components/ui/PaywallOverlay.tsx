'use client'

import { useState } from 'react'
import { openCheckout } from '@/lib/paddle/client'

/* Plans mirror app/subscription/page.tsx. Shown over a blurred dashboard for
 * logged-in users without an active subscription, so they can buy in place. */
const PLANS = [
  { id: '1mo',  label: '1 month',   price: '$19.99',  sub: 'Billed monthly', popular: false },
  { id: '3mo',  label: '3 months',  price: '$45.99',  sub: 'Save 30%',        popular: true  },
  { id: '12mo', label: '12 months', price: '$119.99', sub: 'Save 50%',        popular: false },
]

export function PaywallOverlay({ user }: { user: { id?: string; email?: string } | null }) {
  const [loading, setLoading] = useState<string | null>(null)

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
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 460, width: '100%', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: 20, padding: 28,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
          Unlock full access
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
          Subscribe to use the dashboard, all practice tests and AI feedback.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLANS.map(p => (
            <button
              key={p.id}
              onClick={() => buy(p.id)}
              disabled={loading !== null}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderRadius: 12, cursor: 'pointer', width: '100%',
                border: p.popular ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: p.popular ? 'var(--accent-soft)' : 'var(--bg-soft)',
                opacity: loading && loading !== p.id ? 0.5 : 1,
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{p.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{p.sub}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                {loading === p.id ? '…' : p.price}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
