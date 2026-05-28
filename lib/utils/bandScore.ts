/** Round any score to the nearest valid IELTS half-band (4.0–9.0). */
export function snapToBand(score: number): number {
  const clamped = Math.max(4.0, Math.min(9.0, score))
  return Math.round(clamped * 2) / 2
}

export function listeningRawToBand(rawScore: number): number {
  if (rawScore >= 39) return 9.0
  if (rawScore >= 37) return 8.5
  if (rawScore >= 35) return 8.0
  if (rawScore >= 32) return 7.5
  if (rawScore >= 30) return 7.0
  if (rawScore >= 26) return 6.5
  if (rawScore >= 23) return 6.0
  if (rawScore >= 18) return 5.5
  if (rawScore >= 16) return 5.0
  if (rawScore >= 13) return 4.5
  if (rawScore >= 10) return 4.0
  if (rawScore >= 8)  return 3.5
  if (rawScore >= 6)  return 3.0
  return 2.5
}
