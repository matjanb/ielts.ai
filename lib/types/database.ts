export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SkillType = 'writing' | 'speaking' | 'reading' | 'listening'
export type SubscriptionStatus = 'free' | 'pro' | 'expert' | 'cancelled'
export type StudyGoal = 'university' | 'immigration' | 'work' | 'personal'
export type ExperienceLevel = 'first_time' | 'studied_not_taken' | 'taken_before'
export type CurrentLevel = 'beginner' | 'intermediate' | 'upper_intermediate' | 'advanced'
export type Timeline = 'within_1_month' | '1_3_months' | '3_6_months' | 'not_sure'
export type StudyHours = '30_min' | '1_hour' | '2_hours' | '3_plus_hours'
export type IeltsType = 'academic' | 'general_training'
export type ExamDate = 'within_1_month' | '1_3_months' | '3_6_months' | 'not_sure'
// still used by lib/data/sampleTest.ts and mock-tests/[id]/page.tsx (local static data)
export type QuestionType = 'multiple_choice' | 'matching' | 'fill_blank' | 'true_false_ng' | 'essay'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          target_band_score: number | null
          current_level: CurrentLevel | null
          country: string | null
          subscription_status: SubscriptionStatus
          subscription_expires_at: string | null
          stripe_customer_id: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          target_band_score?: number | null
          current_level?: CurrentLevel | null
          country?: string | null
          subscription_status?: SubscriptionStatus
          subscription_expires_at?: string | null
          stripe_customer_id?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          target_band_score?: number | null
          current_level?: CurrentLevel | null
          country?: string | null
          subscription_status?: SubscriptionStatus
          subscription_expires_at?: string | null
          stripe_customer_id?: string | null
          onboarding_completed?: boolean
          updated_at?: string
        }
      }

      onboarding_data: {
        Row: {
          id: string
          user_id: string
          experience: ExperienceLevel | null
          target_band: number | null
          current_level: CurrentLevel | null
          timeline: Timeline | null
          focus_skills: SkillType[]
          study_goal: StudyGoal | null
          daily_hours: StudyHours | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          experience?: ExperienceLevel | null
          target_band?: number | null
          current_level?: CurrentLevel | null
          timeline?: Timeline | null
          focus_skills?: SkillType[]
          study_goal?: StudyGoal | null
          daily_hours?: StudyHours | null
          created_at?: string
        }
        Update: {
          experience?: ExperienceLevel | null
          target_band?: number | null
          current_level?: CurrentLevel | null
          timeline?: Timeline | null
          focus_skills?: SkillType[]
          study_goal?: StudyGoal | null
          daily_hours?: StudyHours | null
        }
      }

      study_plans: {
        Row: {
          id: string
          user_id: string
          weeks_duration: number
          target_band: number
          focus_skills: SkillType[]
          daily_minutes: number
          plan_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          weeks_duration: number
          target_band: number
          focus_skills: SkillType[]
          daily_minutes: number
          plan_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          weeks_duration?: number
          target_band?: number
          focus_skills?: SkillType[]
          daily_minutes?: number
          plan_data?: Json
          updated_at?: string
        }
      }


      writing_submissions: {
        Row: {
          id: string
          user_id: string
          task_type: '1' | '2'
          prompt: string
          content: string
          word_count: number
          band_score: number | null
          task_achievement: number | null
          coherence_cohesion: number | null
          lexical_resource: number | null
          grammatical_accuracy: number | null
          ai_feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_type: '1' | '2'
          prompt: string
          content: string
          word_count: number
          band_score?: number | null
          task_achievement?: number | null
          coherence_cohesion?: number | null
          lexical_resource?: number | null
          grammatical_accuracy?: number | null
          ai_feedback?: string | null
          created_at?: string
        }
        Update: {
          band_score?: number | null
          task_achievement?: number | null
          coherence_cohesion?: number | null
          lexical_resource?: number | null
          grammatical_accuracy?: number | null
          ai_feedback?: string | null
        }
      }

      speaking_submissions: {
        Row: {
          id: string
          user_id: string
          part: 1 | 2 | 3
          topic: string
          transcript: string | null
          audio_url: string | null
          band_score: number | null
          fluency_score: number | null
          pronunciation_score: number | null
          lexical_score: number | null
          grammar_score: number | null
          ai_feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          part: 1 | 2 | 3
          topic: string
          transcript?: string | null
          audio_url?: string | null
          band_score?: number | null
          fluency_score?: number | null
          pronunciation_score?: number | null
          lexical_score?: number | null
          grammar_score?: number | null
          ai_feedback?: string | null
          created_at?: string
        }
        Update: {
          transcript?: string | null
          audio_url?: string | null
          band_score?: number | null
          fluency_score?: number | null
          pronunciation_score?: number | null
          lexical_score?: number | null
          grammar_score?: number | null
          ai_feedback?: string | null
        }
      }

      band_score_history: {
        Row: {
          id: string
          user_id: string
          skill: SkillType | 'overall'
          score: number
          source: 'mock_test' | 'writing_submission' | 'speaking_submission' | 'manual'
          source_id: string | null
          recorded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          skill: SkillType | 'overall'
          score: number
          source: 'mock_test' | 'writing_submission' | 'speaking_submission' | 'manual'
          source_id?: string | null
          recorded_at?: string
        }
        Update: {
          score?: number
        }
      }

      study_sessions: {
        Row: {
          id: string
          user_id: string
          skill: SkillType
          activity_type: string
          duration_minutes: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          skill: SkillType
          activity_type: string
          duration_minutes: number
          created_at?: string
        }
        Update: {
          duration_minutes?: number
        }
      }

      diagnostic_data: {
        Row: {
          id: string
          user_id: string
          taken_ielts_before: boolean | null
          ielts_type: IeltsType | null
          target_band: number | null
          estimated_band: number | null
          exam_date: ExamDate | null
          daily_study_time: StudyHours | null
          weakest_skills: string[]
          biggest_struggle: string | null
          diagnostic_score: number | null
          recommended_plan: string | null
          diagnostic_completed: boolean
          completed_at: string | null
          speaking_transcript: string | null
          speaking_feedback: string | null
          speaking_band_estimate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          taken_ielts_before?: boolean | null
          ielts_type?: IeltsType | null
          target_band?: number | null
          estimated_band?: number | null
          exam_date?: ExamDate | null
          daily_study_time?: StudyHours | null
          weakest_skills?: string[]
          biggest_struggle?: string | null
          diagnostic_score?: number | null
          recommended_plan?: string | null
          diagnostic_completed?: boolean
          completed_at?: string | null
          speaking_transcript?: string | null
          speaking_feedback?: string | null
          speaking_band_estimate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          taken_ielts_before?: boolean | null
          ielts_type?: IeltsType | null
          target_band?: number | null
          estimated_band?: number | null
          exam_date?: ExamDate | null
          daily_study_time?: StudyHours | null
          weakest_skills?: string[]
          biggest_struggle?: string | null
          diagnostic_score?: number | null
          recommended_plan?: string | null
          diagnostic_completed?: boolean
          completed_at?: string | null
          speaking_transcript?: string | null
          speaking_feedback?: string | null
          speaking_band_estimate?: number | null
          updated_at?: string
        }
      }

      ai_usage: {
        Row: {
          id: string
          user_id: string
          feature: 'writing' | 'speaking' | 'study_plan' | 'band_estimate' | 'test_explanation'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature: 'writing' | 'speaking' | 'study_plan' | 'band_estimate' | 'test_explanation'
          created_at?: string
        }
        Update: never
      }

      tests: {
        Row: {
          id: string
          title: string
          type: 'listening' | 'reading' | 'writing' | 'speaking'
          book_number: number | null
          test_number: number | null
          difficulty: 'easy' | 'medium' | 'hard' | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          type: 'listening' | 'reading' | 'writing' | 'speaking'
          book_number?: number | null
          test_number?: number | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          created_at?: string
        }
        Update: {
          title?: string
          difficulty?: 'easy' | 'medium' | 'hard' | null
        }
      }

      test_sections: {
        Row: {
          id: string
          test_id: string
          section_number: number
          title: string
          instructions: string | null
          audio_url: string | null
          audio_duration: number | null
        }
        Insert: {
          id?: string
          test_id: string
          section_number: number
          title: string
          instructions?: string | null
          audio_url?: string | null
          audio_duration?: number | null
        }
        Update: {
          title?: string
          instructions?: string | null
          audio_url?: string | null
          audio_duration?: number | null
        }
      }

      questions: {
        Row: {
          id: string
          section_id: string
          question_number: number
          question_type: 'multiple_choice' | 'fill_blank' | 'matching' | 'true_false'
          question_text: string
          image_url: string | null
          options: Json | null
          correct_answer: string
          points: number
          passage_text: string | null
          passage_group: number | null
        }
        Insert: {
          id?: string
          section_id: string
          question_number: number
          question_type: 'multiple_choice' | 'fill_blank' | 'matching' | 'true_false'
          question_text: string
          image_url?: string | null
          options?: Json | null
          correct_answer: string
          points?: number
          passage_text?: string | null
          passage_group?: number | null
        }
        Update: {
          question_text?: string
          options?: Json | null
          correct_answer?: string
          points?: number
          passage_text?: string | null
          passage_group?: number | null
        }
      }

      user_attempts: {
        Row: {
          id: string
          user_id: string
          test_id: string
          started_at: string
          completed_at: string | null
          total_score: number | null
          band_score: number | null
          section_scores: Json
        }
        Insert: {
          id?: string
          user_id: string
          test_id: string
          started_at?: string
          completed_at?: string | null
          total_score?: number | null
          band_score?: number | null
          section_scores?: Json
        }
        Update: {
          completed_at?: string | null
          total_score?: number | null
          band_score?: number | null
          section_scores?: Json
        }
      }

      user_answers: {
        Row: {
          id: string
          attempt_id: string
          question_id: string
          user_answer: string | null
          is_correct: boolean | null
          time_spent_seconds: number | null
        }
        Insert: {
          id?: string
          attempt_id: string
          question_id: string
          user_answer?: string | null
          is_correct?: boolean | null
          time_spent_seconds?: number | null
        }
        Update: {
          user_answer?: string | null
          is_correct?: boolean | null
          time_spent_seconds?: number | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type DiagnosticData = Database['public']['Tables']['diagnostic_data']['Row']
export type OnboardingData = Database['public']['Tables']['onboarding_data']['Row']
export type StudyPlan = Database['public']['Tables']['study_plans']['Row']
export type WritingSubmission = Database['public']['Tables']['writing_submissions']['Row']
export type SpeakingSubmission = Database['public']['Tables']['speaking_submissions']['Row']
export type BandScoreHistory = Database['public']['Tables']['band_score_history']['Row']
export type StudySession = Database['public']['Tables']['study_sessions']['Row']
export type AiUsage = Database['public']['Tables']['ai_usage']['Row']
export type IeltsTest = Database['public']['Tables']['tests']['Row']
export type TestSection = Database['public']['Tables']['test_sections']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type UserAttempt = Database['public']['Tables']['user_attempts']['Row']
export type UserAnswer = Database['public']['Tables']['user_answers']['Row']
