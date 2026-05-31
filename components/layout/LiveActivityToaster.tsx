'use client'

import { useState, useEffect } from 'react'

const EVENTS = [
  { name: 'Aiganym', city: 'Almaty', action: 'scored', band: '7.5', skill: 'Listening', flag: '🇰🇿' },
  { name: 'Rohit', city: 'Bengaluru', action: 'completed Mock #4', band: null, skill: null, flag: '🇮🇳' },
  { name: 'Madina', city: 'Tashkent', action: 'scored', band: '8.0', skill: 'Reading', flag: '🇺🇿' },
  { name: 'Lê', city: 'Hanoi', action: 'hit a 30-day streak', band: null, skill: null, flag: '🇻🇳' },
  { name: 'Carla', city: 'Mexico City', action: 'scored', band: '7.0', skill: 'Writing', flag: '🇲🇽' },
  { name: 'Yusuf', city: 'Cairo', action: 'completed Speaking', band: null, skill: null, flag: '🇪🇬' },
]

export function LiveActivityToaster() {
  const [visible, setVisible] = useState(false)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const init = setTimeout(() => setVisible(true), 4000)
    const loop = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % EVENTS.length)
        setVisible(true)
      }, 400)
    }, 5500)
    return () => { clearTimeout(init); clearInterval(loop) }
  }, [])

  const e = EVENTS[idx]

  return (
    <div style={{
      position: 'fixed', left: 20, bottom: 20, zIndex: 49,
      transform: `translateX(${visible ? 0 : -30}px)`,
      opacity: visible ? 1 : 0,
      transition: 'transform 0.35s cubic-bezier(0.2,0.7,0.2,1), opacity 0.25s',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px 10px 10px',
        background: 'color-mix(in srgb, var(--bg-elev) 92%, transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        boxShadow: 'var(--shadow-lg)',
        maxWidth: 360,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          {e.flag}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.3, flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span>{e.name} {e.action} </span>
            {e.band && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Band {e.band}</span>}
            {e.skill && <span style={{ color: 'var(--text-2)' }}> in {e.skill}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }}/>
            {e.city} · just now
          </div>
        </div>
      </div>
    </div>
  )
}
