// Derives objective Fluency & Coherence signals from Whisper word timestamps.
// These are the real acoustic cues a transcript alone throws away — pauses,
// speech rate, hesitation — and they ground the examiner's F&C band instead of
// it being guessed from cleaned-up text.

export interface WhisperWord {
  word: string
  start: number // seconds
  end: number   // seconds
}

export interface FluencyMetrics {
  duration_ms: number
  words: number
  /** Silent gaps between words longer than {@link PAUSE_THRESHOLD_S}. */
  pause_count: number
  pause_total_ms: number
  /** Words per minute over actual speaking time (excludes long pauses). */
  speech_rate_wpm: number | null
}

// A gap longer than this between two words counts as a hesitation pause. ~0.6s
// is long enough to ignore natural inter-word micro-gaps but catch real stalls.
const PAUSE_THRESHOLD_S = 0.6

/**
 * Compute fluency metrics from Whisper word timestamps. Falls back gracefully
 * when timestamps are missing (e.g. an old response_format): returns a word
 * count from `fallbackText` and leaves timing fields at 0/null.
 */
export function computeFluencyMetrics(
  wordsArr: WhisperWord[] | undefined,
  totalDurationS: number | undefined,
  fallbackText = '',
): FluencyMetrics {
  const valid = (wordsArr ?? []).filter(w => Number.isFinite(w.start) && Number.isFinite(w.end))

  if (valid.length === 0) {
    const count = fallbackText.trim() ? fallbackText.trim().split(/\s+/).length : 0
    return {
      duration_ms: Math.round((totalDurationS ?? 0) * 1000),
      words: count,
      pause_count: 0,
      pause_total_ms: 0,
      speech_rate_wpm: null,
    }
  }

  let pauseCount = 0
  let pauseTotalS = 0
  for (let i = 1; i < valid.length; i++) {
    const gap = valid[i].start - valid[i - 1].end
    if (gap > PAUSE_THRESHOLD_S) {
      pauseCount++
      pauseTotalS += gap
    }
  }

  const firstStart = valid[0].start
  const lastEnd = valid[valid.length - 1].end
  const spanS = Math.max(0, lastEnd - firstStart)
  const speakingS = Math.max(0, spanS - pauseTotalS)
  const wpm = speakingS > 0 ? (valid.length / speakingS) * 60 : null

  return {
    duration_ms: Math.round((totalDurationS ?? spanS) * 1000),
    words: valid.length,
    pause_count: pauseCount,
    pause_total_ms: Math.round(pauseTotalS * 1000),
    speech_rate_wpm: wpm === null ? null : Math.round(wpm * 10) / 10,
  }
}

/** A short, human-readable summary of the metrics for the grader prompt. */
export function describeFluency(m: FluencyMetrics): string {
  const secs = (m.duration_ms / 1000).toFixed(0)
  const rate = m.speech_rate_wpm === null ? 'n/a' : `${m.speech_rate_wpm} wpm`
  const pauseSecs = (m.pause_total_ms / 1000).toFixed(1)
  return `spoke ~${secs}s, ${m.words} words, speech rate ${rate}, ${m.pause_count} long pauses totalling ${pauseSecs}s`
}

interface MsSegment { start: number; end: number } // milliseconds

/**
 * Per-turn fluency from the live VAD speech segments captured during a realtime
 * exam. The realtime API gives us when the candidate started/stopped speaking
 * but no word timestamps, so this is the client-side half of the hybrid: it
 * yields speaking time (the gaps where the examiner talked are excluded by
 * construction) and the word count, which together ground per-turn speech rate.
 * `words` comes from the turn's transcript. Whisper supplies the finer
 * word-level pause detection for the session aggregate (see the transcribe API).
 */
export function metricsFromSegments(segments: MsSegment[], words: number): FluencyMetrics {
  const segs = segments.filter(s => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
  if (segs.length === 0) {
    return { duration_ms: 0, words, pause_count: 0, pause_total_ms: 0, speech_rate_wpm: null }
  }
  const span = segs[segs.length - 1].end - segs[0].start
  let pauseCount = 0
  let pauseMs = 0
  for (let i = 1; i < segs.length; i++) {
    const gap = segs[i].start - segs[i - 1].end
    if (gap > PAUSE_THRESHOLD_S * 1000) { pauseCount++; pauseMs += gap }
  }
  const speakingMs = Math.max(0, span - pauseMs)
  const wpm = speakingMs > 0 ? Math.round((words / speakingMs) * 60_000 * 10) / 10 : null
  return {
    duration_ms: Math.round(span),
    words,
    pause_count: pauseCount,
    pause_total_ms: Math.round(pauseMs),
    speech_rate_wpm: wpm,
  }
}

/** Coerce an untrusted metrics object (e.g. from a request body) into clean numbers, or null. */
export function sanitizeFluencyMetrics(m: unknown): FluencyMetrics | null {
  if (!m || typeof m !== 'object') return null
  const o = m as Record<string, unknown>
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)
  const duration = num(o.duration_ms)
  const words = Math.round(num(o.words))
  if (duration === 0 && words === 0) return null
  const rate = o.speech_rate_wpm
  return {
    duration_ms: Math.round(duration),
    words,
    pause_count: Math.round(num(o.pause_count)),
    pause_total_ms: Math.round(num(o.pause_total_ms)),
    speech_rate_wpm: typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 ? Math.round(rate * 10) / 10 : null,
  }
}
