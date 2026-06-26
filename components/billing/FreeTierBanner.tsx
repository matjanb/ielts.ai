'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getEntitlement, type Entitlement } from '@/lib/services/entitlement'

// Shown at the top of the dashboard for non-subscribers. Before they've spent
// their free AI mock it invites them to take it; afterwards it nudges to a plan.
// Subscribers (and while loading) see nothing.
export function FreeTierBanner() {
  const { t } = useLanguage()
  const [ent, setEnt] = useState<Entitlement | null>(null)

  useEffect(() => { getEntitlement().then(setEnt) }, [])

  if (!ent || ent.subscribed) return null

  const used = ent.freeMockUsed
  const href = used ? '/subscription' : '/mock-tests'
  const accent = used ? 'var(--warn)' : 'var(--accent)'

  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
      <div
        className="card"
        style={{
          padding: 18, display: 'flex', alignItems: 'center', gap: 16,
          borderColor: accent,
          background: `color-mix(in srgb, ${accent} 7%, var(--bg-elev))`,
        }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 11, flexShrink: 0,
          background: `color-mix(in srgb, ${accent} 18%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            {used
              ? <><path d="M12 3l1.9 5.5L20 9l-4.5 3.5L17 19l-5-3.2L7 19l1.5-6.5L4 9l6.1-.5z"/></>
              : <><path d="M5 3l14 9-14 9z"/></>}
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
            {t(used ? 'freeTier.usedTitle' : 'freeTier.bannerTitle')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            {t(used ? 'freeTier.usedBody' : 'freeTier.bannerBody')}
          </div>
        </div>
        <span style={{
          flexShrink: 0, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: accent, color: used ? 'white' : 'var(--accent-fg)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          {t(used ? 'freeTier.usedCta' : 'freeTier.bannerCta')}
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7"/>
          </svg>
        </span>
      </div>
    </Link>
  )
}
