import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { err } from '@/lib/api/helpers'
import { gradeWriting } from '@/lib/ielts/writingGrader.server'

export const runtime = 'nodejs'

// Anonymous essay checks allowed per IP per day before we push them to sign up.
const DAILY_LIMIT = 2
const MAX_WORDS = 500
const MAX_CHARS = 6000

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
  let body: { content?: string; taskType?: string; turnstileToken?: string }
  try {
    body = await request.json()
  } catch {
    return err('Invalid request body', 400)
  }

  const taskType = body.taskType === '1' ? '1' : body.taskType === '2' ? '2' : null
  let content = (body.content ?? '').trim()
  if (!content || !taskType) return err('content and taskType are required', 400)

  const wordCount = content.split(/\s+/).filter(Boolean).length
  if (wordCount < 50) return err('Please paste at least 50 words.', 400)

  // Hard truncate server-side (defense in depth) before the model sees it.
  if (wordCount > MAX_WORDS) content = content.split(/\s+/).slice(0, MAX_WORDS).join(' ')
  if (content.length > MAX_CHARS) content = content.slice(0, MAX_CHARS)

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'

  if (!(await verifyCaptcha(body.turnstileToken, ip))) {
    return err('Captcha verification failed. Please try again.', 403)
  }

  // Per-IP daily rate limit (select-then-upsert; tiny race is acceptable here).
  const admin = createAdminClient()
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

  try {
    // No task prompt is collected on the public checker, so we grade the essay on
    // its own merits. The grader treats the text strictly as data (injection-safe).
    const { scored, feedback } = await gradeWriting({
      content,
      taskType,
      prompt: `(Task ${taskType} question not provided — assess the response on its own merits.)`,
      // Public teaser: cheap model + trimmed output (~15–20× cheaper than gpt-4o).
      model: 'gpt-4o-mini',
      lean: true,
    })

    // Teaser only: overall + criteria bands + a couple of issues WITHOUT the fixes.
    // The full per-criterion feedback and corrections are gated behind signup.
    return NextResponse.json({
      band: scored.band_score,
      criteria: {
        task: scored.task_achievement,
        coherence: scored.coherence_cohesion,
        lexical: scored.lexical_resource,
        grammar: scored.grammatical_accuracy,
      },
      teaserIssues: feedback.corrections.slice(0, 3).map(c => ({ quote: c.quote, issue: c.issue })),
      totalIssues: feedback.corrections.length,
      wordCount,
    })
  } catch (e) {
    console.error('[checker/grade]', e)
    return err('Could not analyse the essay. Please try again.', 500)
  }
}
