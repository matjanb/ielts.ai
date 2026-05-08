/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'
import type { OnboardingData, Profile, SkillType } from '@/lib/types/database'

function db() {
  return createClient() as any
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await db()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data as Profile | null
}

export async function updateProfile(userId: string, updates: Partial<Omit<Profile, 'id' | 'created_at'>>) {
  const { data, error } = await db()
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  return { data: data as Profile | null, error }
}

export async function saveOnboardingData(userId: string, answers: Omit<OnboardingData, 'id' | 'user_id' | 'created_at'>) {
  const { data, error } = await db()
    .from('onboarding_data')
    .upsert({ user_id: userId, ...answers }, { onConflict: 'user_id' })
    .select()
    .single()
  return { data: data as OnboardingData | null, error }
}

export async function generateAndSaveStudyPlan(
  userId: string,
  targetBand: number,
  focusSkills: SkillType[],
  dailyHours: string,
  timeline: string
) {
  const weeksDuration = timeline === 'within_1_month' ? 4
    : timeline === '1_3_months' ? 8
    : timeline === '3_6_months' ? 16
    : 12

  const dailyMinutes = dailyHours === '30_min' ? 30
    : dailyHours === '1_hour' ? 60
    : dailyHours === '2_hours' ? 120
    : 180

  const planData = {
    weeks: Array.from({ length: weeksDuration }, (_, week) => ({
      week: week + 1,
      focus: focusSkills[week % focusSkills.length],
      tasks: [
        { type: 'mock_test', frequency: 'bi-weekly' },
        { type: 'writing_practice', frequency: 'daily' },
        { type: 'speaking_practice', frequency: 'daily' },
        { type: 'reading_practice', frequency: 'daily' },
        { type: 'listening_practice', frequency: 'daily' },
      ],
    })),
    generated_at: new Date().toISOString(),
  }

  const { data, error } = await db()
    .from('study_plans')
    .upsert({
      user_id: userId,
      weeks_duration: weeksDuration,
      target_band: targetBand,
      focus_skills: focusSkills,
      daily_minutes: dailyMinutes,
      plan_data: planData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  return { data, error }
}

export async function completeOnboarding(userId: string) {
  const { error } = await db()
    .from('profiles')
    .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
    .eq('id', userId)
  return { error }
}

export async function getBandScoreHistory(userId: string) {
  const { data, error } = await db()
    .from('band_score_history')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(50)
  return { data, error }
}

export async function getRecentActivity(userId: string, limit = 5) {
  const supabase = db()
  const [writing, speaking] = await Promise.all([
    supabase
      .from('writing_submissions')
      .select('id, task_type, band_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('speaking_submissions')
      .select('id, part, band_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  return {
    writing: (writing.data ?? []) as any[],
    speaking: (speaking.data ?? []) as any[],
  }
}

export async function getStudyStreak(userId: string): Promise<number> {
  const { data } = await db()
    .from('study_sessions')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60)

  if (!data || data.length === 0) return 0

  let streak = 0
  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  const sessionDates = new Set(
    (data as any[]).map((s: any) => new Date(s.created_at).toDateString())
  )

  const checkDate = new Date(currentDate)
  while (sessionDates.has(checkDate.toDateString())) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}
