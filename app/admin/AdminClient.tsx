'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface AdminUser {
  id: string
  email: string
  subscription_status: string
  subscription_expires_at: string | null
  created_at: string
  is_admin: boolean
}

const isActive = (u: AdminUser) =>
  u.subscription_status === 'pro' ||
  (u.subscription_expires_at != null && new Date(u.subscription_expires_at).getTime() > Date.now())

export function AdminClient() {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async (search: string) => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/admin/users${search ? `?q=${encodeURIComponent(search)}` : ''}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load'); setUsers([]) }
      else setUsers(data.users ?? [])
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initial load
  useEffect(() => { load('') }, [load])

  async function setStatus(userId: string, status: 'pro' | 'free') {
    setBusy(userId); setError('')
    try {
      const res = await fetch('/api/admin/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Update failed')
      else setUsers(prev => prev.map(u => u.id === userId
        ? { ...u, subscription_status: status, subscription_expires_at: status === 'pro' ? new Date(Date.now() + 365 * 864e5).toISOString() : null }
        : u))
    } catch { setError('Network error') }
    finally { setBusy(null) }
  }

  const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', textAlign: 'left', verticalAlign: 'middle' }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Admin · Users</h1>
        <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}>← Dashboard</Link>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 20px' }}>
        Find a user by email and grant or revoke access. Granting gives one year of <strong>pro</strong>.
      </p>

      <form
        onSubmit={e => { e.preventDefault(); load(q.trim()) }}
        style={{ display: 'flex', gap: 8, marginBottom: 16 }}
      >
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by email…"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
        />
        <button type="submit" style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Search
        </button>
      </form>

      {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-soft)' }}>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Email</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Status</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Joined</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={{ ...cell, color: 'var(--text-3)' }} colSpan={4}>Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td style={{ ...cell, color: 'var(--text-3)' }} colSpan={4}>No users found.</td></tr>
            ) : users.map(u => {
              const active = isActive(u)
              return (
                <tr key={u.id}>
                  <td style={cell}>
                    {u.email}{u.is_admin && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>ADMIN</span>}
                  </td>
                  <td style={cell}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: active ? 'var(--accent-soft)' : 'var(--bg-soft)', color: active ? 'var(--accent)' : 'var(--text-3)' }}>
                      {active ? 'pro' : u.subscription_status}
                    </span>
                  </td>
                  <td style={{ ...cell, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{new Date(u.created_at).toISOString().slice(0, 10)}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    {active ? (
                      <button disabled={busy === u.id} onClick={() => setStatus(u.id, 'free')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: busy === u.id ? 0.5 : 1 }}>
                        {busy === u.id ? '…' : 'Revoke'}
                      </button>
                    ) : (
                      <button disabled={busy === u.id} onClick={() => setStatus(u.id, 'pro')} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: busy === u.id ? 0.5 : 1 }}>
                        {busy === u.id ? '…' : 'Grant pro'}
                      </button>
                    )}
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
