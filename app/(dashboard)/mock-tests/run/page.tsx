'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/services/auth'
import { saveBandScoreHistory } from '@/lib/services/attempts'
import { track } from '@/lib/analytics/track'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { loadCurrentMock, clearCurrentMock, getMockProgress, type CurrentMock, type MockSkill } from '@/lib/services/mock'
import { ListeningExam } from '@/app/(dashboard)/listening/[testId]/page'
import { ReadingExam } from '@/app/(dashboard)/reading/[testId]/page'
import { WritingExam } from '@/app/(dashboard)/writing/[testId]/page'
import { SpeakingExam } from '@/app/(dashboard)/dashboard/speaking/page'

// IELTS order. A mock always includes Speaking (AI flow); the other three are
// included only when the composer picked a test for them.
const ORDER: MockSkill[] = ['listening', 'reading', 'writing', 'speaking']

function stepsOf(m: CurrentMock): MockSkill[] {
  return ORDER.filter(s =>
    s === 'listening' ? !!m.listeningTestId :
    s === 'reading'   ? !!m.readingTestId :
    s === 'writing'   ? !!m.writingTestId :
    true // speaking
  )
}

export default function MockRunPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [mock, setMock] = useState<CurrentMock | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [bands, setBands] = useState<Partial<Record<MockSkill, number>>>({})
  const savedRef = useRef(false)
  const startedTracked = useRef(false)

  useEffect(() => {
    let active = true
    getUser().then(async ({ user }) => {
      const m = loadCurrentMock()
      // Resume after a refresh: rehydrate sections already completed this mock
      // (since startedAt) and jump to the first unfinished one.
      if (m && user) {
        try {
          const p = await getMockProgress({
            userId: user.id,
            listeningTestId: m.listeningTestId,
            readingTestId: m.readingTestId,
            since: m.startedAt,
          })
          if (active && Object.keys(p).length) {
            setBands(p)
            const order = stepsOf(m)
            const firstOpen = order.findIndex(s => p[s] == null)
            setStepIdx(firstOpen === -1 ? order.length : firstOpen)
          }
        } catch { /* start fresh */ }
      }
      if (!active) return
      setMock(m)
      setUserId(user?.id ?? null)
      if (m && !startedTracked.current) { startedTracked.current = true; track('mock_test_started') }
      setLoaded(true)
    })
    return () => { active = false }
  }, [])

  const steps: MockSkill[] = mock ? stepsOf(mock) : []

  const allDone = steps.length > 0 && stepIdx >= steps.length
  // Overall is a plain average of the section bands (no AI, no tokens), and only
  // exists once every section of this mock is complete.
  const overall = allDone
    ? Math.round((steps.reduce((a, s) => a + (bands[s] ?? 0), 0) / steps.length) * 2) / 2
    : null

  // Persist the overall band once, only when the whole mock is finished.
  useEffect(() => {
    if (!allDone || !userId || overall == null || savedRef.current) return
    savedRef.current = true
    saveBandScoreHistory(userId, 'overall', overall).catch(() => {})
    track('mock_test_completed', { overall })
  }, [allDone, userId, overall])

  function complete(skill: MockSkill, band: number) {
    setBands(prev => ({ ...prev, [skill]: band }))
    setStepIdx(i => i + 1)
  }

  function finish() {
    clearCurrentMock()
    router.push('/dashboard')
  }

  if (!loaded) return null

  if (!mock) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: 'var(--text-2)' }}>{t('mock.noMock')}</p>
        <Link href="/mock-tests" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>← {t('mock.buildMock')}</Link>
      </div>
    )
  }

  // ── Final summary — overall band only after every section ────────────────────
  if (allDone) {
    return (
      <div style={{ padding: '32px 32px 80px', maxWidth: 620, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{t('mock.overallBand')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 80, lineHeight: 1, color: 'var(--accent)', fontWeight: 600, margin: '6px 0' }}>
            {overall != null ? overall.toFixed(1) : '—'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map(s => (
            <div key={s} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t('dashboard.' + s)}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
                {bands[s] != null ? bands[s]!.toFixed(1) : '—'}
              </span>
            </div>
          ))}
        </div>
        <button onClick={finish} style={{
          marginTop: 24, width: '100%', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700,
          background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer',
        }}>
          {t('mock.finishClear')}
        </button>
      </div>
    )
  }

  // ── Active section — rendered inline; no navigation out of the mock ───────────
  const current = steps[stepIdx]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{
        flexShrink: 0, padding: '10px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          {t('mock.yourMock')}
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          {steps.map((s, i) => (
            <span key={s} title={t('dashboard.' + s)} style={{
              width: i === stepIdx ? 22 : 8, height: 8, borderRadius: 999,
              background: i < stepIdx ? 'var(--accent)' : i === stepIdx ? 'var(--accent)' : 'var(--border-strong)',
              opacity: i === stepIdx ? 1 : i < stepIdx ? 0.6 : 1, transition: 'all .3s',
            }} />
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
          {t('dashboard.' + current)} · {stepIdx + 1}/{steps.length}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {current === 'listening' && <ListeningExam testId={mock.listeningTestId!} embedded onComplete={b => complete('listening', b)} />}
        {current === 'reading'   && <ReadingExam   testId={mock.readingTestId!}   embedded onComplete={b => complete('reading', b)} />}
        {current === 'writing'   && <WritingExam   testId={mock.writingTestId!}   embedded onComplete={b => complete('writing', b)} />}
        {current === 'speaking'  && <SpeakingExam embedded onComplete={b => complete('speaking', b)} />}
      </div>
    </div>
  )
}
