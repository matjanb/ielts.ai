/* ============================================================================
 * Daily plan generator (pure, deterministic).
 *
 * Builds a fresh list of tasks for "today" that targets the student's weakest
 * skills, with as many tasks as their daily-minute budget allows. No network,
 * no AI — recomputed on each load and refreshed naturally as skills improve.
 *
 * It is the SINGLE source of truth for "today" on both the Overview and the
 * Study Plan page, so the two screens always agree. Three signals shape it:
 *   1. progress   — latest measured band per skill (weaker = higher priority)
 *   2. weak sides — weakest skills + weakest question types per section
 *   3. time left  — approx days to the exam: the closer it is, the harder the
 *                   plan leans on the weakest sections (and adds a timed mock).
 * Each task also carries a `reason` so the UI can explain *why* it's there.
 * ========================================================================== */

export type DailySkill = 'listening' | 'reading' | 'writing' | 'speaking' | 'vocabulary'
/** Task skills include 'mock' (a full/timed practice test) which has no template. */
export type TaskSkill = DailySkill | 'mock'

/** Why a task is on today's list — the UI turns this into a localized sentence. */
export type TaskReason = 'weakest' | 'weak' | 'maintain' | 'habit' | 'mock'

/** How urgent the exam is, derived from the approximate days left. */
export type Urgency = 'high' | 'med' | 'low'

export interface DailyTask {
  skill: TaskSkill
  variant: number   // which template wording to use
  minutes: number
  route: string
  qtype?: string    // specific question type to drill (reading/listening)
  reason: TaskReason
}

/** Compact rationale the UI uses to explain today's (and the week's) focus. */
export interface DailySummary {
  urgency: Urgency
  daysToExam?: number
  weakest: DailySkill[]   // up to two weakest core skills, weakest first
}

const TEMPLATES: Record<DailySkill, { minutes: number; route: string; variants: number }> = {
  vocabulary: { minutes: 10, route: '/vocabulary', variants: 1 },
  listening:  { minutes: 20, route: '/listening', variants: 2 },
  reading:    { minutes: 20, route: '/reading', variants: 2 },
  writing:    { minutes: 30, route: '/dashboard/writing', variants: 2 },
  speaking:   { minutes: 15, route: '/dashboard/speaking', variants: 2 },
}

const MOCK = { minutes: 30, route: '/mock-tests' }

const CORE: DailySkill[] = ['listening', 'reading', 'writing', 'speaking']

/** Lower score = weaker = higher priority. Unmeasured: very weak if flagged, else mid. */
function rankSkills(bands: Record<string, number | undefined>, weakHints: string[]): DailySkill[] {
  const score = (s: DailySkill) => bands[s] ?? (weakHints.includes(s) ? 4.5 : 6.0)
  return [...CORE].sort((a, b) => score(a) - score(b))
}

/** Map approximate days-to-exam to an urgency band. Unknown = relaxed. */
export function urgencyFromDays(days?: number): Urgency {
  if (days == null) return 'low'
  if (days <= 30) return 'high'
  if (days <= 75) return 'med'
  return 'low'
}

/**
 * @param bands        latest measured band per skill (undefined = not measured)
 * @param weakHints    skills the student flagged as weak (diagnostic)
 * @param dailyMinutes the student's daily time budget
 * @param daySeed      day-of-year, rotates template wording for variety
 * @param weakType     weakest question type per section (drilled directly)
 * @param daysToExam   approximate days until the test (scales weak-skill pressure)
 */
export function buildDailyPlan(opts: {
  bands: Record<string, number | undefined>
  weakHints: string[]
  dailyMinutes: number
  daySeed: number
  weakType?: Partial<Record<string, string>>
  daysToExam?: number
}): DailyTask[] {
  const { bands, weakHints, dailyMinutes, daySeed, weakType = {}, daysToExam } = opts

  const ranked = rankSkills(bands, weakHints)
  const [a, b, c, d] = ranked
  const urgency = urgencyFromDays(daysToExam)

  const reasonFor = (s: TaskSkill): TaskReason =>
    s === 'vocabulary' ? 'habit'
    : s === 'mock' ? 'mock'
    : s === a ? 'weakest'
    : s === b ? 'weak'
    : 'maintain'

  // Reading/Listening: if we know the weakest question type, drill exactly that.
  const targeted = (skill: DailySkill, tpl: { minutes: number; route: string }): DailyTask => {
    const qt = weakType[skill]
    return qt
      ? { skill, variant: 0, minutes: tpl.minutes, route: `${tpl.route}/practice?type=${encodeURIComponent(qt)}`, qtype: qt, reason: reasonFor(skill) }
      : { skill, variant: 0, minutes: tpl.minutes, route: tpl.route, reason: reasonFor(skill) }
  }

  // Weighted rotation — the closer the exam, the more the weakest skills recur.
  const SEQ: Record<Urgency, DailySkill[]> = {
    high: [a, b, a, b, a, c, a, b, c],          // hammer the two weakest
    med:  [a, b, c, d, a, b, a, c, b, a],        // weighted toward weak, all covered
    low:  [a, b, c, d, a, b, c, a, d, b],        // balanced, gentle weak bias
  }
  const seq = SEQ[urgency]

  const tasks: DailyTask[] = []
  let remaining = dailyMinutes

  // Daily vocabulary habit (only when there's room).
  if (dailyMinutes >= 25) {
    tasks.push({ skill: 'vocabulary', variant: 0, minutes: TEMPLATES.vocabulary.minutes, route: TEMPLATES.vocabulary.route, reason: 'habit' })
    remaining -= TEMPLATES.vocabulary.minutes
  }

  // Exam imminent: a timed mock surfaces weak areas under real conditions.
  if (urgency === 'high' && remaining >= MOCK.minutes + 12) {
    tasks.push({ skill: 'mock', variant: 0, minutes: MOCK.minutes, route: MOCK.route, reason: 'mock' })
    remaining -= MOCK.minutes
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
      tasks.push({ skill, variant, minutes: tpl.minutes, route: tpl.route, reason: reasonFor(skill) })
    }
    remaining -= tpl.minutes
  }

  // Guarantee at least one task even on a tiny budget.
  if (tasks.length === 0) {
    const skill = ranked[0]
    const tpl = TEMPLATES[skill]
    tasks.push(skill === 'reading' || skill === 'listening'
      ? targeted(skill, tpl)
      : { skill, variant: daySeed % tpl.variants, minutes: tpl.minutes, route: tpl.route, reason: reasonFor(skill) })
  }

  return tasks
}

/** Compact rationale for the UI — the "why" behind today's focus and the week. */
export function dailyPlanSummary(opts: {
  bands: Record<string, number | undefined>
  weakHints: string[]
  daysToExam?: number
}): DailySummary {
  const ranked = rankSkills(opts.bands, opts.weakHints)
  return {
    urgency: urgencyFromDays(opts.daysToExam),
    daysToExam: opts.daysToExam,
    weakest: ranked.slice(0, 2),
  }
}

/** Day-of-year (1–366) — used to rotate task wording day to day. */
export function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
}
