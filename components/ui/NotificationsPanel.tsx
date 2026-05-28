'use client'

import { useEffect, useRef } from 'react'
import { useToast } from '@/lib/toast'

const NOTIFS = [
  { icon: 'sparkle', color: 'var(--accent)', title: 'Your essay was graded — Band 6.5', time: '2m ago', unread: true },
  { icon: 'clipboard', color: 'var(--info)', title: 'Mock #4 is scheduled for Saturday', time: '3h ago', unread: true },
  { icon: 'flame', color: 'var(--warn)', title: '23-day streak — keep it up!', time: 'Today', unread: false },
  { icon: 'trophy', color: 'var(--warn)', title: "You earned the 'Speaking Pro' badge", time: 'Yesterday', unread: false },
  { icon: 'layers', color: '#6b46c1', title: '98 vocabulary cards due for review', time: 'Yesterday', unread: false },
]

const ICON_PATHS: Record<string, React.ReactNode> = {
  sparkle: <><path d="M12 3l1.7 4.8L18 9.5l-4.3 1.7L12 16l-1.7-4.8L6 9.5l4.3-1.7z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></>,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/></>,
  flame: <path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1.5 2-3 3-3 5 0-2-1-4-3-6-1 2-5 4-5 9 0 4 3 6 7 6z"/>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M16 5h3v3a3 3 0 0 1-3 3M8 5H5v3a3 3 0 0 0 3 3"/><path d="M10 14h4v3h2v3H8v-3h2z"/></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/></>,
}

function NotifIcon({ name, color }: { name: string; color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  )
}

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { toast } = useToast()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div ref={ref} className="card animate-fade-up" style={{
      position: 'absolute', top: 56, right: 16, width: 360,
      padding: 0, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Notifications</div>
        <button
          style={{ fontSize: 12, color: 'var(--text-3)', transition: 'color .15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          onClick={() => { toast('All notifications marked as read', 'success'); onClose() }}
        >
          Mark all read
        </button>
      </div>

      <div style={{ maxHeight: 360, overflow: 'auto' }}>
        {NOTIFS.map((n, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: 14,
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
            background: n.unread ? 'var(--bg)' : 'transparent',
            cursor: 'pointer', transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
          onMouseLeave={e => (e.currentTarget.style.background = n.unread ? 'var(--bg)' : 'transparent')}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: `color-mix(in srgb, ${n.color} 14%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <NotifIcon name={n.icon} color={n.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: n.unread ? 600 : 400, lineHeight: 1.45, color: 'var(--text)' }}>{n.title}</div>
              <div style={{ fontSize: 11, marginTop: 2, color: 'var(--text-3)' }}>{n.time}</div>
            </div>
            {n.unread && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }}/>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
