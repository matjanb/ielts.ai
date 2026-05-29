'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const TIERS = [
  {
    nameKey: 'starterName', priceKey: 'starterPrice', descKey: 'starterDesc',
    featureKeys: ['starterF1','starterF2','starterF3','starterF4','starterF5'],
    ctaKey: 'startFree', href: '/diagnostic/start', popular: false, annualMultiplier: null,
  },
  {
    nameKey: 'proName', priceKey: 'proPrice', descKey: 'proDesc',
    featureKeys: ['proF1','proF2','proF3','proF4','proF5','proF6'],
    ctaKey: 'choosePlan', href: '/diagnostic/start', popular: true, annualMultiplier: 0.7,
  },
  {
    nameKey: 'expertName', priceKey: 'expertPrice', descKey: 'expertDesc',
    featureKeys: ['expertF1','expertF2','expertF3','expertF4','expertF5','expertF6'],
    ctaKey: 'choosePlan', href: '/diagnostic/start', popular: false, annualMultiplier: 0.7,
  },
]

export function Pricing() {
  const { t } = useLanguage()
  const [annual, setAnnual] = useState(false)

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
          <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.6 }}>
            {t('pricing.sectionSubtitle')}
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg-soft)', borderRadius: 12, padding: 4, border: '1px solid var(--border)' }}>
            <button onClick={() => setAnnual(false)} style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: !annual ? 'var(--bg-elev)' : 'transparent',
              color: !annual ? 'var(--text)' : 'var(--text-2)',
              boxShadow: !annual ? 'var(--shadow-sm)' : 'none',
            }}>
              {t('pricing.monthly')}
            </button>
            <button onClick={() => setAnnual(true)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: annual ? 'var(--bg-elev)' : 'transparent',
              color: annual ? 'var(--text)' : 'var(--text-2)',
              boxShadow: annual ? 'var(--shadow-sm)' : 'none',
            }}>
              {t('pricing.annual')}
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {t('pricing.saveLabel')}
              </span>
            </button>
          </div>
        </div>

        {/* Tiers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {TIERS.map(({ nameKey, priceKey, descKey, featureKeys, ctaKey, href, popular, annualMultiplier }) => {
            const basePrice = parseInt(t(`pricing.${priceKey}`))
            const displayPrice = annual && annualMultiplier ? Math.round(basePrice * annualMultiplier) : basePrice
            return (
              <div key={nameKey} style={{
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

                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px', opacity: popular ? 0.8 : 1, color: popular ? 'inherit' : 'var(--text-2)' }}>
                    {t(`pricing.${nameKey}`)}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 10 }}>
                    <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>${displayPrice}</span>
                    {basePrice > 0 && <span style={{ fontSize: 14, marginBottom: 4, opacity: 0.7 }}>{t('pricing.perMonth')}</span>}
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0, opacity: popular ? 0.85 : 1, color: popular ? 'inherit' : 'var(--text-2)' }}>
                    {t(`pricing.${descKey}`)}
                  </p>
                </div>

                <ul style={{ display: 'grid', gap: 10, margin: '0 0 28px', padding: 0, listStyle: 'none', flex: 1 }}>
                  {featureKeys.map(key => (
                    <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14 }}>
                      <Check size={15} strokeWidth={2.5} style={{ marginTop: 1, flexShrink: 0, color: popular ? 'var(--accent-fg)' : 'var(--accent)' }} />
                      <span style={{ opacity: popular ? 0.9 : 1, color: popular ? 'inherit' : 'var(--text-2)' }}>{t(`pricing.${key}`)}</span>
                    </li>
                  ))}
                </ul>

                <Link href={href} style={{
                  display: 'block', textAlign: 'center', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: popular ? 'var(--accent-fg)' : 'transparent',
                  color: popular ? 'var(--accent)' : 'var(--text)',
                  border: popular ? 'none' : '1px solid var(--border-strong)',
                  textDecoration: 'none', transition: 'all .15s',
                }}>
                  {t(`pricing.${ctaKey}`)}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
