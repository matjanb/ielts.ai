'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ReferralsPanel } from './ReferralsPanel'
import { PromoCodesPanel } from './PromoCodesPanel'

interface AdminUser {
  id: string
  email: string
  subscription_status: string
  subscription_expires_at: string | null
  lifetime_access: boolean
  subscription_plan: string | null
  subscription_source: string | null
  created_at: string
  is_admin: boolean
}

interface Stats {
  total_users: number
  active_subscribers: number
  new_today: number
  new_7d: number
  ai_today: number
  writing_total: number
  speaking_total: number
  attempts_total: number
}

type Period = 'month' | '3months' | 'year' | 'forever' | 'revoke'

const PERIOD_LABEL: Record<Period, string> = {
  month: '1 month', '3months': '3 months', year: '1 year', forever: 'Forever', revoke: 'Revoke',
}
const DAY_MS = 864e5
const PERIOD_DAYS: Record<string, number> = { month: 30, '3months': 90, year: 365 }

const isActive = (u: AdminUser) =>
  u.lifetime_access ||
  (u.subscription_expires_at != null && new Date(u.subscription_expires_at).getTime() > Date.now())

const PLAN_LABEL: Record<string, string> = {
  '1mo': '1 month', '3mo': '3 months', '12mo': '1 year', admin: 'Admin grant',
}
const planLabel = (u: AdminUser) =>
  u.subscription_plan ? (PLAN_LABEL[u.subscription_plan] ?? u.subscription_plan) : '—'

function expiresFor(period: Period): string | null {
  if (period === 'forever' || period === 'revoke') return null
  return new Date(Date.now() + PERIOD_DAYS[period] * DAY_MS).toISOString()
}

export function AdminClient() {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
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

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (res.ok) setStats(data.stats ?? null)
    } catch { /* stats are best-effort */ }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initial load
  useEffect(() => { load(''); loadStats() }, [load, loadStats])

  async function apply(userId: string, period: Period) {
    setBusy(userId); setError('')
    try {
      const res = await fetch('/api/admin/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, period }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Update failed'); return }
      // Optimistically reflect the new access state.
      const expires = expiresFor(period)
      const status = period === 'forever' ? 'pro' : 'free'
      const lifetime = period === 'forever'
      const plan = period === 'revoke' ? null : 'admin'
      const source = period === 'revoke' ? null : 'admin'
      setUsers(prev => prev.map(u => u.id === userId
        ? { ...u, subscription_status: status, subscription_expires_at: expires, lifetime_access: lifetime, subscription_plan: plan, subscription_source: source } : u))
      loadStats()
    } catch { setError('Network error') }
    finally { setBusy(null) }
  }

  const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', textAlign: 'left', verticalAlign: 'middle' }

  const statCards: { label: string; value: number | undefined }[] = [
    { label: 'Total users', value: stats?.total_users },
    { label: 'Active subs', value: stats?.active_subscribers },
    { label: 'New today', value: stats?.new_today },
    { label: 'New · 7 days', value: stats?.new_7d },
    { label: 'AI calls today', value: stats?.ai_today },
    { label: 'Tests done', value: stats?.attempts_total },
    { label: 'Writing graded', value: stats?.writing_total },
    { label: 'Speaking graded', value: stats?.speaking_total },
  ]

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Admin</h1>
        <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}>← Dashboard</Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, margin: '16px 0 26px' }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {s.value ?? '—'}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Users</h2>
      <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 14px' }}>
        Find a user by email, then grant access for a period or revoke it.
      </p>

      <form onSubmit={e => { e.preventDefault(); load(q.trim()) }} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
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
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Access</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Plan</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Until</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)' }}>Joined</th>
              <th style={{ ...cell, fontWeight: 700, color: 'var(--text-2)', textAlign: 'right' }}>Set access</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={{ ...cell, color: 'var(--text-3)' }} colSpan={6}>Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td style={{ ...cell, color: 'var(--text-3)' }} colSpan={6}>No users found.</td></tr>
            ) : users.map(u => {
              const active = isActive(u)
              const until = u.lifetime_access ? 'forever'
                : u.subscription_expires_at ? new Date(u.subscription_expires_at).toISOString().slice(0, 10) : '—'
              const source = u.subscription_source ? ` · ${u.subscription_source}` : ''
              return (
                <tr key={u.id}>
                  <td style={cell}>
                    {u.email}{u.is_admin && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>ADMIN</span>}
                  </td>
                  <td style={cell}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: active ? 'var(--accent-soft)' : 'var(--bg-soft)', color: active ? 'var(--accent)' : 'var(--text-3)' }}>
                      {active ? 'active' : 'none'}
                    </span>
                  </td>
                  <td style={{ ...cell, color: 'var(--text-3)' }}>{active ? `${planLabel(u)}${source}` : '—'}</td>
                  <td style={{ ...cell, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{active ? until : '—'}</td>
                  <td style={{ ...cell, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{new Date(u.created_at).toISOString().slice(0, 10)}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    <select
                      disabled={busy === u.id}
                      value=""
                      onChange={e => { const v = e.target.value as Period; if (v) apply(u.id, v) }}
                      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--bg-elev)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: busy === u.id ? 0.5 : 1 }}
                    >
                      <option value="">{busy === u.id ? '…' : 'Grant / revoke…'}</option>
                      <option value="month">{PERIOD_LABEL.month}</option>
                      <option value="3months">{PERIOD_LABEL['3months']}</option>
                      <option value="year">{PERIOD_LABEL.year}</option>
                      <option value="forever">{PERIOD_LABEL.forever}</option>
                      <option value="revoke">{PERIOD_LABEL.revoke}</option>
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <PromoCodesPanel />

      <ReferralsPanel />
    </div>
  )
}
