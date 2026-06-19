'use client'

import { useCallback, useEffect, useState } from 'react'

interface PromoCode {
  code: string
  paddle_discount_id: string
  description: string | null
  percent_off: number | null
  is_active: boolean
  expires_at: string | null
  max_redemptions: number | null
  redemption_count: number
  created_at: string
}

export function PromoCodesPanel() {
  const [rows, setRows] = useState<PromoCode[]>([])
  const [code, setCode] = useState('')
  const [discountId, setDiscountId] = useState('')
  const [percentOff, setPercentOff] = useState('')
  const [description, setDescription] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/promo-codes')
      const data = await res.json()
      if (res.ok) setRows(data.codes ?? [])
    } catch { /* best-effort */ }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initial load
  useEffect(() => { load() }, [load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          discountId,
          description,
          percentOff: percentOff || null,
          maxRedemptions: maxRedemptions || null,
          expiresAt: expiresAt || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
      setCode(''); setDiscountId(''); setPercentOff(''); setDescription(''); setMaxRedemptions(''); setExpiresAt('')
      load()
    } catch { setError('Network error') }
    finally { setBusy(false) }
  }

  async function toggle(r: PromoCode) {
    setActing(r.code); setError('')
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: r.code, isActive: !r.is_active }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
      setRows(prev => prev.map(x => x.code === r.code ? { ...x, is_active: !x.is_active } : x))
    } catch { setError('Network error') }
    finally { setActing(null) }
  }

  async function remove(r: PromoCode) {
    const warn = r.redemption_count > 0
      ? `Delete promo code "${r.code}"? It has ${r.redemption_count} redemption(s) — the log rows stay, but the code disappears from this list.`
      : `Delete promo code "${r.code}"?`
    if (!window.confirm(warn)) return
    setActing(r.code); setError('')
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: r.code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
      setRows(prev => prev.filter(x => x.code !== r.code))
    } catch { setError('Network error') }
    finally { setActing(null) }
  }

  const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', textAlign: 'left', verticalAlign: 'middle' }
  const input: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', color: 'var(--text)', fontSize: 14, outline: 'none' }

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Promo codes</h2>
      <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 14px' }}>
        Create a Paddle discount first, then map a friendly code to its discount ID (dsc_…). The code applies the discount at checkout.
      </p>

      {/* Create form */}
      <form onSubmit={create} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="CODE (e.g. SUMMER50)" style={{ ...input, flex: '1 1 150px' }} />
        <input value={discountId} onChange={e => setDiscountId(e.target.value)} placeholder="Paddle discount ID (dsc_…)" style={{ ...input, flex: '1 1 200px' }} />
        <input value={percentOff} onChange={e => setPercentOff(e.target.value)} placeholder="% off (display)" inputMode="numeric" style={{ ...input, flex: '0 1 120px' }} />
        <input value={maxRedemptions} onChange={e => setMaxRedemptions(e.target.value)} placeholder="Max uses" inputMode="numeric" style={{ ...input, flex: '0 1 100px' }} />
        <input value={expiresAt} onChange={e => setExpiresAt(e.target.value)} type="date" title="Expires (optional)" style={{ ...input, flex: '0 1 150px' }} />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Note (optional)" style={{ ...input, flex: '1 1 160px' }} />
        <button type="submit" disabled={busy || !code.trim() || !discountId.trim()} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontWeight: 600, fontSize: 14, cursor: busy ? 'default' : 'pointer', opacity: busy || !code.trim() || !discountId.trim() ? 0.6 : 1 }}>
          {busy ? '…' : 'Add'}
        </button>
      </form>

      {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft)' }}>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Code</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Discount ID</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)', textAlign: 'right' }}>% off</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)', textAlign: 'right' }}>Used</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Expires</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Status</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)', textAlign: 'right' }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td style={{ ...cell, color: 'var(--text-3)' }} colSpan={7}>No promo codes yet.</td></tr>
            ) : rows.map(r => {
              const used = r.max_redemptions != null ? `${r.redemption_count} / ${r.max_redemptions}` : String(r.redemption_count)
              return (
                <tr key={r.code}>
                  <td style={{ ...cell, fontWeight: 700, color: 'var(--text)' }}>
                    {r.code}
                    {r.description && <div style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--text-3)' }}>{r.description}</div>}
                  </td>
                  <td style={{ ...cell, color: 'var(--text-3)', fontFamily: 'monospace', fontSize: 12 }}>{r.paddle_discount_id}</td>
                  <td style={{ ...cell, textAlign: 'right', color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{r.percent_off != null ? `${r.percent_off}%` : '—'}</td>
                  <td style={{ ...cell, textAlign: 'right', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{used}</td>
                  <td style={{ ...cell, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{r.expires_at ? r.expires_at.slice(0, 10) : '—'}</td>
                  <td style={cell}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: r.is_active ? 'var(--accent-soft)' : 'var(--bg-soft)', color: r.is_active ? 'var(--accent)' : 'var(--text-3)' }}>
                      {r.is_active ? 'active' : 'off'}
                    </span>
                  </td>
                  <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => toggle(r)}
                      disabled={acting === r.code}
                      style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border-strong)', padding: '4px 10px', borderRadius: 8, cursor: acting === r.code ? 'default' : 'pointer', opacity: acting === r.code ? 0.5 : 1, marginRight: 6 }}
                    >
                      {r.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => remove(r)}
                      disabled={acting === r.code}
                      title="Delete promo code"
                      style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', background: 'transparent', border: '1px solid var(--border-strong)', padding: '4px 10px', borderRadius: 8, cursor: acting === r.code ? 'default' : 'pointer', opacity: acting === r.code ? 0.5 : 1 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
