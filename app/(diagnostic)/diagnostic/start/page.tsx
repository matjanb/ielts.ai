'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'

export default function DiagnosticStartPage() {
  const { t } = useLanguage()
  const router = useRouter()

  // Logged-in users who already completed diagnostic → dashboard
  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await (createClient() as any)
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()
      if (profile?.onboarding_completed) {
        router.replace('/dashboard')
      }
    })
  }, [router])

  const features = [
    { text: t('diagnostic.startFeature1') },
    { text: t('diagnostic.startFeature2') },
    { text: t('diagnostic.startFeature3') },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px' }}>

      {/* Eyebrow badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '5px 14px', borderRadius: 999,
        background: 'var(--accent-soft)', color: 'var(--accent)',
        fontSize: 12, fontWeight: 600, marginBottom: 28,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent)' }}/>
        {t('diagnostic.startBadge')}
      </div>

      {/* Heading */}
      <h1 className="animate-fade-up" style={{
        fontSize: 'clamp(36px, 6vw, 64px)',
        fontWeight: 700, letterSpacing: '-0.03em',
        textAlign: 'center', lineHeight: 1.05,
        maxWidth: 640, margin: '0 0 18px',
        color: 'var(--text)',
      }}>
        {t('diagnostic.startTitle')}
      </h1>

      {/* Sub */}
      <p style={{ fontSize: 16, color: 'var(--text-2)', textAlign: 'center', maxWidth: 440, lineHeight: 1.6, margin: '0 0 40px' }}>
        {t('diagnostic.startSubtitle')}
      </p>

      {/* Feature checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40, width: '100%', maxWidth: 400 }}>
        {features.map(({ text }, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7"/>
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{text}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link href="/diagnostic/background" style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '14px 28px', borderRadius: 'var(--radius-lg)',
        fontWeight: 700, fontSize: 16,
        background: 'var(--accent)', color: 'var(--accent-fg)',
        textDecoration: 'none', transition: 'background .15s, transform .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'none' }}
      >
        {t('diagnostic.startCta')}
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7"/>
        </svg>
      </Link>

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
        {t('diagnostic.startNoteAccount')}
      </p>

      <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-2)', textAlign: 'center' }}>
        {t('auth.hasAccount')}{' '}
        <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          {t('auth.signInLink')}
        </Link>
      </p>
    </div>
  )
}
