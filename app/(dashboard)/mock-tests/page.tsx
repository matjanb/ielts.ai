'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getListeningTests, getReadingTests, getWritingTests } from '@/lib/services/tests'
import { getDashboardData } from '@/lib/services/progress'
import { getUser } from '@/lib/services/auth'
import { saveCurrentMock, loadCurrentMock, type CurrentMock } from '@/lib/services/mock'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { IeltsTest } from '@/lib/types/database'

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13.5,
  border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', color: 'var(--text)',
  outline: 'none', cursor: 'pointer',
}

export default function MockTestsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [previousMocks, setPreviousMocks] = useState<Array<{ date: string; band: number }>>([])
  const [readiness, setReadiness] = useState<number | null>(null)
  const [weakSkills, setWeakSkills] = useState<Array<{ skill: string; band: number }>>([])

  // Composer state
  const [listening, setListening] = useState<IeltsTest[]>([])
  const [reading, setReading] = useState<IeltsTest[]>([])
  const [writing, setWriting] = useState<IeltsTest[]>([])
  const [lid, setLid] = useState('')
  const [rid, setRid] = useState('')
  const [wid, setWid] = useState('')
  const [resumable, setResumable] = useState<CurrentMock | null>(null)

  useEffect(() => {
    async function loadTests() {
      setResumable(loadCurrentMock())
      const [l, r, w] = await Promise.all([getListeningTests(), getReadingTests(), getWritingTests()])
      setListening(l); setReading(r); setWriting(w)
      setLid(l[0]?.id ?? ''); setRid(r[0]?.id ?? ''); setWid(w[0]?.id ?? '')
    }
    loadTests()

    async function loadStats() {
      const { user } = await getUser()
      if (!user) return
      const d = await getDashboardData(user.id)

      const mocks = (d.attempts ?? [])
        .filter((a) => a.band_score != null && a.completed_at)
        .slice(0, 5)
        .map((a) => ({
          date: new Date(a.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          band: a.band_score as number,
        }))
      setPreviousMocks(mocks)

      const latest: Record<string, number> = {}
      for (const row of (d.bandHistory ?? [])) {
        if (latest[row.skill] == null && row.skill !== 'overall') latest[row.skill] = row.score
      }
      const skillEntries = Object.entries(latest)
      if (skillEntries.length > 0) {
        const avg = skillEntries.reduce((s, [, v]) => s + v, 0) / skillEntries.length
        const target = d.profile?.target_band_score ?? 7.5
        setReadiness(Math.min(100, Math.round((avg / target) * 100)))
        setWeakSkills(skillEntries.map(([skill, band]) => ({ skill, band })).sort((a, b) => a.band - b.band).slice(0, 3))
      }
    }
    loadStats()
  }, [])

  function autoFill() {
    setLid(listening[0]?.id ?? ''); setRid(reading[0]?.id ?? ''); setWid(writing[0]?.id ?? '')
  }

  function startMock() {
    const mock: CurrentMock = {
      id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
      startedAt: new Date().toISOString(),
      listeningTestId: lid || null,
      readingTestId: rid || null,
      writingTestId: wid || null,
      listeningTitle: listening.find(t => t.id === lid)?.title,
      readingTitle: reading.find(t => t.id === rid)?.title,
      writingTitle: writing.find(t => t.id === wid)?.title,
    }
    saveCurrentMock(mock)
    router.push('/mock-tests/run')
  }

  const canStart = !!(lid || rid || wid)

  return (
    <div style={{ padding: '32px 32px 80px' }}>
      {/* Hub header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>{t('mock.eyebrow')}</div>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 6px', color: 'var(--text)' }}>
            {t('mock.duration')}{' '}
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--accent)' }}>{t('mock.tagline')}</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', margin: 0, maxWidth: 600 }}>
            {t('mock.intro')}
          </p>
        </div>
        {resumable && (
          <Link href="/mock-tests/run" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 'var(--radius-lg)',
            fontWeight: 600, fontSize: 14, background: 'var(--accent-soft)', color: 'var(--accent)',
            border: '1px solid var(--accent)', textDecoration: 'none', flexShrink: 0,
          }}>
            {t('mock.resume')} →
          </Link>
        )}
      </div>

      {/* Section time overview */}
      <div className="card" style={{ marginTop: 28, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { name: 'Listening', time: '30 min', q: 40 },
            { name: 'Reading', time: '60 min', q: 40 },
            { name: 'Writing', time: '60 min', q: 2 },
            { name: 'Speaking', time: '14 min', q: 3 },
          ].map((s, i) => (
            <div key={s.name} style={{ padding: 24, borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-2)', marginBottom: 12 }}>{t('dashboard.' + s.name.toLowerCase()).toUpperCase()}</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{s.time}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{s.q} {s.q === 2 ? t('mock.tasks') : t('mock.questions')}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginTop: 16 }}>
        {/* Composer */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{t('mock.buildMock')}</h3>
            <button onClick={autoFill} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>
              {t('mock.autoPick')}
            </button>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {([
              { key: 'listening', tests: listening, value: lid, set: setLid },
              { key: 'reading', tests: reading, value: rid, set: setRid },
              { key: 'writing', tests: writing, value: wid, set: setWid },
            ] as const).map(row => (
              <div key={row.key}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>{t('dashboard.' + row.key)}</label>
                {row.tests.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{t('mock.noTests')}</div>
                ) : (
                  <select value={row.value} onChange={e => row.set(e.target.value)} style={selectStyle}>
                    {row.tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                )}
              </div>
            ))}

            {/* Speaking — AI flow, no DB test to pick */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>{t('dashboard.speaking')}</label>
              <div style={{ ...selectStyle, cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-2)' }}>
                {t('mock.aiSpeaking')}
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)' }}>AI</span>
              </div>
            </div>
          </div>

          <button onClick={startMock} disabled={!canStart} style={{
            marginTop: 22, width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: canStart ? 'var(--accent)' : 'var(--bg-soft)', color: canStart ? 'var(--accent-fg)' : 'var(--text-3)',
            border: 'none', cursor: canStart ? 'pointer' : 'default',
          }}>
            {t('mock.startMock')}
          </button>

          {/* Previous mocks — real completed attempts */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{t('mock.previousAttempts')}</h3>
            {previousMocks.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>
                {t('mock.noPrevious')}
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 4 }}>
                {previousMocks.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', width: 56 }}>{m.date}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{t('mock.testAttempt')}</div>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, fontWeight: 700 }}>
                      {m.band.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Readiness card */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--warn)' }}>{t('mock.readiness')}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 60, lineHeight: 0.9, color: 'var(--accent)', fontWeight: 500 }}>
            {readiness != null ? `${readiness}%` : '—'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
            {readiness != null ? t('mock.readinessHas') : t('mock.readinessNone')}
          </div>
          <div style={{ marginTop: 18, height: 8, borderRadius: 999, background: 'var(--bg-soft)', overflow: 'hidden' }}>
            <div style={{ width: `${readiness ?? 0}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--warn))', transition: 'width .6s' }}/>
          </div>

          {weakSkills.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px dashed var(--border)' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>{t('mock.weakest')}</div>
              {weakSkills.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, fontSize: 13, color: 'var(--text)' }}>
                  <span>{t('dashboard.' + s.skill)}</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)' }}>{s.band.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
