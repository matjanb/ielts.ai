'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Target, ArrowRight, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getPracticeFilters, getSubskillAccuracy, type PracticeFilters, type SubskillStat } from '@/lib/services/tests'
import { getUser } from '@/lib/services/auth'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

// A type needs at least this many answered questions before we trust its accuracy
// enough to rank it (and badge the weakest as "Focus").
const MIN_MEASURED = 4

interface Row {
  type: string
  label: string
  count: number          // how many drillable questions exist for this type
  accuracy: number | null
  total: number          // how many the user has answered
  measured: boolean
}

function barColor(acc: number): string {
  if (acc < 0.55) return 'var(--danger)'
  if (acc < 0.75) return 'var(--warn)'
  return 'var(--accent)'
}

export function FocusPractice({ skill }: { skill: 'reading' | 'listening' }) {
  const { t } = useLanguage()
  const isMobile = useIsMobile()
  const [filters, setFilters] = useState<PracticeFilters | null>(null)
  const [acc, setAcc] = useState<SubskillStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      const { user } = await getUser()
      // Run the two heavy chains (type counts + per-type accuracy) in parallel
      // instead of one after the other — roughly halves the load time.
      const [f, a] = await Promise.all([
        getPracticeFilters(skill),
        user ? getSubskillAccuracy(user.id, skill) : Promise.resolve([] as SubskillStat[]),
      ])
      if (!alive) return
      setFilters(f)
      setAcc(a)
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [skill])

  const accByType = new Map(acc.map(a => [a.type, a]))
  const rows: Row[] = (filters?.types ?? []).map(ft => {
    const a = accByType.get(ft.type)
    return {
      type: ft.type, label: ft.label, count: ft.count,
      accuracy: a?.accuracy ?? null, total: a?.total ?? 0,
      measured: !!a && a.total >= MIN_MEASURED,
    }
  })
  // Weakest measured first; never-measured types fall to the bottom (most questions first).
  const measured = rows.filter(r => r.measured).sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))
  const rest = rows.filter(r => !r.measured).sort((a, b) => b.count - a.count)
  const ordered = [...measured, ...rest]
  const focusType = measured[0]?.type

  return (
    <div className="card" style={{ marginTop: 16, padding: isMobile ? 16 : 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Target size={17} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{t('practice.focusTitle')}</h3>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>{t('practice.focusSub')}</p>
        </div>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>…</div>
        ) : ordered.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>{t('practice.noQuestions')}</div>
        ) : ordered.map(r => {
          const isFocus = r.type === focusType
          const pct = r.accuracy != null ? Math.round(r.accuracy * 100) : null
          const color = r.measured && r.accuracy != null ? barColor(r.accuracy) : 'var(--text-3)'
          return (
            <Link key={r.type} href={`/${skill}/practice?type=${r.type}`} style={{ textDecoration: 'none' }}>
              <div className="focus-row" style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12,
                border: `1px solid ${isFocus ? 'var(--accent)' : 'var(--border)'}`,
                background: isFocus ? 'var(--accent-soft)' : 'var(--bg-soft)',
                transition: 'border-color .15s, background .15s', cursor: 'pointer',
              }}>
                {/* Label + bar */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                    {r.measured && r.accuracy != null && r.accuracy < 0.55 && (
                      <AlertTriangle size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{r.label}</span>
                    {isFocus && (
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--bg-elev)', padding: '2px 7px', borderRadius: 999 }}>
                        {t('practice.focusBadge')}
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: pct != null ? color : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                      {pct != null ? `${pct}%` : t('practice.notTried')}
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-elev)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct ?? 0}%`, background: color, borderRadius: 999, transition: 'width .6s' }} />
                  </div>
                </div>
                {/* CTA */}
                <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}>
                  {t('practice.go')} <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
