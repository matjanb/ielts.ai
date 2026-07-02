'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SEEN_KEY = 'coach_seen_at'
const POLL_MS = 5 * 60_000
const AUTO_HIDE_MS = 15_000

type CoachMsg = { id: string; content: string; sent_at: string }

// Floating coach card, mounted in the dashboard layout: whenever a coach
// message (instant reaction or evening digest) lands that the user hasn't
// seen, it slides in bottom-right on ANY dashboard page — not just where it
// was generated. Dismiss (or auto-hide) marks it seen via localStorage; the
// full history stays in the notifications panel.
export function CoachToaster() {
  const [msg, setMsg] = useState<CoachMsg | null>(null)
  const [visible, setVisible] = useState(false)

  const dismiss = useCallback((sentAt: string) => {
    try { localStorage.setItem(SEEN_KEY, sentAt) } catch { /* private mode */ }
    setVisible(false)
    setTimeout(() => setMsg(null), 350)
  }, [])

  useEffect(() => {
    let alive = true
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    async function check() {
      try {
        const supabase = createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user || !alive) return
        const { data } = await supabase
          .from('agent_messages')
          .select('id, content, sent_at')
          .eq('user_id', auth.user.id)
          .eq('channel', 'in-app')
          .order('sent_at', { ascending: false })
          .limit(1)
        const latest = data?.[0]
        if (!latest || !alive) return
        const seenAt = localStorage.getItem(SEEN_KEY)
        if (seenAt && latest.sent_at <= seenAt) return
        setMsg(latest)
        // double rAF: mount hidden first, then transition in
        requestAnimationFrame(() => requestAnimationFrame(() => { if (alive) setVisible(true) }))
        if (hideTimer) clearTimeout(hideTimer)
        hideTimer = setTimeout(() => dismiss(latest.sent_at), AUTO_HIDE_MS)
      } catch { /* feed is best-effort */ }
    }

    check()
    const interval = setInterval(check, POLL_MS)
    return () => {
      alive = false
      clearInterval(interval)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [dismiss])

  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', right: 20, bottom: 20, zIndex: 60,
      transform: `translateY(${visible ? 0 : 16}px)`,
      opacity: visible ? 1 : 0,
      transition: 'transform 0.35s cubic-bezier(0.2,0.7,0.2,1), opacity 0.25s',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '13px 14px',
        maxWidth: 380,
        background: 'color-mix(in srgb, var(--bg-elev, var(--card-bg)) 94%, transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-strong)',
        borderLeft: '3px solid var(--accent)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-lg, 0 8px 30px rgba(0,0,0,0.25))',
      }}>
        <span aria-hidden style={{ fontSize: 17, lineHeight: '20px' }}>💬</span>
        <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)' }}>
          {msg.content}
        </span>
        <button
          onClick={() => dismiss(msg.sent_at)}
          aria-label="Dismiss"
          style={{
            border: 'none', background: 'none', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: 15, lineHeight: 1, padding: 2,
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
