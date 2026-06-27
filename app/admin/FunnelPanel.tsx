'use client'

import { useCallback, useEffect, useState } from 'react'

interface FunnelRow {
  source: string
  landing: number
  signups: number
  mockStarted: number
  paywall: number
  checkout: number
  purchases: number
  signupToPaywallPct: number | null
  paywallToPurchasePct: number | null
}

const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }
const headCell: React.CSSProperties = { ...cell, fontWeight: 700, color: 'var(--text-2)' }

export function FunnelPanel() {
  const [rows, setRows] = useState<FunnelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/funnel')
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load funnel'); return }
      setRows(data.rows ?? [])
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initial load
  useEffect(() => { load() }, [load])

  const pctTone = (v: number | null) => v == null ? 'var(--text-3)' : v >= 10 ? 'var(--accent)' : v > 0 ? 'var(--text-2)' : 'var(--danger)'

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Funnel by source</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>Last 30 days · distinct visitors per step</p>
        </div>
        <button onClick={load} disabled={loading}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8, padding: '5px 12px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft)' }}>
              <th style={{ ...headCell, textAlign: 'left' }}>Source</th>
              <th style={headCell}>Landing</th>
              <th style={headCell}>Signups</th>
              <th style={headCell}>Mock</th>
              <th style={headCell}>Paywall</th>
              <th style={headCell}>Checkout</th>
              <th style={headCell}>Purchases</th>
              <th style={headCell}>Signup→Paywall</th>
              <th style={headCell}>Paywall→Buy</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td style={{ ...cell, textAlign: 'left', color: 'var(--text-3)' }} colSpan={9}>{loading ? 'Loading…' : 'No events yet.'}</td></tr>
            ) : rows.map(r => (
              <tr key={r.source}>
                <td style={{ ...cell, textAlign: 'left', fontWeight: 600 }}>{r.source}</td>
                <td style={cell}>{r.landing}</td>
                <td style={cell}>{r.signups}</td>
                <td style={cell}>{r.mockStarted}</td>
                <td style={cell}>{r.paywall}</td>
                <td style={cell}>{r.checkout}</td>
                <td style={{ ...cell, fontWeight: 700, color: r.purchases > 0 ? 'var(--accent)' : 'var(--text-3)' }}>{r.purchases}</td>
                <td style={{ ...cell, color: pctTone(r.signupToPaywallPct) }}>{r.signupToPaywallPct == null ? '—' : `${r.signupToPaywallPct}%`}</td>
                <td style={{ ...cell, color: pctTone(r.paywallToPurchasePct) }}>{r.paywallToPurchasePct == null ? '—' : `${r.paywallToPurchasePct}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
