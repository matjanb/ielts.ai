'use client'

import { useEffect, useState } from 'react'
import { Unlink } from 'lucide-react'

// Official Telegram logo: brand-blue circle + white paper plane.
function TelegramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" aria-hidden>
      <circle cx="120" cy="120" r="120" fill="#29A9EB" />
      <path
        fill="#fff"
        d="M54 118.5l114.7-44.2c5.3-1.9 10 1.3 8.3 9.4l-19.5 92c-1.5 6.5-5.6 8.1-11.3 5l-29.8-22-14.4 13.9c-1.6 1.6-2.9 2.9-6 2.9l2.1-30.3 55.3-50c2.4-2.1-.5-3.3-3.7-1.2l-68.4 43.1-29.5-9.2c-6.4-2-6.5-6.4 2.2-9.4z"
      />
    </svg>
  )
}

type LinkStatus = { linked: boolean; bot: string }
type LinkCode = { code: string; deepLink: string; expiresInMin: number }

// Settings card: connect Telegram to receive the coach's messages. Open to
// every account — per-message gating lives server-side in send.server.ts.
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
          <TelegramIcon size={16} />
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
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10,
          fontSize: 14, fontWeight: 600, textDecoration: 'none',
          background: '#29A9EB', color: '#fff',
        }}>
          <TelegramIcon size={15} />
          {t('settings.telegramOpen')}
        </a>
      ) : (
        <button onClick={connect} disabled={busy || !status} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          background: '#29A9EB', color: '#fff', border: 'none',
          opacity: busy || !status ? 0.6 : 1,
        }}>
          <TelegramIcon size={15} />
          {t('settings.telegramConnect')}
        </button>
      )}
    </div>
  )
}
