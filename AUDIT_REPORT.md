# Backend / UI Separation Audit Report

**Date:** 2026-05-24  
**Branch:** dashboard  
**Scope:** Full codebase audit for UI/backend separation readiness

---

## Executive Summary

The codebase has a reasonable structural foundation — a typed schema (`lib/types/database.ts`), a partial service layer (`lib/services/`), and clean API route boundaries. However, **direct Supabase queries inside page components are widespread**, TypeScript types are routinely bypassed with `as any`, i18n coverage is incomplete, and the largest page files are God components that mix data access with rendering logic. A UI redesign today would require touching data-fetching code in at least 9 page files.

**Overall Score: 4 / 10**

---

## Section 1 — Supabase Queries Inside UI Components

The following files contain direct `supabase.from(...)` or `supabase.auth.*` calls that belong in `lib/services/`, not in component/page files.

### `app/(dashboard)/listening/page.tsx`
| Line | Call |
|------|------|
| 24 | `supabase.from('tests').select(...).eq('type','listening')` |

Loads the full test list for the listening index page directly in a `useEffect`. No service abstraction.

---

### `app/(dashboard)/listening/[testId]/page.tsx` (1,109 lines — worst offender)
| Lines | Call |
|-------|------|
| 742–769 | `supabase.from('tests')`, `supabase.from('test_sections')`, `supabase.from('questions')` — full test load |
| 808–809 | `supabase.auth.getUser()` to resolve user before creating attempt |
| 829 | `supabase.from('user_answers').upsert(...)` — auto-save answers |
| 861–862 | `supabase.from('user_answers').upsert(...)` — answer submission |
| 876–886 | `supabase.from('user_attempts').update(...)` + `supabase.from('band_score_history').insert(...)` — completion |

8 separate database interactions embedded in the component. Every query would have to be touched in a redesign.

---

### `app/(dashboard)/listening/[testId]/results/page.tsx`
| Lines | Call |
|-------|------|
| 61–80 | `supabase.from('test_sections')`, `supabase.from('questions')`, `supabase.from('user_answers')` — loads review data |

---

### `app/(dashboard)/reading/[testId]/page.tsx` (473 lines)
| Lines | Call |
|-------|------|
| 207–208 | `supabase.from('tests').select('*')` — loads test |
| 242–245 | `supabase.auth.getUser()` + `supabase.from('user_attempts').insert(...)` — creates attempt |
| 255–256 | `supabase.from('user_answers').upsert(...)` — saves single answer |
| 283–284 | `supabase.from('user_answers').upsert(...)` — saves all answers on submit |
| 301–304 | `supabase.from('user_attempts').update(...)` + `supabase.auth.getUser()` + `supabase.from('band_score_history').insert(...)` |

Pattern is identical to the listening page — no shared abstraction between the two.

---

### `app/(dashboard)/reading/[testId]/results/page.tsx`
| Lines | Call |
|-------|------|
| 39–65 | `supabase.from('tests')`, `supabase.from('test_sections')`, `supabase.from('questions')`, `supabase.from('user_answers')` |

---

### `app/(dashboard)/dashboard/page.tsx` (819 lines)
| Lines | Call |
|-------|------|
| 195–196 | `supabase.auth.getUser()` |
| 208 | `supabase.from('profiles').select('*')` |
| 209 | `supabase.from('band_score_history').select(...)` |
| 210 | `supabase.from('study_sessions').select(...)` |
| 211 | `supabase.from('user_attempts').select(...)` |
| 212 | `supabase.from('writing_submissions').select(...)` |
| 213 | `supabase.from('speaking_submissions').select(...)` |

6 parallel queries fired directly in a `useEffect`. The page also _does_ call `getRecentActivity` and `getStudyStreak` from `lib/services/user`, proving the service layer exists but is inconsistently used.

---

### `app/(dashboard)/dashboard/progress/page.tsx` (859 lines)
| Lines | Call |
|-------|------|
| 114–115 | `supabase.auth.getUser()` |
| 125–128 | `supabase.from('band_score_history').select(...)` |
| 130–133 | `supabase.from('writing_submissions').select(...)` |
| 135–138 | `supabase.from('user_attempts').select(...)` |
| 140–143 | `supabase.from('study_sessions').select(...)` |
| 145–148 | `supabase.from('profiles').select(...)` |

Identical pattern to dashboard/page.tsx. None of these queries route through `lib/services/`.

---

### `app/(dashboard)/dashboard/settings/page.tsx`
| Lines | Call |
|-------|------|
| 23–24 | `supabase.auth.getUser()` — load user |
| 47–48 | `supabase.auth.getUser()` — resolve user ID before saving settings |

Settings save path calls auth directly instead of using `lib/services/auth.getUser()`.

---

### `app/(dashboard)/dashboard/study-plan/page.tsx`
| Lines | Call |
|-------|------|
| 33–35 | Dynamic `import('@/lib/supabase/client')` + `supabase.auth.getUser()` |

Uses a dynamic import to avoid SSR issues, but the underlying problem is the same.

---

### `app/(dashboard)/mock-tests/[id]/page.tsx`
| Lines | Call |
|-------|------|
| 72–73 | `supabase.auth.getUser()` |
| 80 | `supabase.from('band_score_history').insert(rows)` |

Inserts into `band_score_history` directly in the component on test submission.

---

**Total: 10 page files with direct DB access. Zero components in `components/**/*.tsx` have Supabase calls (good).**

---

## Section 2 — lib/services/ Coverage and Gaps

### Existing services

| File | What it covers |
|------|----------------|
| `lib/services/ai.ts` | Client-side wrappers for all `/api/ai/*` routes. Clean — no direct Supabase. |
| `lib/services/auth.ts` | signUp, signIn, signInWithGoogle, signOut, getUser, resendConfirmation, resetPassword |
| `lib/services/user.ts` | getProfile, updateProfile, saveOnboardingData, generateAndSaveStudyPlan, completeOnboarding, getBandScoreHistory, getRecentActivity, getStudyStreak |
| `lib/services/diagnostic.ts` | saveDiagnosticData (reads localStorage → DB), getDiagnosticData |

### Gaps — missing service domains

| Missing service | Tables it would cover | Pages currently doing this directly |
|-----------------|----------------------|--------------------------------------|
| `lib/services/tests.ts` | `tests`, `test_sections`, `questions` | listening/[testId], reading/[testId], listening/page, both results pages |
| `lib/services/attempts.ts` | `user_attempts`, `user_answers` | listening/[testId], reading/[testId], mock-tests/[id] |
| `lib/services/progress.ts` | `band_score_history`, `study_sessions`, `writing_submissions`, `speaking_submissions` (read side) | dashboard/page, dashboard/progress/page |
| `lib/services/studyPlan.ts` (read) | `study_plans` (SELECT) | dashboard/study-plan/page |

The `lib/services/user.ts` file partially overlaps with what should be a `progress.ts` service (it has `getBandScoreHistory`, `getRecentActivity`, `getStudyStreak`) but the dashboard pages don't consistently use it.

---

## Section 3 — API Route Analysis

### `/api/ai/writing` — Mostly clean
Returns JSON, calls OpenAI, persists to `writing_submissions` and `band_score_history`. Business logic (word count check, score clamping) is inline. **One concern:** user-facing English error strings baked in (`"Monthly writing feedback limit reached. Upgrade to Pro for unlimited access."`) — not translatable.

### `/api/ai/speaking` — Mostly clean
Same pattern as writing. Same i18n concern with error strings.

### `/api/ai/study-plan` — Clean
Loads profile data, calls OpenAI, persists to `study_plans`. No UI concerns.

### `/api/ai/band-estimate` — Mostly clean
Calls OpenAI, writes to `band_score_history`. Business logic (percentage calc, clamping) is inline and acceptable given it's a stateless transformation.

### `/api/ai/test-explanation` — Clean
Pure AI call with no DB writes. Minimal and focused.

### `/api/ai/usage` — Clean
Returns usage counts and limits as JSON. No HTML or UI concerns.

### `/api/diagnostic/speaking` — Problematic
- **Duplicates** the `err()` helper from `lib/api/helpers.ts` (reimplements it locally at line 7)
- **Duplicates** `clampBand()` logic (same logic exists in `lib/utils/bandScore.ts`)
- Does not use `getApiUser()` from shared helpers (no auth check)
- No rate limiting or usage tracking despite being an AI endpoint

### Overall API verdict
No HTML strings, no color values, no translation logic in any API route. The separation at the API boundary is structurally sound. The issues are: un-translatable English error messages in the `err()` payloads, and `diagnostic/speaking` reimplementing shared helpers.

---

## Section 4 — TypeScript Types

### Type definitions
`lib/types/database.ts` is comprehensive and well-structured. It defines full `Row`, `Insert`, and `Update` shapes for all 11 tables, plus convenience row aliases (`Profile`, `Question`, `UserAttempt`, etc.) and domain enums.

### Type usage in practice — poor

Despite having proper types, every service file and most page files bypass them:

| File | Issue |
|------|-------|
| `lib/services/user.ts` | `eslint-disable @typescript-eslint/no-explicit-any` at top; `createClient() as any` throughout |
| `lib/services/diagnostic.ts` | Same `eslint-disable` + `as any` |
| `app/(dashboard)/dashboard/page.tsx` | `createClient() as any` — 12 `any` occurrences |
| `app/(dashboard)/dashboard/progress/page.tsx` | `createClient() as any` — 2 `any` occurrences |
| `app/(dashboard)/listening/[testId]/page.tsx` | `createClient() as any` — 12 `any` occurrences |
| `app/(dashboard)/reading/[testId]/page.tsx` | Multiple `as any` casts |

The root cause is that `createClient()` returns a weakly-typed Supabase client. The fix is to pass the `Database` generic: `createClient<Database>()`. Until that is done, the typed table definitions in `database.ts` provide zero runtime or compile-time safety.

---

## Section 5 — Hardcoded UI Assumptions in Data Layer

### `lib/services/diagnostic.ts`
- Lines 47–49: Reads from `localStorage` (`ielts-diagnostic-background`, `ielts-diagnostic-test`, `ielts-diagnostic-speaking`)
- Lines 108–111: Removes from `localStorage`

`localStorage` is a browser API. A service file that also writes to Supabase should not be managing browser storage — that is the UI layer's responsibility. This couples the service to the browser environment and makes it untestable in Node/SSR.

### `lib/services/auth.ts`
- Line 43: `window.location.origin` — browser-only
- Line 77: `window.location.origin` — browser-only

Acceptable for a client-only auth service, but undocumented. A comment marking this as client-only would prevent accidental server-side import.

### `app/api/ai/writing/route.ts` and other AI routes
User-facing English error messages returned as JSON (e.g., `"Monthly writing feedback limit reached. Upgrade to Pro for unlimited access."`). These are displayed to users in the UI via the service layer, but they cannot be translated because they originate in the API layer, which has no locale context. A redesign targeting a new locale would require changing backend files.

### `lib/api/helpers.ts`
The `FREE_LIMITS` object (lines 7–13) is business logic and belongs here. Clean.

---

## Section 6 — Route Structure

| Route | Semantic? | Notes |
|-------|-----------|-------|
| `/dashboard` | Yes | |
| `/dashboard/progress` | Yes | |
| `/dashboard/settings` | Yes | |
| `/dashboard/speaking` | Yes | |
| `/dashboard/writing` | Yes | |
| `/dashboard/study-plan` | Yes | Hyphenated URL, acceptable |
| `/listening` | Yes | |
| `/listening/[testId]` | Yes | |
| `/listening/[testId]/results` | Yes | |
| `/reading/[testId]` | Yes | |
| `/reading/[testId]/results` | Yes | |
| `/mock-tests` | Yes | |
| `/mock-tests/[id]` | Yes | |
| `/mock-tests/[id]/results` | Yes | |

**No UI-specific route names found.** All routes are semantic domain names.

**Minor structural observation:** `/listening` and `/reading` live outside `/dashboard/` while all other app pages live under `/dashboard/`. This is an inconsistency, not a redesign blocker, but it means the sidebar/layout group doesn't cover test pages uniformly.

---

## Section 7 — Component Organization

### Folder structure
- `components/charts/` — SVG chart components (progress-charts.tsx, overview-charts.tsx, plus a stale duplicate `progress-charts 2.tsx`)
- `components/layout/` — FloatingNav only
- `components/providers/` — ThemeProvider only
- `components/sections/` — 8 landing-page section components
- `components/test/` — QuestionNav, QuestionRenderer, TestTimer
- `components/ui/` — Button, LanguageSwitcher, ThemeToggle

The structure is reasonable. However, `components/**/*.tsx` contains zero God components — all the problems are in `app/(dashboard)/**/*.tsx` pages.

### Top 5 files by line count

| File | Lines | Problem |
|------|-------|---------|
| `app/(dashboard)/listening/[testId]/page.tsx` | **1,109** | God component: loads test from DB, manages audio playback, tracks answers, saves to DB, submits attempt, renders entire test UI |
| `app/(dashboard)/dashboard/progress/page.tsx` | **859** | Loads 5 DB queries + computes all chart data + renders full progress page |
| `app/(dashboard)/dashboard/page.tsx` | **819** | Loads 6 DB queries + computes overview stats + renders 8+ UI sections |
| `app/(dashboard)/reading/[testId]/page.tsx` | **473** | Same pattern as listening page |
| `components/charts/progress-charts.tsx` | **339** | Pure chart rendering — acceptable size, no DB access |

The three largest files are each doing three jobs: fetching data, transforming it into view-model state, and rendering JSX. Any redesign of the listening test UI requires navigating 1,109 lines that include raw Supabase calls.

**Stale file:** `components/charts/progress-charts 2.tsx` (337 lines, space in filename) appears to be a leftover copy of `progress-charts.tsx` and should be deleted.

---

## Section 8 — Localization

The project uses a custom i18n system via `lib/i18n/LanguageContext.tsx` with locale files in `locales/{en,ru,kz,uz}.json`.

### Pages with meaningful t() coverage

| File | `t()` call count |
|------|-----------------|
| `app/(dashboard)/dashboard/progress/page.tsx` | 108 |
| `app/(dashboard)/dashboard/page.tsx` | 79 |
| `app/(dashboard)/listening/[testId]/page.tsx` | 40 |
| `app/(dashboard)/reading/[testId]/page.tsx` | 29 |

### Pages with no i18n

| File | Status |
|------|--------|
| `app/(dashboard)/dashboard/settings/page.tsx` | No `t()` calls found — all strings hardcoded in English |
| `app/(dashboard)/dashboard/writing/page.tsx` | No `t()` or `useTranslations` import visible |
| `app/(dashboard)/dashboard/speaking/page.tsx` | No `t()` or `useTranslations` import visible |
| `app/(dashboard)/mock-tests/**` | No i18n calls found |

### Hardcoded English strings in partially-translated pages

`listening/[testId]/page.tsx` wraps many strings with `t()` but still has hardcoded English error messages:
- `"Test not found (...)"`
- `"Could not load sections: ..."`
- `"No sections found for this test. Please run the seed data."`
- `"No questions found for this test. Please run the seed data."`

These are user-visible error states with no translation support.

### API error strings
All API routes return English error strings that bubble up to the UI (e.g., `"Monthly writing feedback limit reached. Upgrade to Pro for unlimited access."`). These are not translateable without modifying server-side code.

### Translation key naming
Keys in `locales/en.json` are semantic (`nav.dashboard`, `hero.cta`, `features.writingTitle`) — not UI-tied names like `blue_button_text`. No issues with key naming conventions.

---

## Section 9 — Database Schema Review

Reviewed `supabase/schema.sql` and `supabase/migrations/`.

### Verdict: Schema is clean

All column names and enum values are semantic:
- `target_band_score`, `subscription_status`, `current_level` — domain terms
- `skill_type` enum: `writing`, `speaking`, `reading`, `listening` — IELTS domain vocabulary
- `band_score_source` enum: `mock_test`, `writing_submission`, `speaking_submission`, `manual` — event types
- `study_sessions.activity_type` is a free-text field — slightly loose, but not UI-coupled

**No column names or schema elements are tied to UI presentation.** The schema could survive any UI redesign without modification.

---

## Section 10 — Final Verdict

### Score: 4 / 10

| Dimension | Score | Notes |
|-----------|-------|-------|
| DB schema semantic cleanliness | 9/10 | Excellent — no UI-coupled columns |
| Type definitions | 7/10 | Types exist and are comprehensive, but bypassed with `as any` everywhere |
| API route cleanliness | 6/10 | Good structure; hurt by un-translatable error strings and `diagnostic/speaking` code duplication |
| Service layer completeness | 3/10 | Only 4 services; 4+ domains are missing; `lib/services/user.ts` inconsistently used |
| Component-level separation | 2/10 | 10 page files with direct DB calls; 3 God components over 450 lines |
| i18n completeness | 3/10 | 4 pages have zero `t()` calls; hardcoded error strings scattered throughout |

---

## Top 3 Refactors (Priority Order)

### 1. Create missing service files and remove all Supabase calls from page components

**Why it's #1:** This is the core violation. A UI redesign means rewriting page files. If those files contain DB queries, data access must be retouched every time the UI changes.

**What to do:**

Create `lib/services/tests.ts`:
```
- getListeningTests(): loads tests where type='listening'
- getTestWithSections(testId): loads test + sections + questions in one call
- getTestResults(testId, attemptId): loads test + user_answers for results view
```

Create `lib/services/attempts.ts`:
```
- createAttempt(userId, testId): inserts into user_attempts, returns id
- saveAnswer(attemptId, questionId, value): upserts into user_answers
- completeAttempt(attemptId, scores): updates user_attempts with final scores
- saveBandScoreEntry(userId, skill, score, source, sourceId): inserts into band_score_history
```

Then replace all direct `supabase.from(...)` calls in these files:
- `app/(dashboard)/listening/page.tsx` (line 24)
- `app/(dashboard)/listening/[testId]/page.tsx` (lines 742, 808, 829, 861, 876)
- `app/(dashboard)/listening/[testId]/results/page.tsx` (line 61)
- `app/(dashboard)/reading/[testId]/page.tsx` (lines 207, 242, 255, 283, 301)
- `app/(dashboard)/reading/[testId]/results/page.tsx` (line 39)
- `app/(dashboard)/dashboard/page.tsx` (lines 195–213)
- `app/(dashboard)/dashboard/progress/page.tsx` (lines 114–148)
- `app/(dashboard)/dashboard/settings/page.tsx` (lines 23, 47)
- `app/(dashboard)/dashboard/study-plan/page.tsx` (line 35)
- `app/(dashboard)/mock-tests/[id]/page.tsx` (lines 73, 80)

---

### 2. Split God components into data hooks + display components

**Why it's #2:** Even after extracting services, 1,109-line and 859-line page files remain redesign liabilities. The data transformation logic is entangled with JSX in a way that makes them impossible to redesign independently.

**What to do:**

Extract custom hooks in `lib/hooks/`:

`useListeningTest(testId)` — manages test loading, audio state, section navigation, answer tracking, and submission. Returns state + callbacks. The page component becomes a pure renderer.

`useDashboardData(userId)` — wraps the 6 parallel queries in `dashboard/page.tsx`, computes derived stats (streak, recent scores), and returns a clean view-model.

`useProgressData(userId)` — wraps the 5 queries in `dashboard/progress/page.tsx` and exposes pre-computed chart datasets.

After this refactor:
- `listening/[testId]/page.tsx` drops from 1,109 lines to ~200 (pure JSX)
- `dashboard/page.tsx` drops from 819 lines to ~150
- `dashboard/progress/page.tsx` drops from 859 lines to ~200

---

### 3. Complete i18n coverage and move error strings out of the API layer

**Why it's #3:** A UI redesign targeting a new locale today would fail silently — 4 pages have no translations, and API error messages are English-only.

**What to do:**

- Add `useTranslations` / `t()` to `dashboard/settings/page.tsx`, `dashboard/writing/page.tsx`, `dashboard/speaking/page.tsx`, and all mock-test pages.
- Replace hardcoded English error strings in `listening/[testId]/page.tsx` (lines 747, 755, 762, 776) and `reading/[testId]/page.tsx` with translation keys.
- For API error messages: API routes should return machine-readable error codes (e.g., `{ "code": "LIMIT_REACHED", "feature": "writing" }`) rather than English sentences. The UI layer translates the code using `t('errors.limit_reached')`. This means changing the `err()` helper signature and updating all 6 AI routes.
- Fix `diagnostic/speaking/route.ts` to use the shared `err()` from `lib/api/helpers.ts` and `clampBand()` from `lib/utils/bandScore.ts`.

---

*End of audit. No files were modified during this analysis.*
