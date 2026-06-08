'use client'

import { useCallback, useEffect, useState } from 'react'

interface Referrer {
  code: string
  name: string | null
  is_active: boolean
  created_at: string
  signups: number
  paid: number
}

export function ReferralsPanel() {
  const [rows, setRows] = useState<Referrer[]>([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/referrals')
      const data = await res.json()
      if (res.ok) setRows(data.referrers ?? [])
    } catch { /* best-effort */ }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initial load
  useEffect(() => { load() }, [load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
      setCode(''); setName('')
      load()
    } catch { setError('Network error') }
    finally { setBusy(false) }
  }

  function copy(c: string) {
    const link = `${origin}/?ref=${c}`
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(c); setTimeout(() => setCopied(''), 1500)
    }).catch(() => {})
  }

  const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', textAlign: 'left', verticalAlign: 'middle' }

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Referrals</h2>
      <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 14px' }}>
        Create a code per creator, share their link, and track signups and paid conversions.
      </p>

      {/* Create form */}
      <form onSubmit={create} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="code (e.g. anna)"
          style={{ flex: '1 1 160px', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
        />
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="creator name (optional)"
          style={{ flex: '1 1 200px', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
        />
        <button type="submit" disabled={busy || !code.trim()} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontWeight: 600, fontSize: 14, cursor: busy ? 'default' : 'pointer', opacity: busy || !code.trim() ? 0.6 : 1 }}>
          {busy ? '…' : 'Add'}
        </button>
      </form>

      {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft)' }}>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Code</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Creator</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Link</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)', textAlign: 'right' }}>Signups</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)', textAlign: 'right' }}>Paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td style={{ ...cell, color: 'var(--text-3)' }} colSpan={5}>No referral codes yet.</td></tr>
            ) : rows.map(r => (
              <tr key={r.code}>
                <td style={{ ...cell, fontWeight: 700, color: 'var(--text)' }}>{r.code}</td>
                <td style={{ ...cell, color: 'var(--text-2)' }}>{r.name ?? '—'}</td>
                <td style={cell}>
                  <button onClick={() => copy(r.code)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', padding: '4px 10px', borderRadius: 8, cursor: 'pointer' }}>
                    {copied === r.code ? 'Copied!' : 'Copy link'}
                  </button>
                </td>
                <td style={{ ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{r.signups}</td>
                <td style={{ ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: r.paid > 0 ? 'var(--accent)' : 'var(--text-3)' }}>{r.paid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
