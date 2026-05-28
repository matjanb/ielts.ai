'use client'

import { useEffect } from 'react'
import { useToast } from '@/lib/toast'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
  name?: string
  email?: string
  streak?: number
  band?: string
}

export function ProfileModal({ open, onClose, name = 'User', email = '', streak = 0, band = '—' }: ProfileModalProps) {
  const { toast } = useToast()
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'color-mix(in srgb, #000 50%, transparent)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'fadeIn .15s ease both',
    }}>
      <div onClick={e => e.stopPropagation()} className="card animate-fade-up" style={{
        width: '100%', maxWidth: 460, padding: 0, boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Your profile</h3>
          <button onClick={onClose} style={{ color: 'var(--text-2)', padding: 4 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, white))',
              color: 'var(--accent-fg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{email}</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { k: 'Streak', v: String(streak) },
              { k: 'Band', v: band },
              { k: 'Plan', v: 'Pro' },
            ].map(s => (
              <div key={s.k} style={{ padding: 12, background: 'var(--bg-soft)', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{s.v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s.k}</div>
              </div>
            ))}
          </div>

          {/* Editable fields */}
          {[
            { label: 'Full name', defaultValue: name, placeholder: 'Your name' },
            { label: 'Email', defaultValue: email, placeholder: 'your@email.com' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                {f.label.toUpperCase()}
              </label>
              <input
                defaultValue={f.defaultValue}
                placeholder={f.placeholder}
                style={{
                  width: '100%', padding: '10px 12px', fontSize: 14,
                  background: 'var(--bg-elev)', border: '1px solid var(--border-strong)',
                  borderRadius: 8, color: 'var(--text)', outline: 'none',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              />
            </div>
          ))}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <button onClick={onClose} style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-strong)', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button onClick={() => { toast('Profile saved', 'success'); onClose() }} style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer',
            }}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
