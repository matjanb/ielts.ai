'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Target, ArrowRight, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/services/auth'

// The four official IELTS writing criteria — these are the "weak spots".
const CRITERIA = [
  { key: 'task_achievement',     label: 'wtest.critTask',      tip: 'writingFocus.tipTask' },
  { key: 'coherence_cohesion',   label: 'wtest.critCoherence', tip: 'writingFocus.tipCoherence' },
  { key: 'lexical_resource',     label: 'wtest.critLexical',   tip: 'writingFocus.tipLexical' },
  { key: 'grammatical_accuracy', label: 'wtest.critGrammar',   tip: 'writingFocus.tipGrammar' },
] as const

function barColor(band: number): string {
  if (band < 5.5) return 'var(--danger)'
  if (band < 6.5) return 'var(--warn)'
  return 'var(--accent)'
}

export function WritingFocus({ startHref }: { startHref: string }) {
  const { t } = useLanguage()
  const [avgs, setAvgs] = useState<Record<string, number>>({})
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      const { user } = await getUser()
      if (!user) { if (alive) setLoading(false); return }
      const { data } = await createClient()
        .from('writing_submissions')
        .select('task_achievement, coherence_cohesion, lexical_resource, grammatical_accuracy')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      if (!alive) return
      const rows = data ?? []
      setCount(rows.length)
      const a: Record<string, number> = {}
      for (const c of CRITERIA) {
        const vals = rows.map(r => r[c.key as keyof typeof r]).filter((v): v is number => typeof v === 'number')
        if (vals.length) a[c.key] = vals.reduce((s, v) => s + v, 0) / vals.length
      }
      setAvgs(a)
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [])

  const measured = CRITERIA
    .filter(c => avgs[c.key] != null)
    .sort((x, y) => avgs[x.key] - avgs[y.key])
  const focusKey = measured[0]?.key

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Target size={17} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{t('writingFocus.title')}</h3>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>{t('writingFocus.sub')}</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>…</div>
      ) : count === 0 ? (
        <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-soft)', borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 12px' }}>{t('writingFocus.empty')}</p>
          <Link href={startHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--accent-fg)', background: 'var(--accent)', padding: '8px 14px', borderRadius: 10, textDecoration: 'none' }}>
            {t('writingFocus.cta')} <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {measured.map(c => {
              const band = avgs[c.key]
              const isFocus = c.key === focusKey
              const color = barColor(band)
              return (
                <div key={c.key} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${isFocus ? 'var(--accent)' : 'var(--border)'}`, background: isFocus ? 'var(--accent-soft)' : 'var(--bg-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
                    {band < 5.5 && <AlertTriangle size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />}
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{t(c.label)}</span>
                    {isFocus && (
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--bg-elev)', padding: '2px 7px', borderRadius: 999 }}>{t('writingFocus.badge')}</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{band.toFixed(1)}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-elev)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(band / 9) * 100}%`, background: color, borderRadius: 999, transition: 'width .6s' }} />
                  </div>
                  {isFocus && <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--text-2)' }}>{t(c.tip)}</p>}
                </div>
              )
            })}
          </div>
          <Link href={startHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
            {t('writingFocus.cta')} <ArrowRight size={13} />
          </Link>
        </>
      )}
    </div>
  )
}
