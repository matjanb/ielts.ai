'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/services/auth'
import { saveBandScoreHistory } from '@/lib/services/attempts'
import { track } from '@/lib/analytics/track'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import {
  loadCurrentMock, clearCurrentMock, getMockProgress,
  type CurrentMock, type MockProgress, type MockSkill,
} from '@/lib/services/mock'

interface Section {
  skill: MockSkill
  label: string
  title: string
  href: string | null // null = not part of this mock
}

const ICONS: Record<MockSkill, React.ReactNode> = {
  listening: <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z"/></>,
  reading: <><path d="M4 4h7a3 3 0 0 1 3 3v13"/><path d="M20 4h-7a3 3 0 0 0-3 3"/><path d="M4 4v15a1 1 0 0 0 1 1h15"/></>,
  writing: <path d="M14 4l6 6L9 21H3v-6z"/>,
  speaking: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>,
}

export default function MockRunPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [mock, setMock] = useState<CurrentMock | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [progress, setProgress] = useState<MockProgress>({})
  const [loaded, setLoaded] = useState(false)
  const [tick, setTick] = useState(0) // bump to reload progress (button / focus)
  const startedTracked = useRef(false)

  useEffect(() => {
    let active = true
    async function load() {
      const m = loadCurrentMock()
      const { user } = await getUser()
      if (!active) return
      setMock(m)
      setUserId(user?.id ?? null)
      if (m && !startedTracked.current) { startedTracked.current = true; track('mock_test_started') }
      if (m && user) {
        const p = await getMockProgress({
          userId: user.id,
          listeningTestId: m.listeningTestId,
          readingTestId: m.readingTestId,
          since: m.startedAt,
        })
        if (active) setProgress(p)
      }
      if (active) setLoaded(true)
    }
    load()
    const onFocus = () => setTick(t => t + 1)
    window.addEventListener('focus', onFocus)
    return () => { active = false; window.removeEventListener('focus', onFocus) }
  }, [tick])

  const sections: Section[] = mock ? [
    { skill: 'listening', label: t('dashboard.listening'), title: mock.listeningTitle ?? t('mock.fbListening'), href: mock.listeningTestId ? `/listening/${mock.listeningTestId}` : null },
    { skill: 'reading', label: t('dashboard.reading'), title: mock.readingTitle ?? t('mock.fbReading'), href: mock.readingTestId ? `/reading/${mock.readingTestId}` : null },
    { skill: 'writing', label: t('dashboard.writing'), title: mock.writingTitle ?? t('mock.fbWriting'), href: mock.writingTestId ? '/dashboard/writing' : null },
    { skill: 'speaking', label: t('dashboard.speaking'), title: t('mock.fbSpeaking'), href: '/dashboard/speaking' },
  ] : []

  const included = sections.filter(s => s.href)
  const doneBands = included.map(s => progress[s.skill]).filter((b): b is number => b != null)
  const allDone = included.length > 0 && doneBands.length === included.length
  const overall = doneBands.length > 0 ? Math.round((doneBands.reduce((a, b) => a + b, 0) / doneBands.length) * 2) / 2 : null

  // record an overall band once, when every section of this mock is complete
  useEffect(() => {
    if (!mock || !userId || !allDone || overall == null) return
    const flag = `mock:overall-saved:${mock.id}`
    if (localStorage.getItem(flag)) return
    localStorage.setItem(flag, '1')
    saveBandScoreHistory(userId, 'overall', overall).catch(() => {})
    track('mock_test_completed', { overall })
  }, [mock, userId, allDone, overall])

  if (loaded && !mock) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: 'var(--text-2)' }}>{t('mock.noMock')}</p>
        <Link href="/mock-tests" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>← {t('mock.buildMock')}</Link>
      </div>
    )
  }

  function endMock() {
    clearCurrentMock()
    router.push('/mock-tests')
  }

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 760, margin: '0 auto' }}>
      <Link href="/mock-tests" style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}>← {t('mock.back')}</Link>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, margin: '10px 0 24px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{t('mock.yourMock')}</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-3)' }}>
            {t('mock.subtitle')} {doneBands.length}/{included.length} {t('mock.done')}.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)' }}>{t('mock.overallBand')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 44, lineHeight: 1, color: 'var(--accent)', fontWeight: 600 }}>
            {overall != null ? overall.toFixed(1) : '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sections.map(s => {
          const band = progress[s.skill]
          const done = band != null
          const disabled = !s.href
          return (
            <div key={s.skill} className="card" style={{
              padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16,
              opacity: disabled ? 0.5 : 1,
              border: done ? '1px solid var(--accent)' : '1px solid var(--border)',
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: done ? 'var(--accent)' : 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={done ? 'var(--accent-fg)' : 'var(--text-2)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {ICONS[s.skill]}
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{s.label}</div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {disabled ? t('mock.notIncluded') : s.title}
                </div>
              </div>
              {disabled ? (
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>
              ) : done ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{band!.toFixed(1)}</span>
                  <Link href={s.href!} style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none' }}>{t('mock.retake')}</Link>
                </div>
              ) : (
                <Link href={s.href!} style={{
                  padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  background: 'var(--accent)', color: 'var(--accent-fg)', textDecoration: 'none', flexShrink: 0,
                }}>
                  {t('mock.start')} →
                </Link>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
        <button onClick={() => setTick(t => t + 1)} style={{ padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'var(--bg-soft)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          {t('mock.refresh')}
        </button>
        <button onClick={endMock} style={{ padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          {allDone ? t('mock.finishClear') : t('mock.discard')}
        </button>
      </div>
    </div>
  )
}
