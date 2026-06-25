'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { redirectToPaywallOn403 } from '@/lib/paywall'

interface Coach { focus: string; tips: string[] }

const CACHE_KEY = 'writing-coach-advice'

export function WritingCoach() {
  const { t } = useLanguage()
  const [data, setData] = useState<Coach | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [empty, setEmpty] = useState(false)

  // Show the last generated advice (cached) so it persists without re-spending.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time cache hydrate
      if (raw) setData(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  async function run() {
    setLoading(true); setError(''); setEmpty(false)
    try {
      const res = await fetch('/api/ai/writing-coach', { method: 'POST' })
      if (redirectToPaywallOn403(res)) return
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? t('writingCoach.error')); return }
      if (d.empty) { setEmpty(true); setData(null); return }
      setData(d)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)) } catch { /* ignore */ }
    } catch { setError(t('writingCoach.error')) }
    finally { setLoading(false) }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: 'color-mix(in srgb, #6b46c1 18%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={17} style={{ color: '#8b6fd6' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{t('writingCoach.title')}</h3>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>{t('writingCoach.sub')}</p>
        </div>
        {data && !loading && (
          <button onClick={run} title={t('writingCoach.refresh')} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-3)', background: 'var(--bg-soft)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>
            <RefreshCw size={12} /> {t('writingCoach.refresh')}
          </button>
        )}
      </div>

      {error && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
      {empty && <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>{t('writingCoach.empty')}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 13, color: 'var(--text-3)' }}>
          <Loader2 size={15} className="animate-spin" /> {t('writingCoach.loading')}
        </div>
      ) : data ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ padding: 14, background: 'color-mix(in srgb, #6b46c1 10%, transparent)', border: '1px solid color-mix(in srgb, #6b46c1 25%, transparent)', borderRadius: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8b6fd6', marginBottom: 5 }}>{t('writingCoach.focusLabel')}</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{data.focus}</p>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {data.tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-2)' }}>
                <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 6, background: 'var(--bg-soft)', color: '#8b6fd6', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{i + 1}</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      ) : !empty && (
        <button onClick={run} style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: 'var(--accent-fg)', background: 'var(--accent)', border: 'none', padding: '10px 18px', borderRadius: 10, cursor: 'pointer' }}>
          <Sparkles size={14} /> {t('writingCoach.button')}
        </button>
      )}
    </div>
  )
}
