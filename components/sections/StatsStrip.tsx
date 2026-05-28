'use client'

import { useRef, useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function useInView(ref: React.RefObject<Element | null>) {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (!ref.current || seen) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true) }, { threshold: 0.3 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref, seen])
  return seen
}

function CountUp({ to, decimals = 0, suffix = '', prefix = '', duration = 1400 }: {
  to: number; decimals?: number; suffix?: string; prefix?: string; duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref)
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(to * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])

  const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()
  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{formatted}{suffix}
    </span>
  )
}

export function StatsStrip() {
  const { t } = useLanguage()

  const stats = [
    { node: <CountUp to={500000} suffix="+" />, label: t('stat.students') },
    { node: <CountUp to={2.0} decimals={1} prefix="+" />, label: t('stat.band') },
    { node: <CountUp to={93} suffix="%" />, label: t('stat.rate') },
  ]

  return (
    <section style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px 60px' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        padding: '32px 0',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {s.node}
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 8 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
