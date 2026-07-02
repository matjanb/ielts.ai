'use client'

import { useEffect, useState } from 'react'
import { Send, Unlink } from 'lucide-react'
import { redirectToPaywallOn403 } from '@/lib/paywall'

type LinkStatus = { linked: boolean; bot: string }
type LinkCode = { code: string; deepLink: string; expiresInMin: number }

// Settings card: connect Telegram to receive the coach's evening reviews.
// Subscriber-only — a 403 from the code endpoint routes to the paywall.
export function TelegramConnect({ t }: { t: (k: string) => string }) {
  const [status, setStatus] = useState<LinkStatus | null>(null)
  const [code, setCode] = useState<LinkCode | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/telegram/link')
      .then(r => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [])

  async function connect() {
    setBusy(true)
    try {
      const res = await fetch('/api/telegram/link', { method: 'POST' })
      if (redirectToPaywallOn403(res)) return
      if (res.ok) setCode(await res.json())
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    setBusy(true)
    try {
      await fetch('/api/telegram/link', { method: 'DELETE' })
      setStatus(s => (s ? { ...s, linked: false } : s))
      setCode(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 220 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Send size={15} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {status?.linked ? t('settings.telegramLinked') : t('settings.telegramDesc')}
          </span>
        </div>
        {code && !status?.linked && (
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {t('settings.telegramCodeHint')}{' '}
            <code style={{
              padding: '2px 8px', borderRadius: 6, fontWeight: 700, letterSpacing: '0.08em',
              background: 'var(--bg-soft)', color: 'var(--text)',
            }}>
              {code.code}
            </code>
          </div>
        )}
      </div>
      {status?.linked ? (
        <button onClick={disconnect} disabled={busy} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
          fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'none',
          border: '1px solid var(--border-strong)', color: 'var(--text)',
        }}>
          <Unlink size={13} />
          {t('settings.telegramDisconnect')}
        </button>
      ) : code ? (
        <a href={code.deepLink} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
          fontSize: 14, fontWeight: 600, textDecoration: 'none',
          background: 'var(--accent)', color: '#fff',
        }}>
          <Send size={13} />
          {t('settings.telegramOpen')}
        </a>
      ) : (
        <button onClick={connect} disabled={busy || !status} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          background: 'var(--accent)', color: '#fff', border: 'none',
          opacity: busy || !status ? 0.6 : 1,
        }}>
          <Send size={13} />
          {t('settings.telegramConnect')}
        </button>
      )}
    </div>
  )
}
