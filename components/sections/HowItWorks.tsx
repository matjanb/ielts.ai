'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

export function HowItWorks() {
  const { t } = useLanguage()

  const steps = [
    { n: '1', title: t('howItWorks.step1Title'), desc: t('howItWorks.step1Desc') },
    { n: '2', title: t('howItWorks.step2Title'), desc: t('howItWorks.step2Desc') },
    { n: '3', title: t('howItWorks.step3Title'), desc: t('howItWorks.step3Desc') },
  ]

  return (
    <section id="how" style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '88px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
            {t('howItWorks.sectionBadge')}
          </div>
          <h2 style={{ fontSize: 40, letterSpacing: '-0.025em', margin: '12px 0 0', fontWeight: 700 }}>
            From day one to <span className="font-serif" style={{ color: 'var(--accent)' }}>exam day</span>, mapped.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {steps.map((step) => (
            <div key={step.n} className="card" style={{ padding: 32 }}>
              <div className="font-serif" style={{ fontSize: 64, lineHeight: 0.9, color: 'var(--accent)', fontWeight: 400 }}>
                0{step.n}
              </div>
              <h3 style={{ fontSize: 19, margin: '22px 0 6px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: 14, margin: 0, lineHeight: 1.55, color: 'var(--text-2)' }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
