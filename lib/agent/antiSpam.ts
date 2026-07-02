// Anti-spam verdict for the evening digest — pure so it can be unit-tested.
// Silence is a designed outcome: at most one coach message per UTC day, no
// repeating yesterday's topic, and inactivity nudges get an extra-long
// cooldown (a daily "come back" is how you teach someone to mute you).

export const SAME_SIGNAL_COOLDOWN_H = 48
export const INACTIVITY_COOLDOWN_H = 72

export type SentMessage = { sent_at: string; signal_type: string }
export type AntiSpamVerdict = 'already_sent_today' | 'same_signal_cooldown' | 'inactivity_cooldown' | null

export function antiSpamVerdict(
  recent: SentMessage[],
  primaryType: string,
  now: Date,
): AntiSpamVerdict {
  const hoursSince = (iso: string) => (now.getTime() - new Date(iso).getTime()) / 3_600_000
  const todayUtc = now.toISOString().slice(0, 10)
  for (const m of recent) {
    if (m.sent_at.slice(0, 10) === todayUtc) return 'already_sent_today'
    if (m.signal_type === primaryType && hoursSince(m.sent_at) < SAME_SIGNAL_COOLDOWN_H) {
      return 'same_signal_cooldown'
    }
    if (primaryType === 'inactivity' && m.signal_type === 'inactivity' && hoursSince(m.sent_at) < INACTIVITY_COOLDOWN_H) {
      return 'inactivity_cooldown'
    }
  }
  return null
}
