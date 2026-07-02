// Calibration harness for the agent's pattern-analysis layer (lib/agent/signals.ts).
// Runs analyzeUser against real production data so thresholds can be tuned
// before the agent sends a single message. Read-only: no writes anywhere.
//
//   node scripts/analyze-user.mts <email or user uuid>   # full signal dump
//   node scripts/analyze-user.mts --all                  # primary signal per active user
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
// (run from the project root, same as the other scripts here).

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { analyzeUser, pickPrimarySignal, AGENT_THRESHOLDS, type AgentSignals } from '../lib/agent/signals.ts'
import type { Database } from '../lib/types/database.ts'

function env(key: string): string {
  if (process.env[key]) return process.env[key]!
  const line = readFileSync('.env.local', 'utf8').split('\n').find(l => l.startsWith(key + '='))
  if (!line) throw new Error(`${key} missing from .env.local`)
  return line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '')
}

const db = createClient<Database>(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveUserId(arg: string): Promise<string> {
  if (UUID_RE.test(arg)) return arg
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    const match = data.users.find(u => u.email?.toLowerCase() === arg.toLowerCase())
    if (match) return match.id
    if (data.users.length < 200) break
  }
  throw new Error(`No user found with email ${arg}`)
}

function describePrimary(primary: ReturnType<typeof pickPrimarySignal>): string {
  if (!primary) return '(silence)'
  switch (primary.type) {
    case 'inactivity':
      return `inactivity: ${primary.signal.daysSinceLastActivity}d quiet, week ${primary.signal.activeDaysLastWeek}→${primary.signal.activeDaysThisWeek} active days (-${primary.signal.frequencyDropPct}%)`
    case 'plateau':
      return `plateau: ${primary.signal.module} stuck at ${primary.signal.currentBand} for ${primary.signal.testsWithoutImprovement} tests` +
        (primary.signal.weakArea ? `, weak: ${primary.signal.weakArea.questionType} in part ${primary.signal.weakArea.part} (${primary.signal.weakArea.errorRate}% wrong)` : '')
    case 'repeated_error':
      return `repeated_error: ${primary.signal.module}/${primary.signal.questionType} ${primary.signal.errorRate}% wrong over last ${primary.signal.attempts}`
    case 'positive': {
      const p = primary.signal
      if (p.kind === 'broke_plateau') return `positive: broke plateau in ${p.module} ${p.previousBand}→${p.currentBand}`
      if (p.kind === 'aha_moment') return `positive: aha on ${p.module}/${p.questionType} (was ${p.previousErrorRate}% wrong)`
      return `positive: closed ${p.module}/${p.questionType} ${p.beforeErrorRate}%→${p.afterErrorRate}% wrong`
    }
  }
}

/** Every detected signal in one compact line — calibration needs to see what
 *  the priority order hides, not just the winner. */
function describeAll(signals: AgentSignals): string {
  const parts: string[] = []
  if (signals.inactivity) {
    parts.push(`inactivity ${signals.inactivity.daysSinceLastActivity}d${signals.inactivity.churned ? ' (churned)' : ''}`)
  }
  if (signals.plateau) {
    const w = signals.plateau.weakArea
    parts.push(`plateau ${signals.plateau.module}@${signals.plateau.currentBand}×${signals.plateau.testsWithoutImprovement}` +
      (w ? ` weak=${w.questionType}/p${w.part}(${w.errorRate}%)` : ''))
  }
  if (signals.repeatedError) {
    parts.push(`rep_err ${signals.repeatedError.module}/${signals.repeatedError.questionType}(${signals.repeatedError.errorRate}%)`)
  }
  for (const p of signals.positive) parts.push(`positive:${p.kind}`)
  return parts.length ? parts.join(' | ') : '(no signals)'
}

async function activeUserIds(limit: number): Promise<string[]> {
  const [attempts, writing] = await Promise.all([
    db.from('user_attempts').select('user_id, completed_at').not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }).limit(500),
    db.from('writing_submissions').select('user_id, created_at')
      .order('created_at', { ascending: false }).limit(200),
  ])
  const ids = new Set<string>()
  for (const row of [...(attempts.data ?? []), ...(writing.data ?? [])]) {
    ids.add(row.user_id)
    if (ids.size >= limit) break
  }
  return [...ids]
}

const arg = process.argv[2]
if (!arg) {
  console.error('Usage: node scripts/analyze-user.mts <email|uuid> | --all')
  process.exit(1)
}

console.log(`Thresholds: ${JSON.stringify(AGENT_THRESHOLDS)}\n`)

if (arg === '--all') {
  const ids = await activeUserIds(40)
  console.log(`Analyzing ${ids.length} recently active users…\n`)
  const tally = new Map<string, number>()
  for (const id of ids) {
    try {
      const signals = await analyzeUser(db, id)
      const primary = pickPrimarySignal(signals)
      const label = primary?.type ?? 'silence'
      tally.set(label, (tally.get(label) ?? 0) + 1)
      console.log(`${id.slice(0, 8)}  primary=${label.padEnd(14)} ${describeAll(signals)}`)
    } catch (e) {
      console.log(`${id.slice(0, 8)}  ERROR: ${e instanceof Error ? e.message : e}`)
    }
  }
  console.log('\nDistribution:')
  for (const [label, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  ${label}`)
  }
} else {
  const userId = await resolveUserId(arg)
  const signals = await analyzeUser(db, userId)
  const primary = pickPrimarySignal(signals)
  console.log(JSON.stringify(signals, null, 2))
  console.log(`\nPrimary signal → ${describePrimary(primary)}`)
}
