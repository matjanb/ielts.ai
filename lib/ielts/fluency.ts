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
