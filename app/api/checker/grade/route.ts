import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { err, getApiUser, recordUsage } from '@/lib/api/helpers'
import { gradeWriting } from '@/lib/ielts/writingGrader.server'

export const runtime = 'nodejs'

// Anonymous essay checks allowed per IP per day before we push them to sign up.
const DAILY_LIMIT = 2
// Signed-in users (onboarding aha flow) get a small lifetime pool of lean checks
// instead — cheap model, and it must never die on shared mobile-carrier IPs.
const USER_LIFETIME_LIMIT = 5
const MAX_WORDS = 500
const MAX_CHARS = 6000
const MIN_WORDS_ESSAY = 50
// Mini diagnostic (a few sentences typed on a phone) — the whole point is a low bar.
const MIN_WORDS_MINI = 30

function hashIp(ip: string): string {
  const salt = process.env.ANON_HASH_SALT ?? 'ielts-checker'
  return createHash('sha256').update(ip + salt).digest('hex')
}

// Turnstile check: skipped entirely when no secret is configured (dev), and
// REQUIRED once it is — a missing token used to be allowed "in case the widget
// didn't load", which meant any script could skip the captcha by simply not
// sending a token. The CSP explicitly allows challenges.cloudflare.com, so a
// real browser always gets a token.
async function verifyCaptcha(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // not configured → skip (dev)
  if (!token) return false
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  let body: { content?: string; taskType?: string; turnstileToken?: string; mode?: string; prompt?: string }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const taskType = body.taskType === '1' ? '1' : body.taskType === '2' ? '2' : null
  const mode = body.mode === 'mini' ? 'mini' : 'essay'
  let content = (body.content ?? '').trim()
  if (!content || !taskType) return err('content and taskType are required', 400)

  const minWords = mode === 'mini' ? MIN_WORDS_MINI : MIN_WORDS_ESSAY
  const wordCount = content.split(/\s+/).filter(Boolean).length
  if (wordCount < minWords) return err(`Please write at least ${minWords} words.`, 400)

  // Hard truncate server-side (defense in depth) before the model sees it.
  if (wordCount > MAX_WORDS) content = content.split(/\s+/).slice(0, MAX_WORDS).join(' ')
  if (content.length > MAX_CHARS) content = content.slice(0, MAX_CHARS)

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const admin = createAdminClient()
  const user = await getApiUser()

  if (user) {
    // Signed-in (onboarding aha / repeat checks): no captcha, no IP limit —
    // mobile carrier NAT shares IPs across whole cohorts. Small lifetime pool.
    const { count, error: countError } = await admin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('feature', 'checker')
    // Fail-closed like the other AI limits: a count error must not mean free unlimited.
    const used = countError ? Number.MAX_SAFE_INTEGER : (count ?? 0)
    if (used >= USER_LIFETIME_LIMIT) {
      return NextResponse.json(
        { error: 'limit', message: 'Quick checks are used up — submit a full essay in Writing for complete feedback.' },
        { status: 429 },
      )
    }
  } else {
    if (!(await verifyCaptcha(body.turnstileToken, ip))) {
      return err('Captcha verification failed. Please try again.', 403)
    }

    // Per-IP daily rate limit (select-then-upsert; tiny race is acceptable here).
    const ipHash = hashIp(ip)
    const day = new Date().toISOString().slice(0, 10)
    const { data: usage } = await admin
      .from('anon_checker_usage')
      .select('count')
      .eq('ip_hash', ipHash)
      .eq('day', day)
      .maybeSingle()
    const used = usage?.count ?? 0
    if (used >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: 'limit', message: "You've used your free checks for today. Sign up free to keep checking." },
        { status: 429 },
      )
    }
    await admin.from('anon_checker_usage').upsert(
      { ip_hash: ipHash, day, count: used + 1, updated_at: new Date().toISOString() },
      { onConflict: 'ip_hash,day' },
    )
  }

  const taskPrompt = (body.prompt ?? '').trim().slice(0, 500) ||
    `(Task ${taskType} question not provided — assess the response on its own merits.)`

  try {
    // The grader treats the text strictly as data (injection-safe).
    const { scored, feedback } = await gradeWriting({
      content,
      taskType,
      prompt: taskPrompt,
      // Teaser tier: cheap model + trimmed output (~15–20× cheaper than gpt-4o).
      model: 'gpt-4o-mini',
      lean: true,
      diagnostic: mode === 'mini',
    })

    if (user) {
      // Seed the user's history so the aha check shows up in Writing later.
      await admin.from('writing_submissions').insert({
        user_id:              user.id,
        task_type:            taskType,
        prompt:               taskPrompt,
        content,
        word_count:           wordCount,
        band_score:           scored.band_score,
        task_achievement:     scored.task_achievement,
        coherence_cohesion:   scored.coherence_cohesion,
        lexical_resource:     scored.lexical_resource,
        grammatical_accuracy: scored.grammatical_accuracy,
        ai_feedback:          JSON.stringify(feedback),
      })
      await recordUsage(user.id, 'checker')
    }

    // Anonymous teaser: overall + criteria bands + a couple of issues WITHOUT the
    // fixes (full feedback is gated behind signup). Signed-in users already
    // converted — they get the fixes and the next-band tip.
    return NextResponse.json({
      band: scored.band_score,
      criteria: {
        task: scored.task_achievement,
        coherence: scored.coherence_cohesion,
        lexical: scored.lexical_resource,
        grammar: scored.grammatical_accuracy,
      },
      teaserIssues: feedback.corrections.slice(0, 3).map(c =>
        user ? { quote: c.quote, issue: c.issue, fix: c.fix } : { quote: c.quote, issue: c.issue }),
      totalIssues: feedback.corrections.length,
      ...(user ? { nextBandTip: feedback.next_band_tip } : {}),
      wordCount,
    })
  } catch (e) {
    console.error('[checker/grade]', e)
    return err('Could not analyse the essay. Please try again.', 500)
  }
}
