# Funnel diagnosis — 2026-07-25

Data: `funnel_events` (tracking live since 2026-06-27), `profiles`, `auth.users`, `ai_usage`.
Window: 2026-06-27 → 2026-07-25 (≈4 weeks).

## The funnel (last 4 weeks)

| Step | Users | Conversion |
|---|---|---|
| Opened /signup (`signup_started`) | 243 | — |
| Created account (`auth.users`) | 187 | 77% |
| **Confirmed email / ever signed in** | **37** | **20% ← THE LEAK** |
| Completed onboarding | 13 | 35% of confirmed |
| Any product activity (`user_events`) | 22 | — |
| Started a mock test | 8 | — |
| Submitted an essay for AI check | 1 | 3% of confirmed |

## Finding 1 — email confirmation kills 80% of signups (CRITICAL)

187 accounts created, only 37 ever confirmed email and signed in. 150 users hit the
"check your email" screen and never came back. Mobile users switching to a mail app
rarely return; emails also land in spam/promotions.

**Fix:** disable "Confirm email" in Supabase Auth settings (Dashboard → Authentication →
Sign In / Up → Email → uncheck "Confirm email"). The signup code already handles the
no-confirmation path (`app/(auth)/signup/page.tsx` routes straight to /onboarding when a
session is returned). Optionally verify email lazily later (before paid features).

## Finding 2 — public essay-checker: 200 views, 2 submissions

`checker_viewed` = 200 uniques, `checker_submitted` = 2 (both on Jun 27–28, zero since).
`ai_usage` has no `checker` feature rows — nobody reaches grading. The form demands a
pasted 50+ word essay; mobile visitors don't have an essay at hand → dead end.

**Fix (aha-flow):** offer paths that work on a phone with no essay ready:
mini-task (write 3–4 sentences), sample essay one-tap demo, and keep paste for those
who have one. Same applies to the post-signup first session.

## Finding 3 — onboarding is a survey, aha comes never

Of 37 confirmed users, 13 completed the 3-question survey and landed on a dashboard
where the AI check must be found manually. Exactly 1 recent user ever submitted an essay.
The survey gives users nothing in return before asking questions.

**Fix:** first session = see YOUR band score first, answer questions after
(when "you're at 5.5 — what's your target?" is emotionally loaded).

## Finding 4 — tracking gaps (minor)

- `signup_completed` fired 13× while 187 accounts were created — the event only fires
  on a path most users skip. Fix or drop it.
- `funnel_events.metadata` has no device info; can't segment mobile vs desktop.
  Worth adding `is_mobile` from the UA on the `/api/track` server side.

## Priority order

1. Disable email confirmation (Supabase setting, zero code) — recovers ~5× signups.
2. Rebuild first session: aha (own text → band score) before survey.
3. Mobile polish of that single flow.
4. Bottom nav + wider mobile pass.
