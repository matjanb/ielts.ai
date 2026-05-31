// IELTS band-score arithmetic, shared by the writing & speaking graders.

/** Clamp a single criterion band to the realistic AI-gradeable range and 0.5 steps. */
export function clampBand(n: number): number {
  if (!Number.isFinite(n)) return 5
  return Math.round(Math.min(9, Math.max(3, n)) * 2) / 2
}

/**
 * Overall band from the four criteria. IELTS averages the criteria and rounds
 * to the nearest half band (a .25 average rounds up to the next half, a .75
 * average rounds up to the next whole) — i.e. round-to-nearest-0.5, halves up,
 * which `Math.round(avg * 2) / 2` implements.
 */
export function overallBand(criteria: number[]): number {
  if (criteria.length === 0) return 0
  const avg = criteria.reduce((a, b) => a + b, 0) / criteria.length
  return Math.round(avg * 2) / 2
}
