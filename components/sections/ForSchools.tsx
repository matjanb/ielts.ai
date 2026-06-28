'use client'

import Link from 'next/link'
import { Building2, Users, BarChart3, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const BENEFITS = [
  { icon: Users,       titleKey: 'forSchools.b1Title', descKey: 'forSchools.b1Desc' },
  { icon: BarChart3,   titleKey: 'forSchools.b2Title', descKey: 'forSchools.b2Desc' },
  { icon: ShieldCheck, titleKey: 'forSchools.b3Title', descKey: 'forSchools.b3Desc' },
]

export function ForSchools() {
  const { t } = useLanguage()
  // The brand wordmark stays styled inline, so split the translated heading on
  // the {{brand}} token and drop the wordmark in between.
  const [titleBefore, titleAfter = ''] = t('forSchools.title').split('{{brand}}')
  return (
    <section id="schools" className="section-pad" style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: 'clamp(56px, 10vw, 96px) 32px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'clamp(28px, 5vw, 56px)', alignItems: 'center' }}>
        {/* Left — pitch */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 18 }}>
            <Building2 size={13} /> {t('forSchools.badge')}
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)', margin: '0 0 16px', lineHeight: 1.1 }}>
            {titleBefore}<span>ielts<span style={{ color: 'var(--accent)' }}>.</span>camp</span>{titleAfter}
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 28px', maxWidth: 460 }}>
            {t('forSchools.pitch')}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="mailto:schools@ielts.camp?subject=ielts.camp%20for%20schools" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 'var(--radius-lg)',
              fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: 'var(--accent-fg)', textDecoration: 'none',
            }}>
              {t('forSchools.contactCta')}
            </Link>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 'var(--radius-lg)',
              fontSize: 14, fontWeight: 600, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-strong)', textDecoration: 'none',
            }}>
              {t('forSchools.tryCta')}
            </Link>
          </div>
        </div>

        {/* Right — benefit cards */}
        <div style={{ display: 'grid', gap: 12 }}>
          {BENEFITS.map(b => (
            <div key={b.titleKey} className="card" style={{ padding: 22, display: 'flex', gap: 16, alignItems: 'flex-start', background: 'var(--bg-elev)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <b.icon size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{t(b.titleKey)}</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55 }}>{t(b.descKey)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
