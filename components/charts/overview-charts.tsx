'use client'

/* ============================================================
   Overview dashboard chart primitives — inline SVG, no libs
   All colors via --ov-* CSS variables (see globals.css)
   ============================================================ */

/* ─── BandRingOverview (gradient donut, target dot) ──────── */
export function BandRingOverview({
  band,
  target = 7.5,
  size = 180,
  stroke = 14,
  labelScore = 'Current score',
  labelTarget = 'target',
}: {
  band: number
  target?: number
  size?: number
  stroke?: number
  labelScore?: string
  labelTarget?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(band / 9, 1)
  const dash = c * pct
  const tPct = Math.min(target / 9, 1)
  const tx = size / 2 + r * Math.cos(2 * Math.PI * tPct - Math.PI / 2)
  const ty = size / 2 + r * Math.sin(2 * Math.PI * tPct - Math.PI / 2)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ovRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ov-accent)" />
            <stop offset="100%" stopColor="var(--ov-accent-2)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--ov-track)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#ovRingGrad)" strokeWidth={stroke}
          strokeDasharray={`${dash.toFixed(2)} ${c.toFixed(2)}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <circle cx={tx.toFixed(2)} cy={ty.toFixed(2)} r={6}
          fill="var(--ov-card)" />
        <circle cx={tx.toFixed(2)} cy={ty.toFixed(2)} r={4}
          fill="var(--ov-ink)" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none select-none pointer-events-none">
        <span style={{ fontSize: 11, color: 'var(--ov-muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {labelScore}
        </span>
        <span style={{ fontSize: 48, fontWeight: 700, color: 'var(--ov-ink)', marginTop: 8, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>
          {band.toFixed(1)}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ov-muted)', marginTop: 6 }}>
          {labelTarget}{' '}
          <span style={{ color: 'var(--ov-ink)', fontWeight: 600 }}>{target.toFixed(1)}</span>
        </span>
      </div>
    </div>
  )
}

/* ─── WeekChart (stacked bars by skill, today highlighted) ── */
const WEEK_COLORS = {
  writing:   '#60A5FA',
  speaking:  '#8B5CF6',
  reading:   '#A78BFA',
  listening: '#FBBF24',
} as const

export function WeekChart({
  days,
  height = 180,
}: {
  days: { label: string; writing: number; speaking: number; reading: number; listening: number; isToday?: boolean }[]
  height?: number
}) {
  const VW = 480, VH = height
  const PAD = { l: 8, r: 8, t: 14, b: 24 }
  const iW = VW - PAD.l - PAD.r
  const iH = VH - PAD.t - PAD.b
  const slotW = iW / (days.length || 1)
  const barW = slotW * 0.55
  const totals = days.map(d => d.writing + d.speaking + d.reading + d.listening)
  const max = Math.max(...totals, 90)
  const scale = iH / max

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ display: 'block' }}>
      {[0, 0.33, 0.66, 1].map((t, i) => (
        <line key={i}
          x1={PAD.l} x2={VW - PAD.r}
          y1={PAD.t + iH * t} y2={PAD.t + iH * t}
          stroke="var(--ov-line)"
          strokeDasharray={i === 3 ? '0' : '2 4'}
          opacity={i === 3 ? 0.8 : 0.5} />
      ))}
      {days.map((d, i) => {
        const cx = PAD.l + slotW * i + slotW / 2
        const total = totals[i]
        const isToday = !!d.isToday
        let yTop = PAD.t + iH
        return (
          <g key={i}>
            {total === 0 && (
              <rect
                x={cx - barW / 2} y={PAD.t + iH - 6}
                width={barW} height={6} rx={3}
                fill={isToday ? 'none' : 'var(--ov-track)'}
                stroke={isToday ? 'var(--ov-accent-fg)' : 'none'}
                strokeDasharray={isToday ? '2 3' : undefined}
                opacity={isToday ? 1 : 0.5}
              />
            )}
            {(['listening', 'reading', 'speaking', 'writing'] as const).map(k => {
              const h = d[k] * scale
              yTop -= h
              return h > 0 ? (
                <rect key={k}
                  x={cx - barW / 2} y={yTop}
                  width={barW} height={h}
                  fill={WEEK_COLORS[k]} rx={2} />
              ) : null
            })}
            <text x={cx} y={VH - 8} textAnchor="middle" fontSize={11}
              fill={isToday ? 'var(--ov-accent-fg)' : 'var(--ov-muted)'}
              fontWeight={isToday ? 600 : 400}>
              {d.label}
            </text>
            {total > 0 && (
              <text x={cx} y={PAD.t + iH - total * scale - 6}
                textAnchor="middle" fontSize={10}
                fill="var(--ov-ink)" opacity={0.6}
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                {total}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ─── MockChart (line + gradient fill + dashed target) ─────── */
export function MockChart({
  data,
  height = 200,
  target = 7.5,
  targetLabel = 'target',
}: {
  data: { label: string; value: number }[]
  height?: number
  target?: number
  targetLabel?: string
}) {
  const VW = 560, VH = height
  const PAD = { l: 32, r: 12, t: 14, b: 28 }
  const iW = VW - PAD.l - PAD.r
  const iH = VH - PAD.t - PAD.b
  const yMin = 5, yMax = 9
  const xOf = (i: number) => PAD.l + (i / Math.max(1, data.length - 1)) * iW
  const yOf = (v: number) => PAD.t + iH - ((v - yMin) / (yMax - yMin)) * iH
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d.value).toFixed(1)}`).join(' ')
  const area = data.length > 1
    ? `${path} L${xOf(data.length - 1).toFixed(1)},${(PAD.t + iH).toFixed(1)} L${PAD.l},${PAD.t + iH} Z`
    : ''

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="ovMockFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--ov-accent-fg)" stopOpacity={0.28} />
          <stop offset="100%" stopColor="var(--ov-accent-fg)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[5, 6, 7, 8, 9].map(t => (
        <g key={t}>
          <line x1={PAD.l} x2={VW - PAD.r} y1={yOf(t)} y2={yOf(t)}
            stroke="var(--ov-line)" strokeDasharray="2 4" opacity={0.6} />
          <text x={PAD.l - 8} y={yOf(t)} dy="0.32em" textAnchor="end" fontSize={10}
            fill="var(--ov-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {t}.0
          </text>
        </g>
      ))}
      {target >= yMin && target <= yMax && (
        <>
          <line x1={PAD.l} x2={VW - PAD.r} y1={yOf(target)} y2={yOf(target)}
            stroke="var(--ov-ink)" strokeDasharray="2 4" opacity={0.4} />
          <text x={VW - PAD.r} y={yOf(target) - 6} textAnchor="end" fontSize={10}
            fill="var(--ov-ink)" opacity={0.7}
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {targetLabel} {target.toFixed(1)}
          </text>
        </>
      )}
      {area && <path d={area} fill="url(#ovMockFill)" />}
      {data.length > 0 && (
        <path d={path} fill="none" stroke="var(--ov-accent-fg)" strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />
      )}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xOf(i)} cy={yOf(d.value)} r={4.5}
            fill="var(--ov-card)" stroke="var(--ov-accent-fg)" strokeWidth={2} />
          <text x={xOf(i)} y={VH - 10} textAnchor="middle" fontSize={10.5}
            fill="var(--ov-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

/* ─── OvHeatmap (12×7 activity grid, 5 intensity levels) ──── */
export function OvHeatmap({
  data,
  weeks = 12,
}: {
  data: number[]
  weeks?: number
}) {
  const cell = 12, gap = 4
  const W = weeks * (cell + gap) - gap
  const H = 7 * (cell + gap) - gap
  const OPACITY = [0.08, 0.25, 0.45, 0.7, 1]
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      {data.map((v, i) => {
        const w = Math.floor(i / 7)
        const d = i % 7
        return (
          <rect key={i}
            x={w * (cell + gap)} y={d * (cell + gap)}
            width={cell} height={cell} rx={2.5}
            fill={v === 0 ? 'var(--ov-track)' : 'var(--ov-accent-fg)'}
            opacity={v === 0 ? 1 : OPACITY[Math.min(v, 4)]} />
        )
      })}
    </svg>
  )
}

/* ─── MiniSpark (full-width sparkline with area fill) ──────── */
export function MiniSpark({
  data,
  color = 'var(--ov-accent-fg)',
  h = 28,
}: {
  data: number[]
  color?: string
  h?: number
}) {
  if (data.length < 2) return <svg className="w-full" viewBox={`0 0 80 ${h}`} />
  const VW = 80
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const x = (i: number) => (i / (data.length - 1)) * VW
  const y = (v: number) => h - 2 - ((v - min) / range) * (h - 4)
  const pathD = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${VW},${h} L0,${h} Z`
  const gradId = `msp_${color.replace(/[^a-z0-9]/gi, '_').slice(0, 16)}`
  return (
    <svg viewBox={`0 0 ${VW} ${h}`} className="w-full" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
