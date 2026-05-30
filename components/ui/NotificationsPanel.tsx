'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useToast } from '@/lib/toast'
import type { NotifItem } from '@/lib/services/notifications'
import { relativeTime } from '@/lib/services/notifications'

const ICON_PATHS: Record<string, React.ReactNode> = {
  pencil:    <path d="M14 4l6 6L9 21H3v-6z"/>,
  mic:       <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/></>,
  flame:     <path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1.5 2-3 3-3 5 0-2-1-4-3-6-1 2-5 4-5 9 0 4 3 6 7 6z"/>,
  sparkle:   <><path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></>,
}

function NotifIcon({ name, color }: { name: string; color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name] ?? ICON_PATHS.sparkle}
    </svg>
  )
}

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
  items: NotifItem[]
  lastSeen: string | null
  onMarkAllRead: () => void
}

export function NotificationsPanel({ open, onClose, items, lastSeen, onMarkAllRead }: NotificationsPanelProps) {
  const { toast } = useToast()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : 0
  const unreadCount = items.filter(n => new Date(n.time).getTime() > lastSeenMs).length

  return (
    <div ref={ref} className="card animate-fade-up" style={{
      position: 'absolute', top: 56, right: 16, width: 360,
      padding: 0, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--accent)', color: 'var(--accent-fg)', fontVariantNumeric: 'tabular-nums' }}>
              {unreadCount}
            </span>
          )}
        </div>
        <button
          disabled={unreadCount === 0}
          style={{ fontSize: 12, color: unreadCount === 0 ? 'var(--text-3)' : 'var(--accent)', background: 'none', border: 'none', cursor: unreadCount === 0 ? 'default' : 'pointer', opacity: unreadCount === 0 ? 0.5 : 1, transition: 'color .15s' }}
          onClick={() => { onMarkAllRead(); toast('All notifications marked as read', 'success') }}
        >
          Mark all read
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13, lineHeight: 1.55 }}>
          You&apos;re all caught up.<br/>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Complete a practice test or submission to see updates here.</span>
        </div>
      ) : (
        <div style={{ maxHeight: 420, overflow: 'auto' }}>
          {items.map((n, i) => {
            const unread = new Date(n.time).getTime() > lastSeenMs
            const content = (
              <div style={{
                display: 'flex', gap: 12, padding: 14,
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                background: unread ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'transparent',
                cursor: n.href ? 'pointer' : 'default',
                transition: 'background .15s',
                textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = unread ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'transparent')}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `color-mix(in srgb, ${n.color} 14%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <NotifIcon name={n.icon} color={n.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: unread ? 600 : 400, lineHeight: 1.45, color: 'var(--text)' }}>{n.title}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: 'var(--text-3)' }}>{relativeTime(n.time)}</div>
                </div>
                {unread && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }}/>
                )}
              </div>
            )
            return n.href
              ? <Link key={n.id} href={n.href} onClick={onClose} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{content}</Link>
              : <div key={n.id}>{content}</div>
          })}
        </div>
      )}
    </div>
  )
}
