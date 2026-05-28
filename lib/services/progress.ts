/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'

function db() {
  return createClient() as any
}

export async function getDashboardData(userId: string) {
  const supabase = db()
  const [profile, bandHistory, studySessions, attempts, writingSubmissions, speakingSubmissions] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('band_score_history').select('skill,score,recorded_at,source').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(200),
      supabase.from('study_sessions').select('skill,duration_minutes,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
      supabase.from('user_attempts').select('band_score,completed_at').eq('user_id', userId).not('completed_at', 'is', null).not('band_score', 'is', null).order('completed_at', { ascending: false }).limit(10),
      supabase.from('writing_submissions').select('band_score,task_type,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('speaking_submissions').select('band_score,part,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    ])

  return {
    profile: profile.data,
    bandHistory: (bandHistory.data ?? []) as any[],
    studySessions: (studySessions.data ?? []) as any[],
    attempts: (attempts.data ?? []) as any[],
    writingSubmissions: (writingSubmissions.data ?? []) as any[],
    speakingSubmissions: (speakingSubmissions.data ?? []) as any[],
  }
}

export async function getProgressData(userId: string) {
  const supabase = db()
  const [bandHistory, writingSubmissions, attempts, studySessions, profile] =
    await Promise.all([
      supabase.from('band_score_history').select('skill,score,source,recorded_at').eq('user_id', userId).order('recorded_at', { ascending: true }).limit(400),
      supabase.from('writing_submissions').select('id,task_type,band_score,task_achievement,coherence_cohesion,lexical_resource,grammatical_accuracy,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('user_attempts').select('id,completed_at,band_score,total_score').eq('user_id', userId).not('completed_at', 'is', null).order('completed_at', { ascending: true }),
      supabase.from('study_sessions').select('skill,duration_minutes,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
      supabase.from('profiles').select('target_band_score').eq('id', userId).single(),
    ])

  return {
    bandHistory: (bandHistory.data ?? []) as any[],
    writingSubmissions: (writingSubmissions.data ?? []) as any[],
    attempts: (attempts.data ?? []) as any[],
    studySessions: (studySessions.data ?? []) as any[],
    profile: profile.data as any,
  }
}
