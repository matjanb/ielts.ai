export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SkillType = 'writing' | 'speaking' | 'reading' | 'listening'
export type SubscriptionStatus = 'free' | 'pro' | 'expert' | 'cancelled'
export type TestStatus = 'in_progress' | 'completed' | 'abandoned'
export type QuestionType = 'multiple_choice' | 'matching' | 'fill_blank' | 'true_false_ng' | 'essay'
export type StudyGoal = 'university' | 'immigration' | 'work' | 'personal'
export type ExperienceLevel = 'first_time' | 'studied_not_taken' | 'taken_before'
export type CurrentLevel = 'beginner' | 'intermediate' | 'upper_intermediate' | 'advanced'
export type Timeline = 'within_1_month' | '1_3_months' | '3_6_months' | 'not_sure'
export type StudyHours = '30_min' | '1_hour' | '2_hours' | '3_plus_hours'

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

      mock_tests: {
        Row: {
          id: string
          title: string
          description: string | null
          test_type: 'academic' | 'general'
          sections: SkillType[]
          time_limit_minutes: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          test_type?: 'academic' | 'general'
          sections?: SkillType[]
          time_limit_minutes?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          test_type?: 'academic' | 'general'
          sections?: SkillType[]
          time_limit_minutes?: number
          is_active?: boolean
        }
      }

      test_questions: {
        Row: {
          id: string
          test_id: string
          section: SkillType
          question_type: QuestionType
          order_index: number
          passage_text: string | null
          question_text: string
          options: Json | null
          correct_answer: Json | null
          explanation: string | null
          marks: number
          created_at: string
        }
        Insert: {
          id?: string
          test_id: string
          section: SkillType
          question_type: QuestionType
          order_index: number
          passage_text?: string | null
          question_text: string
          options?: Json | null
          correct_answer?: Json | null
          explanation?: string | null
          marks?: number
          created_at?: string
        }
        Update: {
          section?: SkillType
          question_type?: QuestionType
          order_index?: number
          passage_text?: string | null
          question_text?: string
          options?: Json | null
          correct_answer?: Json | null
          explanation?: string | null
          marks?: number
        }
      }

      test_sessions: {
        Row: {
          id: string
          user_id: string
          test_id: string
          status: TestStatus
          current_section: SkillType | null
          current_question: number
          time_spent_seconds: number
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          test_id: string
          status?: TestStatus
          current_section?: SkillType | null
          current_question?: number
          time_spent_seconds?: number
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          status?: TestStatus
          current_section?: SkillType | null
          current_question?: number
          time_spent_seconds?: number
          completed_at?: string | null
        }
      }

      test_answers: {
        Row: {
          id: string
          session_id: string
          question_id: string
          user_answer: Json
          is_correct: boolean | null
          marks_awarded: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_id: string
          user_answer: Json
          is_correct?: boolean | null
          marks_awarded?: number
          created_at?: string
        }
        Update: {
          user_answer?: Json
          is_correct?: boolean | null
          marks_awarded?: number
        }
      }

      test_results: {
        Row: {
          id: string
          session_id: string
          user_id: string
          test_id: string
          overall_band: number
          writing_band: number | null
          speaking_band: number | null
          reading_band: number | null
          listening_band: number | null
          total_marks: number
          max_marks: number
          ai_feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          test_id: string
          overall_band: number
          writing_band?: number | null
          speaking_band?: number | null
          reading_band?: number | null
          listening_band?: number | null
          total_marks: number
          max_marks: number
          ai_feedback?: string | null
          created_at?: string
        }
        Update: {
          overall_band?: number
          writing_band?: number | null
          speaking_band?: number | null
          reading_band?: number | null
          listening_band?: number | null
          ai_feedback?: string | null
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type OnboardingData = Database['public']['Tables']['onboarding_data']['Row']
export type StudyPlan = Database['public']['Tables']['study_plans']['Row']
export type MockTest = Database['public']['Tables']['mock_tests']['Row']
export type TestQuestion = Database['public']['Tables']['test_questions']['Row']
export type TestSession = Database['public']['Tables']['test_sessions']['Row']
export type TestAnswer = Database['public']['Tables']['test_answers']['Row']
export type TestResult = Database['public']['Tables']['test_results']['Row']
export type WritingSubmission = Database['public']['Tables']['writing_submissions']['Row']
export type SpeakingSubmission = Database['public']['Tables']['speaking_submissions']['Row']
export type BandScoreHistory = Database['public']['Tables']['band_score_history']['Row']
export type StudySession = Database['public']['Tables']['study_sessions']['Row']
export type AiUsage = Database['public']['Tables']['ai_usage']['Row']
