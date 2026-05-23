'use client'

/* ============================================================
   Shared SVG chart primitives for the Progress page
   ============================================================ */

const SKILL_COLORS: Record<string, string> = {
  overall:   '#6366f1',
  writing:   '#8b5cf6',
  speaking:  '#3b82f6',
  reading:   '#10b981',
  listening: '#fb7185',
}

/* ---- BandRing ---- */
export function BandRing({
  score,
  target = 7.5,
  color = '#6366f1',
  label,
}: {
  score: number
  target?: number
  color?: string
  label: string
}) {
  const R = 37
  const circ = 2 * Math.PI * R
  const filled = (Math.min(Math.max(score, 0), 9) / 9) * circ

  // Target tick: small line segment on the arc
  const targetRad = ((target / 9) * 2 * Math.PI) - Math.PI / 2
  const TO = { x: 50 + (R + 2) * Math.cos(targetRad), y: 50 + (R + 2) * Math.sin(targetRad) }
  const TI = { x: 50 + (R - 6) * Math.cos(targetRad), y: 50 + (R - 6) * Math.sin(targetRad) }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg viewBox="0 0 100 100" width={84} height={84}>
        {/* Track */}
        <circle cx={50} cy={50} r={R} fill="none" strokeWidth={8}
          className="stroke-gray-100 dark:stroke-gray-800" />
        {/* Score arc – rotated to start at 12 o'clock */}
        <circle cx={50} cy={50} r={R} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={`${filled.toFixed(2)} ${(circ - filled).toFixed(2)}`}
          transform="rotate(-90 50 50)" />
        {/* Target tick */}
        <line x1={TO.x} y1={TO.y} x2={TI.x} y2={TI.y}
          stroke={color} strokeWidth={2.5} strokeLinecap="round" opacity={0.5} />
        {/* Score value */}
        <text x={50} y={47} textAnchor="middle" dominantBaseline="middle"
          className="fill-gray-900 dark:fill-white"
          style={{ fontSize: 19, fontWeight: 700 }}>
          {score > 0 ? score.toFixed(1) : '—'}
        </text>
        {/* /9.0 sub-label */}
        <text x={50} y={62} textAnchor="middle" dominantBaseline="middle"
          className="fill-gray-400 dark:fill-gray-500"
          style={{ fontSize: 9 }}>
          / 9.0
        </text>
      </svg>
      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  )
}

/* ---- LineChart ---- */
export function LineChart({
  points,
  color = '#6366f1',
  targetBand,
  height = 110,
}: {
  points: { label: string; value: number }[]
  color?: string
  targetBand?: number
  height?: number
}) {
  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-gray-400 dark:text-gray-500">
        Not enough data yet
      </div>
    )
  }

  const W = 280
  const H = height
  const PAD = { top: 10, right: 12, bottom: 22, left: 28 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  const vals = points.map(p => p.value)
  const ref = targetBand ?? 0
  const minV = Math.max(0, Math.min(...vals, ref) - 0.5)
  const maxV = Math.min(9, Math.max(...vals, ref) + 0.5)
  const range = maxV - minV || 1

  const sx = (i: number) => PAD.left + (i / (points.length - 1)) * iW
  const sy = (v: number) => PAD.top + (1 - (v - minV) / range) * iH

  const linePts = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(p.value).toFixed(1)}`).join(' ')
  const areaPts = `${linePts} L${sx(points.length - 1).toFixed(1)},${(PAD.top + iH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + iH).toFixed(1)} Z`

  const yTicks = [Math.ceil(minV + 0.5), Math.round((minV + maxV) / 2), Math.floor(maxV - 0.5)]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`lg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Area */}
      <path d={areaPts} fill={`url(#lg-${color.replace('#', '')})`} />

      {/* Target dashed line */}
      {targetBand != null && (
        <line x1={PAD.left} y1={sy(targetBand)} x2={PAD.left + iW} y2={sy(targetBand)}
          stroke={color} strokeWidth={1} strokeDasharray="4 3" opacity={0.35} />
      )}

      {/* Line */}
      <path d={linePts} fill="none" stroke={color} strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={sx(i)} cy={sy(p.value)} r={3}
          fill={color} className="stroke-white dark:stroke-gray-900" strokeWidth={2} />
      ))}

      {/* X labels */}
      {points.map((p, i) => (
        <text key={i} x={sx(i)} y={H - 4} textAnchor="middle"
          className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: 8 }}>
          {p.label}
        </text>
      ))}

      {/* Y ticks */}
      {yTicks.map((v, i) => (
        <text key={i} x={PAD.left - 4} y={sy(v)} textAnchor="end" dominantBaseline="middle"
          className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: 8 }}>
          {v.toFixed(1)}
        </text>
      ))}
    </svg>
  )
}

/* ---- StackBars (7-day weekly study time) ---- */
export function StackBars({
  days,
}: {
  days: { label: string; writing: number; speaking: number; reading: number; listening: number }[]
}) {
  type SkillKey = 'writing' | 'speaking' | 'reading' | 'listening'
  const SKILLS: SkillKey[] = ['writing', 'speaking', 'reading', 'listening']
  const COLORS: Record<SkillKey, string> = {
    writing:   SKILL_COLORS.writing,
    speaking:  SKILL_COLORS.speaking,
    reading:   SKILL_COLORS.reading,
    listening: SKILL_COLORS.listening,
  }

  const maxTotal = Math.max(...days.map(d => SKILLS.reduce((s, k) => s + d[k], 0)), 30)
  const BAR_W = 14
  const COL_W = 20
  const H_BARS = 72
  const H_LABEL = 14
  const H = H_BARS + H_LABEL
  const W = days.length * COL_W

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {days.map((d, i) => {
        const total = SKILLS.reduce((s, k) => s + d[k], 0)
        if (total === 0 && i < days.length) {
          /* empty bar */
        }
        let yBottom = H_BARS
        const rects = SKILLS.map(sk => {
          const h = (d[sk] / maxTotal) * H_BARS
          yBottom -= h
          return { sk, h, y: yBottom }
        }).filter(r => r.h > 0)

        return (
          <g key={i} transform={`translate(${i * COL_W + (COL_W - BAR_W) / 2}, 0)`}>
            {/* background bar */}
            <rect x={0} y={0} width={BAR_W} height={H_BARS} rx={3}
              className="fill-gray-100 dark:fill-gray-800" />
            {rects.map(({ sk, h, y }) => (
              <rect key={sk} x={0} y={y} width={BAR_W} height={Math.max(h, 0.5)}
                fill={COLORS[sk]} rx={3} opacity={0.9} />
            ))}
            <text x={BAR_W / 2} y={H - 2} textAnchor="middle"
              className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: 8 }}>
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ---- CriteriaRadar (4-axis diamond) ---- */
export function CriteriaRadar({
  task,
  coherence,
  lexical,
  grammar,
  color = '#8b5cf6',
}: {
  task: number
  coherence: number
  lexical: number
  grammar: number
  color?: string
}) {
  const CX = 100, CY = 100, MAX_R = 68

  const axes = [
    { label: 'Task', angle: -Math.PI / 2, value: task },
    { label: 'Coherence', angle: 0, value: coherence },
    { label: 'Lexical', angle: Math.PI / 2, value: lexical },
    { label: 'Grammar', angle: Math.PI, value: grammar },
  ]

  const pt = (v: number, angle: number) => ({
    x: CX + (v / 9) * MAX_R * Math.cos(angle),
    y: CY + (v / 9) * MAX_R * Math.sin(angle),
  })

  const gridLevels = [3, 6, 9]
  const gridPolygons = gridLevels.map(lv =>
    axes.map(a => pt(lv, a.angle)).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  )

  const dataPoints = axes.map(a => pt(a.value, a.angle))
  const dataPoly = dataPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const axisEnds = axes.map(a => pt(9, a.angle))

  // Label offsets (pad outward from center)
  const labelPts = axes.map(a => {
    const r = MAX_R + 16
    return { x: CX + r * Math.cos(a.angle), y: CY + r * Math.sin(a.angle), label: a.label, value: a.value }
  })

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[200px] mx-auto">
      {/* Grid polygons */}
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none"
          className="stroke-gray-100 dark:stroke-gray-800" strokeWidth={1} />
      ))}
      {/* Axis lines */}
      {axisEnds.map((end, i) => (
        <line key={i} x1={CX} y1={CY} x2={end.x} y2={end.y}
          className="stroke-gray-100 dark:stroke-gray-800" strokeWidth={1} />
      ))}
      {/* Data polygon */}
      <polygon points={dataPoly} fill={color} fillOpacity={0.15}
        stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {/* Dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4}
          fill={color} className="stroke-white dark:stroke-gray-900" strokeWidth={1.5} />
      ))}
      {/* Labels */}
      {labelPts.map((lp, i) => (
        <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
          className="fill-gray-500 dark:fill-gray-400" style={{ fontSize: 9 }}>
          {lp.label}
        </text>
      ))}
      {/* Score labels next to dots */}
      {dataPoints.map((p, i) => (
        <text key={i}
          x={p.x + (axes[i].angle === Math.PI ? -14 : axes[i].angle === 0 ? 14 : 0)}
          y={p.y + (axes[i].angle === -Math.PI / 2 ? -9 : axes[i].angle === Math.PI / 2 ? 9 : 0)}
          textAnchor="middle" dominantBaseline="middle"
          fill={color} style={{ fontSize: 9, fontWeight: 700 }}>
          {axes[i].value.toFixed(1)}
        </text>
      ))}
    </svg>
  )
}

/* ---- StreakHeatmap (12 weeks × 7 days) ---- */
export function StreakHeatmap({ cells }: { cells: number[] }) {
  // cells: 84 values, index 0 = oldest day, 83 = today
  // arranged as week * 7 + dayOfWeek
  const CELL = 11, GAP = 3
  const WEEKS = 12, DAYS = 7
  const W = WEEKS * (CELL + GAP) - GAP
  const H = DAYS * (CELL + GAP) - GAP

  const maxVal = Math.max(...cells, 1)
  const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S']

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`-18 0 ${W + 18} ${H}`} className="w-full" style={{ height: H + 4 }}>
        {/* Day labels */}
        {DAY_LABELS.map((lbl, d) => lbl ? (
          <text key={d} x={-3} y={d * (CELL + GAP) + CELL / 2}
            textAnchor="end" dominantBaseline="middle"
            className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: 7 }}>
            {lbl}
          </text>
        ) : null)}

        {/* Cells */}
        {cells.map((val, idx) => {
          const week = Math.floor(idx / DAYS)
          const day = idx % DAYS
          const x = week * (CELL + GAP)
          const y = day * (CELL + GAP)
          const intensity = val === 0 ? 0 : 0.2 + (Math.min(val / maxVal, 1)) * 0.8

          return (
            <rect key={idx} x={x} y={y} width={CELL} height={CELL} rx={2}
              className={val === 0 ? 'fill-gray-100 dark:fill-gray-800' : ''}
              style={val > 0 ? { fill: `rgba(99, 102, 241, ${intensity.toFixed(2)})` } : undefined} />
          )
        })}
      </svg>
    </div>
  )
}
