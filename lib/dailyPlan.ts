/* ============================================================================
 * Daily plan generator (pure, deterministic).
 *
 * Builds a fresh list of tasks for "today" that targets the student's weakest
 * skills, with as many tasks as their daily-minute budget allows. No network,
 * no AI — recomputed on each load and refreshed naturally as skills improve.
 * ========================================================================== */

export type DailySkill = 'listening' | 'reading' | 'writing' | 'speaking' | 'vocabulary'

export interface DailyTask {
  skill: DailySkill
  variant: number   // which template wording to use
  minutes: number
  route: string
  qtype?: string    // specific question type to drill (reading/listening)
}

const TEMPLATES: Record<DailySkill, { minutes: number; route: string; variants: number }> = {
  vocabulary: { minutes: 10, route: '/vocabulary', variants: 1 },
  listening:  { minutes: 20, route: '/listening', variants: 2 },
  reading:    { minutes: 20, route: '/reading', variants: 2 },
  writing:    { minutes: 30, route: '/dashboard/writing', variants: 2 },
  speaking:   { minutes: 15, route: '/dashboard/speaking', variants: 2 },
}

const CORE: DailySkill[] = ['listening', 'reading', 'writing', 'speaking']

/**
 * @param bands        latest measured band per skill (undefined = not measured)
 * @param weakHints    skills the student flagged as weak (diagnostic)
 * @param dailyMinutes the student's daily time budget
 * @param daySeed      day-of-year, rotates template wording for variety
 */
export function buildDailyPlan(opts: {
  bands: Record<string, number | undefined>
  weakHints: string[]
  dailyMinutes: number
  daySeed: number
  weakType?: Partial<Record<string, string>>
}): DailyTask[] {
  const { bands, weakHints, dailyMinutes, daySeed, weakType = {} } = opts

  // Reading/Listening: if we know the weakest question type, drill exactly that.
  const targeted = (skill: DailySkill, tpl: { minutes: number; route: string }): DailyTask => {
    const qt = weakType[skill]
    return qt
      ? { skill, variant: 0, minutes: tpl.minutes, route: `${tpl.route}/practice?type=${encodeURIComponent(qt)}`, qtype: qt }
      : { skill, variant: 0, minutes: tpl.minutes, route: tpl.route }
  }

  // Lower score = weaker = higher priority. Unmeasured: very weak if flagged, else mid.
  const score = (s: DailySkill) => bands[s] ?? (weakHints.includes(s) ? 4.5 : 6.0)
  const ranked = [...CORE].sort((a, b) => score(a) - score(b))

  // Weighted rotation — the weakest skills recur more often.
  const seq: DailySkill[] = [...ranked, ranked[0], ranked[1], ranked[0], ranked[2], ranked[1], ranked[0]]

  const tasks: DailyTask[] = []
  let remaining = dailyMinutes

  // Daily vocabulary habit (only when there's room).
  if (dailyMinutes >= 25) {
    tasks.push({ skill: 'vocabulary', variant: 0, minutes: TEMPLATES.vocabulary.minutes, route: TEMPLATES.vocabulary.route })
    remaining -= TEMPLATES.vocabulary.minutes
  }

  const variantCount: Record<string, number> = {}
  const addedDrill = new Set<string>() // reading/listening drill per skill added once
  let i = 0
  while (remaining >= 12 && tasks.length < 8 && i < seq.length * 3) {
    const skill = seq[i % seq.length]
    i++
    const tpl = TEMPLATES[skill]
    if (tpl.minutes > remaining + 8) continue // would overshoot too much — try a smaller one

    if (skill === 'reading' || skill === 'listening') {
      if (addedDrill.has(skill)) continue // one focused drill per skill
      addedDrill.add(skill)
      tasks.push(targeted(skill, tpl))
    } else {
      const vc = variantCount[skill] ?? 0
      variantCount[skill] = vc + 1
      const variant = (vc + daySeed) % tpl.variants
      tasks.push({ skill, variant, minutes: tpl.minutes, route: tpl.route })
    }
    remaining -= tpl.minutes
  }

  // Guarantee at least one task even on a tiny budget.
  if (tasks.length === 0) {
    const skill = ranked[0]
    const tpl = TEMPLATES[skill]
    tasks.push(skill === 'reading' || skill === 'listening'
      ? targeted(skill, tpl)
      : { skill, variant: daySeed % tpl.variants, minutes: tpl.minutes, route: tpl.route })
  }

  return tasks
}

/** Day-of-year (1–366) — used to rotate task wording day to day. */
export function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
}
