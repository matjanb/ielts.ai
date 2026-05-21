/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'

function db() {
  return createClient() as any
}

export interface DiagnosticBackground {
  takenBefore: boolean | null
  ieltsType: string | null
  targetBand: number
  estimatedBand: number | null
  examDate: string | null
  dailyStudyTime: string | null
  weakestSkills: string[]
  biggestStruggle: string | null
}

export interface DiagnosticTestResult {
  rawScore: number
  band: number
  sectionScores: {
    vocab_grammar: number
    reading: number
    listening: number
    speaking: number
  }
  speakingBand: number | null
  completedAt: string
}

export interface DiagnosticSpeakingResult {
  transcript: string
  band: number
  overview: string
  strengths: string[]
  improvements: string[]
}

/** Reads localStorage diagnostic data and saves it to the DB for a newly signed-up user. */
export async function saveDiagnosticData(userId: string): Promise<void> {
  let bg: DiagnosticBackground | null = null
  let test: DiagnosticTestResult | null = null
  let speaking: DiagnosticSpeakingResult | null = null

  try {
    const bgRaw = localStorage.getItem('ielts-diagnostic-background')
    const testRaw = localStorage.getItem('ielts-diagnostic-test')
    const speakRaw = localStorage.getItem('ielts-diagnostic-speaking')
    if (bgRaw) bg = JSON.parse(bgRaw)
    if (testRaw) test = JSON.parse(testRaw)
    if (speakRaw) speaking = JSON.parse(speakRaw)
  } catch {
    return
  }

  if (!bg && !test) return

  const supabase = db()

  // Upsert diagnostic_data row
  const diagnosticRow = {
    user_id: userId,
    taken_ielts_before: bg?.takenBefore ?? null,
    ielts_type: bg?.ieltsType ?? null,
    target_band: bg?.targetBand ?? null,
    estimated_band: bg?.estimatedBand ?? null,
    exam_date: bg?.examDate ?? null,
    daily_study_time: bg?.dailyStudyTime ?? null,
    weakest_skills: bg?.weakestSkills ?? [],
    biggest_struggle: bg?.biggestStruggle ?? null,
    diagnostic_score: test?.band ?? null,
    recommended_plan: JSON.stringify({
      band: test?.band,
      sectionScores: test?.sectionScores,
      targetBand: bg?.targetBand,
      weakestSkills: bg?.weakestSkills,
    }),
    diagnostic_completed: true,
    completed_at: test?.completedAt ?? new Date().toISOString(),
    speaking_transcript: speaking?.transcript ?? null,
    speaking_feedback: speaking ? JSON.stringify({
      overview: speaking.overview,
      strengths: speaking.strengths,
      improvements: speaking.improvements,
    }) : null,
    speaking_band_estimate: speaking?.band ?? test?.speakingBand ?? null,
  }

  await supabase
    .from('diagnostic_data')
    .upsert(diagnosticRow, { onConflict: 'user_id' })

  // Mark onboarding as completed on the profile so login redirect works
  await supabase
    .from('profiles')
    .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
    .eq('id', userId)

  // Update target band score on profile if available
  if (bg?.targetBand) {
    await supabase
      .from('profiles')
      .update({ target_band_score: bg.targetBand, updated_at: new Date().toISOString() })
      .eq('id', userId)
  }

  // Clear localStorage after saving
  localStorage.removeItem('ielts-diagnostic-background')
  localStorage.removeItem('ielts-diagnostic-test')
  localStorage.removeItem('ielts-diagnostic-speaking')
}

export async function getDiagnosticData(userId: string) {
  const { data, error } = await db()
    .from('diagnostic_data')
    .select('*')
    .eq('user_id', userId)
    .single()
  return { data, error }
}
