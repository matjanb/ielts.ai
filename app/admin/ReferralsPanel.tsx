'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'

interface Referrer {
  code: string
  name: string | null
  is_active: boolean
  created_at: string
  signups: number
  paid: number
}

interface ReferredUser {
  email: string
  referred_at: string | null
  created_at: string
  has_paid: boolean
  subscription_status: string
}

export function ReferralsPanel() {
  const [rows, setRows] = useState<Referrer[]>([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [usersByCode, setUsersByCode] = useState<Record<string, ReferredUser[]>>({})
  const [loadingUsers, setLoadingUsers] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

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

  async function remove(r: Referrer) {
    const warn = r.signups > 0
      ? `Delete referral code "${r.code}"? It already has ${r.signups} signup(s) — they will keep their record but the code will disappear from this list.`
      : `Delete referral code "${r.code}"?`
    if (!window.confirm(warn)) return
    setDeleting(r.code); setError('')
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: r.code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
      if (expanded === r.code) setExpanded(null)
      setRows(prev => prev.filter(x => x.code !== r.code))
    } catch { setError('Network error') }
    finally { setDeleting(null) }
  }

  function copy(c: string) {
    const link = `${origin}/?ref=${c}`
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(c); setTimeout(() => setCopied(''), 1500)
    }).catch(() => {})
  }

  async function toggle(c: string) {
    if (expanded === c) { setExpanded(null); return }
    setExpanded(c)
    if (!usersByCode[c]) {
      setLoadingUsers(c)
      try {
        const res = await fetch(`/api/admin/referrals?code=${encodeURIComponent(c)}`)
        const data = await res.json()
        if (res.ok) setUsersByCode(prev => ({ ...prev, [c]: data.users ?? [] }))
      } catch { /* best-effort */ }
      finally { setLoadingUsers(null) }
    }
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
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td style={{ ...cell, color: 'var(--text-3)' }} colSpan={6}>No referral codes yet.</td></tr>
            ) : rows.map(r => {
              const open = expanded === r.code
              const people = usersByCode[r.code]
              return (
                <Fragment key={r.code}>
                  <tr onClick={() => toggle(r.code)} style={{ cursor: 'pointer', background: open ? 'var(--bg-soft)' : 'transparent' }}>
                    <td style={{ ...cell, fontWeight: 700, color: 'var(--text)' }}>
                      <span style={{ display: 'inline-block', width: 14, color: 'var(--text-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
                      {r.code}
                    </td>
                    <td style={{ ...cell, color: 'var(--text-2)' }}>{r.name ?? '—'}</td>
                    <td style={cell}>
                      <button onClick={e => { e.stopPropagation(); copy(r.code) }} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', padding: '4px 10px', borderRadius: 8, cursor: 'pointer' }}>
                        {copied === r.code ? 'Copied!' : 'Copy link'}
                      </button>
                    </td>
                    <td style={{ ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{r.signups}</td>
                    <td style={{ ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: r.paid > 0 ? 'var(--accent)' : 'var(--text-3)' }}>{r.paid}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>
                      <button
                        onClick={e => { e.stopPropagation(); remove(r) }}
                        disabled={deleting === r.code}
                        title="Delete referral code"
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', background: 'transparent', border: '1px solid var(--border-strong)', padding: '4px 10px', borderRadius: 8, cursor: deleting === r.code ? 'default' : 'pointer', opacity: deleting === r.code ? 0.5 : 1 }}
                      >
                        {deleting === r.code ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
                        {loadingUsers === r.code ? (
                          <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
                        ) : !people || people.length === 0 ? (
                          <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-3)' }}>Nobody signed up with this code yet.</div>
                        ) : (
                          <div style={{ padding: '6px 12px 12px' }}>
                            {people.map((u, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 8px', borderBottom: i < people.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                                <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                                  {(u.referred_at ?? u.created_at).slice(0, 10)}
                                </span>
                                <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: u.has_paid ? 'var(--accent-soft)' : 'var(--bg-elev)', color: u.has_paid ? 'var(--accent)' : 'var(--text-3)' }}>
                                  {u.has_paid ? 'paid' : 'free'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
