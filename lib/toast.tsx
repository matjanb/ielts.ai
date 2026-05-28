'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastKind = 'info' | 'success' | 'warn' | 'danger'

interface Toast {
  id: string
  msg: string
  kind: ToastKind
}

interface ToastContextValue {
  toast: (msg: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((msg: string, kind: ToastKind = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-2), { id, msg, kind }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800)
  }, [])

  const colorFor = (kind: ToastKind) => {
    if (kind === 'success') return 'var(--accent)'
    if (kind === 'warn') return 'var(--warn)'
    if (kind === 'danger') return 'var(--danger)'
    return 'var(--accent)'
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 200,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} className="animate-fade-up" style={{
            background: 'color-mix(in srgb, var(--bg-elev) 95%, transparent)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '10px 14px 10px 12px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, fontWeight: 500,
            minWidth: 240,
            pointerEvents: 'auto',
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colorFor(t.kind)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7"/>
            </svg>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
