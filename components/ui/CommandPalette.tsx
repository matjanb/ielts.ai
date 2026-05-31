'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const PAGES = [
  { label: 'Dashboard · Overview', icon: 'home', href: '/dashboard' },
  { label: 'Listening', icon: 'headphones', href: '/listening' },
  { label: 'Reading', icon: 'book', href: '/reading' },
  { label: 'Writing', icon: 'pencil', href: '/dashboard/writing' },
  { label: 'Speaking', icon: 'mic', href: '/dashboard/speaking' },
  { label: 'Mock Tests', icon: 'clipboard', href: '/mock-tests' },
  { label: 'Vocabulary', icon: 'layers', href: '/vocabulary' },
  { label: 'Progress', icon: 'activity', href: '/dashboard/progress' },
  { label: 'Study Plan', icon: 'calendar', href: '/dashboard/study-plan' },
  { label: 'Settings', icon: 'settings', href: '/dashboard/settings' },
  { label: 'Subscription', icon: 'lock', href: '/subscription' },
]

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/>,
  headphones: <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z"/></>,
  book: <><path d="M4 4h7a3 3 0 0 1 3 3v13"/><path d="M20 4h-7a3 3 0 0 0-3 3"/><path d="M4 4v15a1 1 0 0 0 1 1h15"/></>,
  pencil: <path d="M14 4l6 6L9 21H3v-6z"/>,
  mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/></>,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4"/>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>,
  arrowRight: <path d="M5 12h14M13 5l7 7-7 7"/>,
}

function NavIcon({ name, size = 15, color = 'var(--text-2)' }: { name: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name] ?? null}
    </svg>
  )
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [q, setQ] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) { setQ(''); setHighlighted(0) }
    else setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = q
    ? PAGES.filter(p => p.label.toLowerCase().includes(q.toLowerCase()))
    : PAGES

  useEffect(() => { setHighlighted(0) }, [q])

  const go = (href: string) => {
    router.push(href)
    onClose()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    if (e.key === 'Enter' && filtered[highlighted]) go(filtered[highlighted].href)
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'color-mix(in srgb, #000 40%, transparent)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '100px 20px 20px',
        animation: 'fadeIn .15s ease both',
      }}
    >
      <div onClick={e => e.stopPropagation()} className="card animate-fade-up" style={{
        width: '100%', maxWidth: 560, padding: 0, overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <NavIcon name="search" size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search pages, actions…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', fontSize: 15, color: 'var(--text)',
            }}
          />
          <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 6px', borderRadius: 6, background: 'var(--bg-soft)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflow: 'auto', padding: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>No matches.</div>
          )}
          {filtered.length > 0 && (
            <div>
              <div style={{ padding: '8px 10px 4px', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em' }}>PAGES</div>
              {filtered.map((page, i) => (
                <button
                  key={page.href}
                  onClick={() => go(page.href)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    fontSize: 13.5, textAlign: 'left',
                    background: i === highlighted ? 'var(--bg-soft)' : 'transparent',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  <NavIcon name={page.icon} size={15} />
                  <span style={{ flex: 1, color: 'var(--text)' }}>{page.label}</span>
                  <NavIcon name="arrowRight" size={12} color="var(--text-3)" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-3)' }}>
          {[['↑↓', 'navigate'], ['↵', 'open'], ['ESC', 'close']].map(([k, l]) => (
            <span key={k}>
              <kbd style={{ fontFamily: 'var(--font-mono)', padding: '1px 5px', borderRadius: 4, background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>{k}</kbd>
              {' '}{l}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
