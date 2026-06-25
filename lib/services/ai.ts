// Client-side AI service — calls Next.js API routes only.
// OPENAI_API_KEY is never exposed here.

import { redirectToPaywallOn403 } from '@/lib/paywall'

export interface WritingFeedback {
  submission_id: string
  band_score: number
  task_achievement: number
  coherence_cohesion: number
  lexical_resource: number
  grammatical_accuracy: number
  feedback: {
    overview: string
    strengths: string[]
    improvements: string[]
    rewritten_paragraph: string
  }
}

export interface StudyPlanData {
  plan: {
    overview: string
    weekly_hours: number
    weeks: Array<{
      week: number
      theme: string
      focus_skill: string
      daily_tasks: Array<{
        day: string
        activity: string
        duration: string
        skill: string
      }>
      weekly_goal: string
      tip: string
    }>
  }
}

export interface BandEstimate {
  overall_band: number
  reading_band: number | null
  listening_band: number | null
  notes: string
}

export interface TestExplanation {
  explanation: string
  tip: string
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (redirectToPaywallOn403(res)) {
    // Navigation is underway; never resolve so callers don't flash an error.
    return new Promise<T>(() => {})
  }

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed: ${res.status}`)
  }

  return data as T
}

export async function getWritingFeedback(params: {
  content: string
  task_type: '1' | '2'
  prompt: string
}): Promise<WritingFeedback> {
  return post('/api/ai/writing', params)
}

export async function generateStudyPlan(): Promise<StudyPlanData> {
  return post('/api/ai/study-plan', {})
}

export async function estimateBandScore(params: {
  correct: number
  total: number
  sections?: Record<string, { correct: number; total: number }>
  test_id?: string
}): Promise<BandEstimate> {
  return post('/api/ai/band-estimate', params)
}

export async function getTestExplanation(params: {
  question_text: string
  correct_answer: string
  user_answer: string
  passage_text?: string
}): Promise<TestExplanation> {
  return post('/api/ai/test-explanation', params)
}

export async function getUsageSummary(): Promise<{
  writing: { used: number; limit: number }
  speaking: { used: number; limit: number }
  test_explanation: { used: number; limit: number }
}> {
  const res = await fetch('/api/ai/usage')
  if (!res.ok) return { writing: { used: 0, limit: 3 }, speaking: { used: 0, limit: 3 }, test_explanation: { used: 0, limit: 5 } }
  return res.json()
}
