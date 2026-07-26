'use client'

import { useCallback, useEffect, useState } from 'react'

interface TelegramData {
  totals: { linked: number; linked7d: number; linked30d: number; upsellsSent: number; upsellsSent7d: number; upsellUsers: number }
  onboarding: { viewed: number; connected: number; skipped: number; connectRatePct: number | null }
  recent: { userId: string; name: string; linkedAt: string | null; plan: 'pro' | 'free'; upsells: number }[]
}

const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }
const headCell: React.CSSProperties = { ...cell, fontWeight: 700, color: 'var(--text-2)' }

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card" style={{ padding: '14px 16px', flex: '1 1 140px', minWidth: 140 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', margin: '4px 0 2px' }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{hint}</div>}
    </div>
  )
}

export function TelegramPanel() {
  const [data, setData] = useState<TelegramData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/telegram')
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Failed to load telegram analytics'); return }
      setData(body as TelegramData)
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initial load
  useEffect(() => { load() }, [load])

  const t = data?.totals
  const o = data?.onboarding

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Telegram bot</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>Linked accounts, onboarding-step conversion (30 days) and upsell volume</p>
        </div>
        <button onClick={load} disabled={loading}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8, padding: '5px 12px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Tile label="Linked" value={t ? String(t.linked) : '—'} hint={t ? `+${t.linked7d} in 7d · +${t.linked30d} in 30d` : undefined} />
        <Tile
          label="Onboarding connect"
          value={o?.connectRatePct != null ? `${o.connectRatePct}%` : '—'}
          hint={o ? `${o.connected} of ${o.viewed} viewed · ${o.skipped} skipped` : undefined}
        />
        <Tile label="Upsells sent" value={t ? String(t.upsellsSent) : '—'} hint={t ? `+${t.upsellsSent7d} in 7d · ${t.upsellUsers} users` : undefined} />
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft)' }}>
              <th style={{ ...headCell, textAlign: 'left' }}>User</th>
              <th style={headCell}>Plan</th>
              <th style={headCell}>Linked</th>
              <th style={headCell}>Upsells received</th>
            </tr>
          </thead>
          <tbody>
            {!data || data.recent.length === 0 ? (
              <tr><td style={{ ...cell, textAlign: 'left', color: 'var(--text-3)' }} colSpan={4}>{loading ? 'Loading…' : 'Nobody has linked the bot yet.'}</td></tr>
            ) : data.recent.map(r => (
              <tr key={r.userId}>
                <td style={{ ...cell, textAlign: 'left', fontWeight: 600 }}>{r.name}</td>
                <td style={{ ...cell, fontWeight: 700, color: r.plan === 'pro' ? 'var(--accent)' : 'var(--text-3)' }}>{r.plan}</td>
                <td style={cell}>{r.linkedAt ? new Date(r.linkedAt).toLocaleDateString() : '—'}</td>
                <td style={cell}>{r.upsells}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
