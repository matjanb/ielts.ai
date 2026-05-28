'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider, useLanguage } from '@/lib/i18n/LanguageContext'
import { ToastProvider, useToast } from '@/lib/toast'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { NotificationsPanel } from '@/components/ui/NotificationsPanel'
import { SettingsModal } from '@/components/ui/SettingsModal'
import { ProfileModal } from '@/components/ui/ProfileModal'
import { signOut, getUser } from '@/lib/services/auth'
import type { ReactNode } from 'react'

const RAIL_W = 56
const EXPANDED_W = 240

const NAV_ITEMS = [
  { href: '/dashboard',            icon: 'home',      key: 'overview'   },
  { href: '/listening',            icon: 'headphones', key: 'listening'  },
  { href: '/reading',              icon: 'book',      key: 'reading'    },
  { href: '/dashboard/writing',    icon: 'pencil',    key: 'writing'    },
  { href: '/dashboard/speaking',   icon: 'mic',       key: 'speaking'   },
  { href: '/mock-tests',           icon: 'clipboard', key: 'mockTests'  },
  { href: '/vocabulary',           icon: 'layers',    key: 'vocabulary' },
  { href: '/dashboard/study-plan', icon: 'calendar',  key: 'studyPlan'  },
  { href: '/dashboard/progress',   icon: 'activity',  key: 'progress'   },
  { href: '/dashboard/settings',   icon: 'settings',  key: 'settings'   },
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
  activity:   <path d="M3 12h4l3-8 4 16 3-8h4"/>,
  settings:   <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  dots:       <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
  bookmark:   <path d="M6 3h12v18l-6-4-6 4z"/>,
  bell:       <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  sun:        <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon:       <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>,
  search:     <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>,
  user:       <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  logout:     <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>,
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

  // Sidebar hover state
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sidebar-pinned') === 'true'
  })
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Overlays
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // User info
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('')
  const [userInitials, setUserInitials] = useState('U')

  useEffect(() => {
    getUser().then(({ user }) => {
      if (!user) return
      const name = user.user_metadata?.full_name ?? user.email ?? 'User'
      setUserName(name)
      setUserEmail(user.email ?? '')
      setUserInitials(name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase())
    })
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
    hoverTimer.current = setTimeout(() => setHover(false), 200)
  }

  const expanded = hover || pinned
  const sidebarWidth = expanded ? EXPANDED_W : RAIL_W

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

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Current page label for breadcrumb
  const currentNav = NAV_ITEMS.find(n => {
    if (n.href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(n.href)
  })

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Invisible left-edge hover zone (always 8px) */}
      <div
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: expanded ? sidebarWidth + 16 : 8,
          zIndex: 30, pointerEvents: 'auto',
        }}
      />

      {/* Sidebar */}
      <aside
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 32,
          width: sidebarWidth,
          background: 'var(--bg-elev)',
          borderRight: '1px solid var(--border)',
          boxShadow: expanded && !pinned ? 'var(--shadow-lg)' : 'none',
          transition: 'width .25s cubic-bezier(.2,.7,.2,1)',
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
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, fontWeight: 700, letterSpacing: '-0.02em', fontSize: 15 }}>
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
            <button onClick={togglePin} style={{ padding: 6, color: pinned ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0 }}
              title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}>
              <NavIcon name="bookmark" size={14} color={pinned ? 'var(--accent)' : 'var(--text-3)'} strokeWidth={pinned ? 0 : 1.8}
                // @ts-ignore — fill via style
              />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_ITEMS.map(({ href, icon, key }) => {
            const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
            return (
              <Link key={href} href={href} style={{
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
                {active && (
                  <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, background: 'var(--accent)', borderRadius: '0 2px 2px 0' }}/>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: 8, borderTop: expanded ? '1px solid var(--border)' : 'none', position: 'relative', flexShrink: 0 }}>
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
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Pro plan</div>
                </div>
                <NavIcon name="dots" size={14} color="var(--text-2)" />
              </>
            )}
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div className="card animate-fade-in" style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 8, right: 8,
              padding: 6, zIndex: 60, boxShadow: 'var(--shadow-lg)',
            }}>
              {[
                { icon: 'user', label: 'Profile', action: () => { setProfileOpen(true); setUserMenuOpen(false) } },
                { icon: 'settings', label: 'Settings', action: () => { setSettingsOpen(true); setUserMenuOpen(false) } },
                null,
                { icon: 'logout', label: 'Sign out', action: handleSignOut, danger: true },
              ].map((item, i) => {
                if (!item) return <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}/>
                return (
                  <button key={item.label} onClick={item.action} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 10px', borderRadius: 8, fontSize: 13,
                    color: item.danger ? 'var(--danger)' : 'var(--text)',
                    background: 'transparent', transition: 'background .1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <NavIcon name={item.icon} size={14} color={item.danger ? 'var(--danger)' : 'var(--text-2)'} />
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
        marginLeft: pinned ? EXPANDED_W : RAIL_W,
        transition: 'margin-left .25s cubic-bezier(.2,.7,.2,1)',
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 20,
          backdropFilter: 'blur(20px)',
          background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
          borderBottom: '1px solid var(--border)',
          padding: '0 32px', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <span style={{ color: 'var(--text-3)' }}>Dashboard</span>
            {currentNav && currentNav.href !== '/dashboard' && (
              <>
                <NavIcon name="search" size={12} color="var(--text-3)" />
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
              <span>Quick find</span>
              <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 5px', borderRadius: 5, background: 'var(--bg-elev)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>⌘K</kbd>
            </button>

            {/* Notifications bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: 'var(--text-2)', position: 'relative', transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <NavIcon name="bell" size={16} />
                <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', border: '1.5px solid var(--bg)' }}/>
              </button>
              <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

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
              onClick={() => setSettingsOpen(true)}
              style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: 'var(--text-2)', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <NavIcon name="settings" size={15} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </main>

      {/* Global overlays */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} name={userName} email={userEmail} />
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
