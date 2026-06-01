'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const FEATURE_KEYS = ['proF1', 'proF2', 'proF3', 'proF4', 'proF5', 'proF6']

const PLANS = [
  { id: '1mo',  nameKey: 'dur1',  price: 14.99, original: 29.98, months: 1,  popular: false, best: false },
  { id: '3mo',  nameKey: 'dur3',  price: 19.99, original: 39.98, months: 3,  popular: true,  best: false },
  { id: '12mo', nameKey: 'dur12', price: 49.99, original: 99.98, months: 12, popular: false, best: true },
]

export function Pricing() {
  const { t } = useLanguage()

  return (
    <section id="pricing" style={{ padding: '96px 32px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 12px' }}>
            {t('pricing.sectionBadge')}
          </p>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)', margin: '0 0 14px' }}>
            {t('pricing.sectionTitle')}
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
            {t('pricing.sectionSubtitle')}
          </p>
        </div>

        {/* Tiers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 980, margin: '0 auto' }}>
          {PLANS.map(({ id, nameKey, price, original, months, popular, best }) => {
            const perMonth = (price / months).toFixed(2)
            return (
              <div key={id} style={{
                position: 'relative', display: 'flex', flexDirection: 'column',
                borderRadius: 18, padding: 28,
                background: popular ? 'var(--accent)' : 'var(--bg-elev)',
                color: popular ? 'var(--accent-fg)' : 'var(--text)',
                border: `1px solid ${popular ? 'var(--accent)' : 'var(--border)'}`,
                boxShadow: popular ? 'var(--shadow-lg)' : 'none',
              }}>
                {popular && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    padding: '4px 12px', borderRadius: 999, background: 'var(--text)', color: 'var(--bg)',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {t('pricing.popular')}
                  </div>
                )}
                {best && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    padding: '4px 12px', borderRadius: 999, background: 'var(--warn)', color: '#fff',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {t('pricing.bestValue')}
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, opacity: popular ? 0.85 : 1, color: popular ? 'inherit' : 'var(--text-2)' }}>
                      {t(`pricing.${nameKey}`)}
                    </h3>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                      background: popular ? 'var(--accent-fg)' : 'var(--accent-soft)',
                      color: popular ? 'var(--accent)' : 'var(--accent)',
                    }}>
                      {t('pricing.off50')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>${price}</span>
                    <span style={{ fontSize: 16, marginBottom: 5, textDecoration: 'line-through', opacity: 0.55 }}>${original}</span>
                  </div>
                  <div style={{ fontSize: 13, opacity: popular ? 0.8 : 1, color: popular ? 'inherit' : 'var(--text-3)' }}>
                    {t('pricing.perMo', { p: `$${perMonth}` })}
                  </div>
                </div>

                <ul style={{ display: 'grid', gap: 10, margin: '0 0 28px', padding: 0, listStyle: 'none', flex: 1 }}>
                  {FEATURE_KEYS.map(key => (
                    <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14 }}>
                      <Check size={15} strokeWidth={2.5} style={{ marginTop: 1, flexShrink: 0, color: popular ? 'var(--accent-fg)' : 'var(--accent)' }} />
                      <span style={{ opacity: popular ? 0.9 : 1, color: popular ? 'inherit' : 'var(--text-2)' }}>{t(`pricing.${key}`)}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/diagnostic/start" style={{
                  display: 'block', textAlign: 'center', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: popular ? 'var(--accent-fg)' : 'var(--accent)',
                  color: popular ? 'var(--accent)' : 'var(--accent-fg)',
                  border: 'none', textDecoration: 'none', transition: 'all .15s',
                }}>
                  {t('pricing.choosePlan')}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
