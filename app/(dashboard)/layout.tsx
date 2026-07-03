'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider, useLanguage } from '@/lib/i18n/LanguageContext'
import { ToastProvider, useToast } from '@/lib/toast'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { SessionTracker } from '@/components/analytics/SessionTracker'
import { CoachToaster } from '@/components/agent/CoachToaster'
import { NotificationsPanel } from '@/components/ui/NotificationsPanel'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { signOut, getUser } from '@/lib/services/auth'
import { getNotifications, type NotifItem } from '@/lib/services/notifications'
import { getEntitlement, type Entitlement } from '@/lib/services/entitlement'
import type { ReactNode } from 'react'

const RAIL_W = 56
const EXPANDED_W = 240

// Nav item `key` doubles as the entitlement "area" key, so a free user's locked
// areas (from /api/entitlement) map straight onto the lock badges below.
const NAV_ITEMS = [
  { href: '/dashboard',            icon: 'home',      key: 'overview'   },
  { href: '/listening',            icon: 'headphones', key: 'listening'  },
  { href: '/reading',              icon: 'book',      key: 'reading'    },
  { href: '/dashboard/writing',    icon: 'pencil',    key: 'writing'    },
  { href: '/dashboard/speaking',   icon: 'mic',       key: 'speaking'   },
  { href: '/mock-tests',           icon: 'clipboard', key: 'mockTests'  },
  { href: '/vocabulary',           icon: 'layers',    key: 'vocabulary' },
  { href: '/dashboard/study-plan', icon: 'calendar',  key: 'studyPlan'  },
  { href: '/dashboard/roast',       icon: 'compass',   key: 'roast'      },
  { href: '/dashboard/progress',   icon: 'activity',  key: 'progress'   },
  { href: '/dashboard/settings',   icon: 'settings',  key: 'settings'   },
]

// The 5 primary destinations for the mobile bottom tab bar (home + the four
// skills). Everything else stays reachable via the top-left menu drawer.
const TAB_ITEMS = [
  { href: '/dashboard',          icon: 'home',       key: 'overview'  },
  { href: '/listening',          icon: 'headphones', key: 'listening' },
  { href: '/reading',            icon: 'book',       key: 'reading'   },
  { href: '/dashboard/writing',  icon: 'pencil',     key: 'writing'   },
  { href: '/dashboard/speaking', icon: 'mic',        key: 'speaking'  },
]

const ICON_PATHS: Record<string, React.ReactNode> = {
  home:       <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/>,
  headphones: <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3z"/><path d="M3 19a2 2 0 0 0 2 2h1v-6H3z"/></>,
  book:       <><path d="M4 4h7a3 3 0 0 1 3 3v13"/><path d="M20 4h-7a3 3 0 0 0-3 3"/><path d="M4 4v15a1 1 0 0 0 1 1h15"/></>,
  pencil:     <path d="M14 4l6 6L9 21H3v-6z"/>,
  mic:        <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>,
  clipboard:  <><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/></>,
  layers:     <><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5"/></>,
  calendar:   <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
  flame:      <path d="M8.5 14.5A5.5 5.5 0 0 0 14 20c2.5 0 5-2 5-5.5 0-2.7-1.5-4.5-3-6l-1.5-1.5-1 2s-1-2.5-3-4c0 0 .5 3-2 5.5A3.5 3.5 0 0 0 8.5 14.5z"/>,
  compass:    <><circle cx="12" cy="12" r="9"/><path d="M16 8l-2.5 5.5L8 16l2.5-5.5z"/></>,
  activity:   <path d="M3 12h4l3-8 4 16 3-8h4"/>,
  settings:   <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  dots:       <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
  bookmark:   <path d="M6 3h12v18l-6-4-6 4z"/>,
  'bookmark-filled': <path d="M6 3h12v18l-6-4-6 4z" fill="currentColor" stroke="currentColor"/>,
  bell:       <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  sun:        <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon:       <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>,
  search:     <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>,
  user:       <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  logout:     <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>,
  lock:       <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
}

function NavIcon({ name, size = 18, color = 'currentColor', strokeWidth = 1.8 }: { name: string; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {ICON_PATHS[name]}
    </svg>
  )
}

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()

  // Inside a full timed test (/reading/<id>, /listening/<id>, …) the page draws its
  // own bottom bar — hide the global mobile tab bar so they don't stack/overlap.
  const isExam = /^\/(reading|listening|writing|speaking)\/[^/]+/.test(pathname)

  // Sidebar hover state
  const [hover, setHover] = useState(false)
  // Read from localStorage AFTER mount: reading it in the useState initializer
  // makes the first client render differ from the server HTML (hydration
  // mismatch — React 19 throws away the tree or crashes in dev).
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-hydration read
      if (localStorage.getItem('sidebar-pinned') === 'true') setPinned(true)
    } catch { /* storage unavailable (private mode / webview) */ }
  }, [])
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Overlays
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Mobile drawer
  const [isMobile, setIsMobile] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // User info
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('')
  const [userInitials, setUserInitials] = useState('U')
  // null = not loaded yet. Assume full access until known so locks/redirects
  // never flash for paying users.
  const [ent, setEnt] = useState<Entitlement | null>(null)
  const subscribed = ent?.subscribed ?? true
  const lockedSet = new Set(ent?.locked ?? [])

  // Notifications
  const [notifications, setNotifications] = useState<NotifItem[]>([])
  const [notifLastSeen, setNotifLastSeen] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('notifs-last-seen')
  })

  useEffect(() => {
    getUser().then(async ({ user }) => {
      if (!user) return
      const name = user.user_metadata?.full_name ?? user.email ?? 'User'
      setUserName(name)
      setUserEmail(user.email ?? '')
      setUserInitials(name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase())
      try {
        setNotifications(await getNotifications(user.id))
      } catch { /* notifications are best-effort */ }
    })
    getEntitlement().then(setEnt)
  }, [])

  const unreadCount = notifications.filter(n =>
    new Date(n.time).getTime() > (notifLastSeen ? new Date(notifLastSeen).getTime() : 0)
  ).length

  const markAllNotifsRead = useCallback(() => {
    const now = new Date().toISOString()
    localStorage.setItem('notifs-last-seen', now)
    setNotifLastSeen(now)
  }, [])

  // Persist pin
  const togglePin = useCallback(() => {
    setPinned(p => {
      const next = !p
      localStorage.setItem('sidebar-pinned', String(next))
      return next
    })
  }, [])

  // Hover zone handlers
  const onEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHover(true), 80)
  }
  const onLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHover(false), 450)
  }

  // On phones the sidebar becomes a slide-in drawer (no hover); content is full-width.
  const expanded = isMobile ? true : (hover || pinned)
  const sidebarWidth = isMobile ? EXPANDED_W : (expanded ? EXPANDED_W : RAIL_W)

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close user menu on outside-click or Escape
  useEffect(() => {
    if (!userMenuOpen) return
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserMenuOpen(false) }
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [userMenuOpen])


  const handleSignOut = async () => {
    await signOut()
    // Hard navigation so the server re-evaluates with the cleared session.
    window.location.href = '/'
  }

  // Which locked area (if any) the current path belongs to. Past results stay
  // readable, so /…/results is always exempt.
  function areaOf(path: string): string | null {
    if (path.includes('/results')) return null
    if (path.includes('/practice')) return 'practice'
    if (path.startsWith('/listening')) return 'listening'
    if (path.startsWith('/reading')) return 'reading'
    if (path.startsWith('/dashboard/writing')) return 'writing'
    if (path.startsWith('/dashboard/speaking')) return 'speaking'
    if (path.startsWith('/mock-tests')) return 'mockTests'
    if (path.startsWith('/vocabulary')) return 'vocabulary'
    if (path.startsWith('/dashboard/study-plan')) return 'studyPlan'
    if (path.startsWith('/dashboard/roast')) return 'roast'
    return null
  }

  // Once entitlement is known: new users finish onboarding first; then a free
  // user landing on a locked area (direct URL or stale link) goes straight to
  // /subscription — they never sit on a screen that will bounce them later.
  useEffect(() => {
    if (!ent) return
    if (!ent.onboardingCompleted) { router.replace('/onboarding'); return }
    if (ent.subscribed) return
    const area = areaOf(pathname)
    if (area && ent.locked.includes(area)) router.replace('/subscription')
  }, [ent, pathname, router])

  // Current page label for breadcrumb
  const currentNav = NAV_ITEMS.find(n => {
    if (n.href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(n.href)
  })

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Invisible left-edge hover zone (desktop only) */}
      {!isMobile && (
        <div
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: expanded ? sidebarWidth + 80 : 8,
            zIndex: 53, pointerEvents: 'auto',
          }}
        />
      )}

      {/* Mobile drawer backdrop */}
      {isMobile && mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.4)' }}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={isMobile ? undefined : onEnter}
        onMouseLeave={isMobile ? undefined : onLeave}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          zIndex: isMobile ? 50 : 55,
          width: sidebarWidth,
          background: 'var(--bg-elev)',
          borderRight: '1px solid var(--border)',
          boxShadow: (isMobile ? mobileNavOpen : (expanded && !pinned)) ? 'var(--shadow-lg)' : 'none',
          transform: isMobile ? (mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          transition: 'width .25s cubic-bezier(.2,.7,.2,1), transform .25s cubic-bezier(.2,.7,.2,1)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Logo + pin row */}
        <div style={{
          height: 60, display: 'flex', alignItems: 'center', padding: '0 16px',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          gap: 8, flexShrink: 0,
        }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 15 }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M4 19L10 5l3 7 2.5-4L20 19" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="20" cy="6" r="2" fill="var(--accent)"/>
            </svg>
            {expanded && (
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', color: 'var(--text)' }}>
                ielts<span style={{ color: 'var(--accent)' }}>.</span>camp
              </span>
            )}
          </Link>
          {expanded && (
            <button onClick={togglePin} aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'} title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
              style={{ padding: 6, color: pinned ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <NavIcon
                name={pinned ? 'bookmark-filled' : 'bookmark'}
                size={14}
                color={pinned ? 'var(--accent)' : 'var(--text-3)'}
                strokeWidth={1.8}
              />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_ITEMS.map(({ href, icon, key }) => {
            const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
            const locked = lockedSet.has(key)
            return (
              <Link key={href} href={locked ? '/subscription' : href}
                onClick={() => { if (isMobile) setMobileNavOpen(false) }}
                title={locked ? t('freeTier.navLock') : undefined}
                style={{
                display: 'flex', alignItems: 'center', gap: 12,
                height: 40, padding: '0 12px', borderRadius: 8,
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                position: 'relative', textDecoration: 'none',
                transition: 'background .15s, color .15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-soft)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <NavIcon name={icon} size={18} color={active ? 'var(--accent)' : 'var(--text-2)'} strokeWidth={active ? 2 : 1.7} />
                <span style={{
                  fontSize: 14, fontWeight: active ? 600 : 500,
                  opacity: expanded ? 1 : 0, transition: 'opacity .15s',
                  transitionDelay: expanded ? '.05s' : '0s',
                }}>
                  {t(`dashboard.${key}`)}
                </span>
                {locked && expanded && (
                  <span style={{ marginLeft: 'auto', display: 'flex' }}>
                    <NavIcon name="lock" size={13} color="var(--text-3)" strokeWidth={1.8} />
                  </span>
                )}
                {active && (
                  <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, background: 'var(--accent)', borderRadius: '0 2px 2px 0' }}/>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div ref={userMenuRef} style={{ padding: 8, borderTop: expanded ? '1px solid var(--border)' : 'none', position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', borderRadius: 10,
              background: userMenuOpen ? 'var(--bg-soft)' : 'transparent',
              transition: 'background .15s', overflow: 'hidden',
            }}
            onMouseEnter={e => { if (!userMenuOpen) e.currentTarget.style.background = 'var(--bg-soft)' }}
            onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, white))',
              color: 'var(--accent-fg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {userInitials}
            </div>
            {expanded && (
              <>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{userName}</div>
                  <div style={{ fontSize: 11, color: subscribed ? 'var(--text-3)' : 'var(--accent)', fontWeight: subscribed ? 400 : 600 }}>
                    {subscribed ? t('freeTier.planPro') : t('freeTier.planFree')}
                  </div>
                </div>
                <NavIcon name="dots" size={14} color="var(--text-2)" />
              </>
            )}
          </button>

          {/* User dropdown — position:fixed so it escapes the aside's overflow:hidden
              and stays readable even when the sidebar is collapsed to the 56px rail. */}
          {userMenuOpen && (
            <div className="card animate-fade-in" style={{
              position: 'fixed', bottom: 72, left: 12,
              width: 220, padding: 6, zIndex: 60, boxShadow: 'var(--shadow-lg)',
            }}>
              {/* User header (mirrors what the avatar button shows when expanded) */}
              <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                {userEmail && <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>}
              </div>
              {([
                ...(subscribed ? [] : [{ icon: 'lock', label: t('freeTier.upgrade'), action: () => { router.push('/subscription'); setUserMenuOpen(false) }, accent: true }]),
                { icon: 'settings', label: 'Settings', action: () => { router.push('/dashboard/settings'); setUserMenuOpen(false) } },
                null,
                { icon: 'logout', label: 'Sign out', action: handleSignOut, danger: true },
              ] as Array<{ icon: string; label: string; action: () => void; danger?: boolean; accent?: boolean } | null>).map((item, i) => {
                if (!item) return <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}/>
                const tone = item.danger ? 'var(--danger)' : item.accent ? 'var(--accent)' : 'var(--text)'
                return (
                  <button key={item.label} onClick={item.action} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 10px', borderRadius: 8, fontSize: 13,
                    color: tone, fontWeight: item.accent ? 600 : 400,
                    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <NavIcon name={item.icon} size={14} color={item.danger ? 'var(--danger)' : item.accent ? 'var(--accent)' : 'var(--text-2)'} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        marginLeft: isMobile ? 0 : (pinned ? EXPANDED_W : RAIL_W),
        transition: 'margin-left .25s cubic-bezier(.2,.7,.2,1)',
        minHeight: '100vh', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Topbar */}
        <header style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
          padding: isMobile ? '0 14px' : '0 32px', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            {isMobile && (
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, marginLeft: -6, borderRadius: 8, color: 'var(--text)' }}
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M3 12h18M3 18h18"/>
                </svg>
              </button>
            )}
            <span style={{ color: 'var(--text-3)' }}>Dashboard</span>
            {currentNav && currentNav.href !== '/dashboard' && (
              <>
                <span style={{ color: 'var(--text-3)', fontSize: 13 }}>›</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{t(`dashboard.${currentNav.key}`)}</span>
              </>
            )}
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Quick find */}
            <button
              onClick={() => setPaletteOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', borderRadius: 8, fontSize: 13,
                background: 'var(--bg-soft)', color: 'var(--text-2)',
                border: '1px solid var(--border)', transition: 'border-color .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <NavIcon name="search" size={13} color="var(--text-3)" />
              {!isMobile && <>
                <span>Quick find</span>
                <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 5px', borderRadius: 5, background: 'var(--bg-elev)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>⌘K</kbd>
              </>}
            </button>

            {/* Notifications bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: 'var(--text-2)', position: 'relative', transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <NavIcon name="bell" size={16} />
                {unreadCount > 0 && (
                  unreadCount > 9
                    ? <span style={{ position: 'absolute', top: 3, right: 0, minWidth: 16, height: 14, padding: '0 4px', borderRadius: 7, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--bg)', fontVariantNumeric: 'tabular-nums' }}>9+</span>
                    : <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 14, height: 14, padding: '0 3px', borderRadius: 7, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--bg)', fontVariantNumeric: 'tabular-nums' }}>{unreadCount}</span>
                )}
              </button>
              <NotificationsPanel
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                items={notifications}
                lastSeen={notifLastSeen}
                onMarkAllRead={markAllNotifsRead}
              />
            </div>

            {/* Language switcher */}
            <LanguageSwitcher />

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: 'var(--text-2)', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <NavIcon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
            </button>

            {/* Settings gear */}
            <button
              onClick={() => router.push('/dashboard/settings')}
              style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: 'var(--text-2)', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <NavIcon name="settings" size={15} />
            </button>
          </div>
        </header>

        {/* Page content — scrolls for normal pages; exam pages use flex:1 to fill */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', paddingBottom: isMobile && !isExam ? 'calc(58px + env(safe-area-inset-bottom))' : 0 }}>
          {children}
        </div>

        {/* Mobile bottom tab bar — primary destinations one thumb-tap away. */}
        {isMobile && !isExam && (
          <nav style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45,
            display: 'flex', background: 'var(--bg)', borderTop: '1px solid var(--border)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            boxShadow: '0 -1px 12px color-mix(in srgb, var(--text) 6%, transparent)',
          }}>
            {TAB_ITEMS.map(({ href, icon, key }) => {
              const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
              return (
                <Link key={href} href={href} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 3, padding: '8px 0 9px', textDecoration: 'none',
                  color: active ? 'var(--accent)' : 'var(--text-3)',
                }}>
                  <NavIcon name={icon} size={21} color={active ? 'var(--accent)' : 'var(--text-3)'} strokeWidth={active ? 2.2 : 1.8} />
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: '0.01em' }}>{t(`dashboard.${key}`)}</span>
                </Link>
              )
            })}
          </nav>
        )}
      </main>

      {/* Global overlays */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <SessionTracker />
          <CoachToaster />
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
