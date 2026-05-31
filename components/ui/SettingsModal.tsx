'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useToast } from '@/lib/toast'

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 40, height: 22, borderRadius: 999, position: 'relative',
        background: on ? 'var(--accent)' : 'var(--border-strong)',
        transition: 'background .2s', border: 'none', cursor: 'pointer',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: on ? 20 : 2,
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }}/>
    </button>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
      {children}
    </div>
  )
}

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [sound, setSound] = useState(true)
  const [autoSubmit, setAutoSubmit] = useState(true)
  const [beta, setBeta] = useState(false)

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
        width: '100%', maxWidth: 520, padding: 0, boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Settings</h3>
          <button onClick={onClose} style={{ color: 'var(--text-2)', padding: 4 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'grid', gap: 18 }}>
          <Row label="Theme">
            <div style={{ display: 'flex', gap: 6 }}>
              {['light', 'dark'].map(v => (
                <button key={v} onClick={() => setTheme(v)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: theme === v ? 'var(--accent)' : 'var(--bg-soft)',
                  color: theme === v ? 'var(--accent-fg)' : 'var(--text)',
                  border: 'none', cursor: 'pointer', transition: 'background .15s',
                }}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Daily reminder">
            <select style={{
              width: 180, padding: '8px 10px', fontSize: 13,
              background: 'var(--bg-elev)', border: '1px solid var(--border-strong)',
              borderRadius: 8, color: 'var(--text)', cursor: 'pointer',
            }} onChange={() => toast('Reminder updated')}>
              <option>08:00 daily</option>
              <option>12:00 daily</option>
              <option>18:00 daily</option>
              <option>Disabled</option>
            </select>
          </Row>

          <Row label="Exam date">
            <input type="date" defaultValue="2026-06-13" style={{
              width: 180, padding: '8px 10px', fontSize: 13,
              background: 'var(--bg-elev)', border: '1px solid var(--border-strong)',
              borderRadius: 8, color: 'var(--text)',
            }} onChange={() => toast('Exam date saved')}/>
          </Row>

          <Row label="Sound effects"><Toggle on={sound} onChange={setSound}/></Row>
          <Row label="Auto-submit at time limit"><Toggle on={autoSubmit} onChange={setAutoSubmit}/></Row>
          <Row label="Beta features"><Toggle on={beta} onChange={setBeta}/></Row>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <button style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--danger)', background: 'transparent', border: '1px solid var(--border-strong)', cursor: 'pointer' }}
            onClick={() => toast('Account paused')}>
            Pause account
          </button>
          <button style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', cursor: 'pointer' }}
            onClick={() => { toast('Settings saved', 'success'); onClose() }}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
