'use client'

/* ============================================================
   SVG chart primitives — Progress & Statistics
   ============================================================ */

/* ─── BandRing (168 × 168 centered donut) ─────────────────── */
export function BandRing({
  band,
  target = 7.5,
  size = 168,
  stroke = 12,
  label = 'Overall',
}: {
  band: number
  target?: number
  size?: number
  stroke?: number
  label?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(band / 9, 1)
  const tPct = Math.min(target / 9, 1)
  // SVG is rotated −90°, so dot coords use the un-rotated frame
  const dotX = size / 2 + r * Math.cos(2 * Math.PI * tPct)
  const dotY = size / 2 + r * Math.sin(2 * Math.PI * tPct)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          className="stroke-gray-100 dark:stroke-gray-800" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#6366f1" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`} />
        <circle cx={dotX} cy={dotY} r={4}
          className="fill-gray-900 dark:fill-white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none select-none">
        <span className="text-[11px] font-medium text-[var(--text-3)] uppercase tracking-widest">{label}</span>
        <span className="text-[44px] font-bold text-[var(--text)] mt-2 tabular-nums">{band.toFixed(1)}</span>
        <span className="text-xs text-[var(--text-3)] mt-1.5">target {target.toFixed(1)}</span>
      </div>
    </div>
  )
}

/* ─── BandBar (8 px horizontal bar with target tick) ──────── */
export function BandBar({
  value,
  target = 7.5,
  max = 9,
}: {
  value: number
  target?: number
  max?: number
}) {
  const pct = (Math.min(value, max) / max) * 100
  const tPct = (Math.min(target, max) / max) * 100
  return (
    <div className="relative h-2 rounded-full bg-[var(--bg-soft)]">
      <div className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${pct}%`, background: 'var(--accent)' }} />
      <div className="absolute w-0.5 opacity-60"
        style={{ left: `${tPct}%`, top: '-4px', bottom: '-4px', transform: 'translateX(-1px)', background: 'var(--text)' }} />
    </div>
  )
}

/* ─── Sparkline (60 × 22 inline line) ─────────────────────── */
export function Sparkline({
  data,
  w = 60,
  h = 22,
}: {
  data: number[]
  w?: number
  h?: number
}) {
  if (data.length < 2) return <svg width={w} height={h} />
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const x = (i: number) => (i / (data.length - 1)) * w
  const y = (v: number) => h - ((v - min) / range) * (h - 2) - 1
  const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke="#6366f1" strokeWidth={1.6}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── LineChart (band progression over time) ──────────────── */
export function LineChart({
  data,
  yMin = 5,
  yMax = 9,
  target = 7.5,
  height = 220,
}: {
  data: { label: string; value: number }[]
  yMin?: number
  yMax?: number
  target?: number
  height?: number
}) {
  const VW = 720, VH = height
  const PAD = { l: 36, r: 16, t: 16, b: 28 }
  const iW = VW - PAD.l - PAD.r
  const iH = VH - PAD.t - PAD.b

  const xOf = (i: number) => PAD.l + (i / Math.max(1, data.length - 1)) * iW
  const yOf = (v: number) => PAD.t + iH - ((v - yMin) / (yMax - yMin)) * iH

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d.value).toFixed(1)}`).join(' ')
  const area = data.length > 1
    ? `${path} L${xOf(data.length - 1).toFixed(1)},${(PAD.t + iH).toFixed(1)} L${PAD.l},${PAD.t + iH} Z`
    : ''

  const yTicks = [5, 6, 7, 8, 9]

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="lc-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map(t => (
        <g key={t}>
          <line x1={PAD.l} x2={VW - PAD.r} y1={yOf(t)} y2={yOf(t)}
            stroke="currentColor" strokeOpacity="0.07" strokeDasharray="3 3" />
          <text x={PAD.l - 8} y={yOf(t)} textAnchor="end" dominantBaseline="middle"
            className="fill-gray-400 dark:fill-gray-500"
            style={{ fontSize: 10, fontFamily: 'ui-monospace,monospace' }}>
            {t}.0
          </text>
        </g>
      ))}

      {target >= yMin && target <= yMax && (
        <>
          <line x1={PAD.l} x2={VW - PAD.r} y1={yOf(target)} y2={yOf(target)}
            className="stroke-gray-700 dark:stroke-gray-300" strokeDasharray="2 4" strokeOpacity="0.4" />
          <text x={VW - PAD.r} y={yOf(target) - 6} textAnchor="end"
            className="fill-gray-500 dark:fill-gray-400"
            style={{ fontSize: 10, fontFamily: 'ui-monospace,monospace' }}>
            target {target.toFixed(1)}
          </text>
        </>
      )}

      {area && <path d={area} fill="url(#lc-grad)" />}

      {data.length > 0 && (
        <path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
      )}

      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xOf(i)} cy={yOf(d.value)} r={4}
            className="fill-white dark:fill-gray-950" stroke="#6366f1" strokeWidth={2} />
          <text x={xOf(i)} y={VH - 8} textAnchor="middle"
            className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: 10.5 }}>
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

/* ─── StackBars (7-day stacked by skill) ──────────────────── */
const STACK_COLORS = {
  w: '#6366f1',
  s: '#818cf8',
  r: '#a5b4fc',
  l: '#c7d2fe',
} as const

export function StackBars({
  days,
  height = 200,
}: {
  days: { label: string; w: number; s: number; r: number; l: number }[]
  height?: number
}) {
  const VW = 720, VH = height
  const PAD = { l: 24, r: 16, t: 14, b: 24 }
  const iW = VW - PAD.l - PAD.r
  const iH = VH - PAD.t - PAD.b
  const slotW = iW / (days.length || 1)
  const barW = slotW * 0.55
  const max = Math.max(...days.map(d => d.w + d.s + d.r + d.l), 60)

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i}
          x1={PAD.l} x2={VW - PAD.r}
          y1={PAD.t + iH * (1 - t)} y2={PAD.t + iH * (1 - t)}
          stroke="currentColor" strokeOpacity="0.07"
          strokeDasharray={t === 0 ? '0' : '3 3'} />
      ))}

      {days.map((d, i) => {
        const cx = PAD.l + slotW * i + slotW / 2
        const total = d.w + d.s + d.r + d.l
        const scale = iH / max
        let yTop = PAD.t + iH

        const segments = (['l', 'r', 's', 'w'] as const).map(k => {
          const h = d[k] * scale
          yTop -= h
          return { k, h, y: yTop }
        }).filter(s => s.h > 0)

        return (
          <g key={i}>
            {segments.map(({ k, h, y }) => (
              <rect key={k} x={cx - barW / 2} y={y} width={barW} height={h}
                fill={STACK_COLORS[k]} rx={2} />
            ))}
            <text x={cx} y={VH - 6} textAnchor="middle"
              className="fill-gray-400 dark:fill-gray-500"
              style={{ fontSize: 11, fontFamily: 'ui-monospace,monospace' }}>
              {d.label}
            </text>
            {total > 0 && (
              <text x={cx} y={PAD.t + iH - total * scale - 5} textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400"
                style={{ fontSize: 10, fontFamily: 'ui-monospace,monospace' }}>
                {total}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ─── CriteriaRadar (4-axis polygon) ──────────────────────── */
export function CriteriaRadar({
  values,
  labels,
  size = 220,
}: {
  values: number[]
  labels: string[]
  size?: number
}) {
  const cx = size / 2, cy = size / 2
  const r = size / 2 - 30
  const n = values.length
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const pt = (v: number, i: number): [number, number] => [
    cx + (v / 9) * r * Math.cos(ang(i)),
    cy + (v / 9) * r * Math.sin(ang(i)),
  ]

  const poly = values.map((v, i) => pt(v, i).join(',')).join(' ')

  return (
    <svg width={size} height={size}>
      {[3, 5, 7, 9].map(g => {
        const rr = (g / 9) * r
        const pts = Array.from({ length: n }, (_, k) => {
          const a = ang(k)
          return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`
        }).join(' ')
        return <polygon key={g} points={pts} fill="none"
          className="stroke-gray-100 dark:stroke-gray-800" strokeWidth={1} />
      })}

      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(9, i)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          className="stroke-gray-100 dark:stroke-gray-800" strokeWidth={1} />
      })}

      <polygon points={poly} fill="#6366f1" fillOpacity="0.18"
        stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" />

      {values.map((v, i) => {
        const [x, y] = pt(v, i)
        return <circle key={i} cx={x} cy={y} r={3.5} fill="#6366f1" />
      })}

      {labels.map((lab, i) => {
        const rr = r + 18
        const x = cx + rr * Math.cos(ang(i))
        const y = cy + rr * Math.sin(ang(i))
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: 10.5 }}>
            {lab}
          </text>
        )
      })}
    </svg>
  )
}

/* ─── StreakHeatmap (12 × 7 activity grid) ────────────────── */
export function StreakHeatmap({
  data,
  weeks = 12,
}: {
  data: number[]
  weeks?: number
}) {
  const cell = 14, gap = 4
  const W = weeks * (cell + gap)
  const H = 7 * (cell + gap)
  const maxVal = Math.max(...data, 1)

  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      {data.map((v, i) => {
        const w = Math.floor(i / 7)
        const d = i % 7
        const intensity = v === 0 ? 0 : 0.2 + (Math.min(v / maxVal, 1)) * 0.8
        return (
          <rect key={i}
            x={w * (cell + gap)} y={d * (cell + gap)}
            width={cell} height={cell} rx={3}
            fill={v === 0 ? undefined : `rgba(99,102,241,${intensity.toFixed(2)})`}
            className={v === 0 ? 'fill-gray-100 dark:fill-gray-800' : ''} />
        )
      })}
    </svg>
  )
}
