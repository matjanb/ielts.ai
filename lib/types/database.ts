export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          created_at: string
          feature: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      band_score_history: {
        Row: {
          id: string
          recorded_at: string
          score: number
          skill: string
          source: Database["public"]["Enums"]["band_score_source"]
          source_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          recorded_at?: string
          score: number
          skill: string
          source: Database["public"]["Enums"]["band_score_source"]
          source_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          recorded_at?: string
          score?: number
          skill?: string
          source?: Database["public"]["Enums"]["band_score_source"]
          source_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "band_score_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          sections: Database["public"]["Enums"]["skill_type"][]
          test_type: string
          time_limit_minutes: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sections?: Database["public"]["Enums"]["skill_type"][]
          test_type?: string
          time_limit_minutes?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sections?: Database["public"]["Enums"]["skill_type"][]
          test_type?: string
          time_limit_minutes?: number
          title?: string
        }
        Relationships: []
      }
      onboarding_data: {
        Row: {
          created_at: string
          current_level: Database["public"]["Enums"]["current_level"] | null
          daily_hours: Database["public"]["Enums"]["study_hours"] | null
          experience: Database["public"]["Enums"]["experience_level"] | null
          focus_skills: Database["public"]["Enums"]["skill_type"][]
          id: string
          study_goal: Database["public"]["Enums"]["study_goal"] | null
          target_band: number | null
          timeline: Database["public"]["Enums"]["timeline"] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: Database["public"]["Enums"]["current_level"] | null
          daily_hours?: Database["public"]["Enums"]["study_hours"] | null
          experience?: Database["public"]["Enums"]["experience_level"] | null
          focus_skills?: Database["public"]["Enums"]["skill_type"][]
          id?: string
          study_goal?: Database["public"]["Enums"]["study_goal"] | null
          target_band?: number | null
          timeline?: Database["public"]["Enums"]["timeline"] | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: Database["public"]["Enums"]["current_level"] | null
          daily_hours?: Database["public"]["Enums"]["study_hours"] | null
          experience?: Database["public"]["Enums"]["experience_level"] | null
          focus_skills?: Database["public"]["Enums"]["skill_type"][]
          id?: string
          study_goal?: Database["public"]["Enums"]["study_goal"] | null
          target_band?: number | null
          timeline?: Database["public"]["Enums"]["timeline"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_data: {
        Row: {
          id: string
          user_id: string
          taken_ielts_before: boolean | null
          ielts_type: string | null
          target_band: number | null
          estimated_band: number | null
          exam_date: string | null
          daily_study_time: string | null
          weakest_skills: string[] | null
          biggest_struggle: string | null
          diagnostic_score: number | null
          recommended_plan: string | null
          diagnostic_completed: boolean | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
          speaking_transcript: string | null
          speaking_feedback: Json | null
          speaking_band_estimate: number | null
        }
        Insert: {
          id?: string
          user_id: string
          taken_ielts_before?: boolean | null
          ielts_type?: string | null
          target_band?: number | null
          estimated_band?: number | null
          exam_date?: string | null
          daily_study_time?: string | null
          weakest_skills?: string[] | null
          biggest_struggle?: string | null
          diagnostic_score?: number | null
          recommended_plan?: string | null
          diagnostic_completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          speaking_transcript?: string | null
          speaking_feedback?: Json | null
          speaking_band_estimate?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          taken_ielts_before?: boolean | null
          ielts_type?: string | null
          target_band?: number | null
          estimated_band?: number | null
          exam_date?: string | null
          daily_study_time?: string | null
          weakest_skills?: string[] | null
          biggest_struggle?: string | null
          diagnostic_score?: number | null
          recommended_plan?: string | null
          diagnostic_completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          speaking_transcript?: string | null
          speaking_feedback?: Json | null
          speaking_band_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhooks: {
        Row: {
          event_id: string
          event_type: string | null
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type?: string | null
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string | null
          processed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          current_level: Database["public"]["Enums"]["current_level"] | null
          full_name: string | null
          has_paid: boolean
          id: string
          is_admin: boolean
          lifetime_access: boolean
          onboarding_completed: boolean
          referred_at: string | null
          referred_by: string | null
          stripe_customer_id: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_source: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          streak_freezes: number
          streak_frozen_days: Json
          streak_last_award: number
          target_band_score: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          current_level?: Database["public"]["Enums"]["current_level"] | null
          full_name?: string | null
          has_paid?: boolean
          id: string
          is_admin?: boolean
          lifetime_access?: boolean
          onboarding_completed?: boolean
          referred_at?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_source?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          streak_freezes?: number
          streak_frozen_days?: Json
          streak_last_award?: number
          target_band_score?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          current_level?: Database["public"]["Enums"]["current_level"] | null
          full_name?: string | null
          has_paid?: boolean
          id?: string
          is_admin?: boolean
          lifetime_access?: boolean
          onboarding_completed?: boolean
          referred_at?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_source?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          streak_freezes?: number
          streak_frozen_days?: Json
          streak_last_award?: number
          target_band_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      referrers: {
        Row: {
          id: string
          code: string
          name: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer: string | null
          id: string
          image_url: string | null
          options: Json | null
          passage_group: number | null
          passage_text: string | null
          points: number
          question_number: number
          question_text: string
          question_type: string
          question_subtype: string | null
          section_id: string
        }
        Insert: {
          correct_answer?: string | null
          id?: string
          image_url?: string | null
          options?: Json | null
          passage_group?: number | null
          passage_text?: string | null
          points?: number
          question_number: number
          question_text: string
          question_type: string
          question_subtype?: string | null
          section_id: string
        }
        Update: {
          correct_answer?: string | null
          id?: string
          image_url?: string | null
          options?: Json | null
          passage_group?: number | null
          passage_text?: string | null
          points?: number
          question_number?: number
          question_text?: string
          question_type?: string
          question_subtype?: string | null
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "test_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_submissions: {
        Row: {
          ai_feedback: string | null
          audio_url: string | null
          band_score: number | null
          created_at: string
          fluency_score: number | null
          grammar_score: number | null
          id: string
          lexical_score: number | null
          mode: string
          part: number | null
          pronunciation_score: number | null
          topic: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          audio_url?: string | null
          band_score?: number | null
          created_at?: string
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          lexical_score?: number | null
          mode?: string
          part?: number | null
          pronunciation_score?: number | null
          topic: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          audio_url?: string | null
          band_score?: number | null
          created_at?: string
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          lexical_score?: number | null
          mode?: string
          part?: number | null
          pronunciation_score?: number | null
          topic?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaking_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_turns: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_ms: number | null
          id: string
          part: number
          pause_count: number | null
          pause_total_ms: number | null
          question_text: string | null
          role: string
          speech_rate_wpm: number | null
          submission_id: string
          transcript: string | null
          turn_index: number
          user_id: string
          words: number | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          part: number
          pause_count?: number | null
          pause_total_ms?: number | null
          question_text?: string | null
          role: string
          speech_rate_wpm?: number | null
          submission_id: string
          transcript?: string | null
          turn_index: number
          user_id: string
          words?: number | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          part?: number
          pause_count?: number | null
          pause_total_ms?: number | null
          question_text?: string | null
          role?: string
          speech_rate_wpm?: number | null
          submission_id?: string
          transcript?: string | null
          turn_index?: number
          user_id?: string
          words?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "speaking_turns_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "speaking_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaking_turns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          daily_minutes: number
          focus_skills: Database["public"]["Enums"]["skill_type"][]
          id: string
          plan_data: Json
          progress: Json
          started_at: string
          target_band: number
          updated_at: string
          user_id: string
          weeks_duration: number
        }
        Insert: {
          created_at?: string
          daily_minutes: number
          focus_skills?: Database["public"]["Enums"]["skill_type"][]
          id?: string
          plan_data?: Json
          progress?: Json
          started_at?: string
          target_band: number
          updated_at?: string
          user_id: string
          weeks_duration: number
        }
        Update: {
          created_at?: string
          daily_minutes?: number
          focus_skills?: Database["public"]["Enums"]["skill_type"][]
          id?: string
          plan_data?: Json
          progress?: Json
          started_at?: string
          target_band?: number
          updated_at?: string
          user_id?: string
          weeks_duration?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          activity_type: string
          created_at: string
          duration_minutes: number
          id: string
          skill: Database["public"]["Enums"]["skill_type"]
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          duration_minutes: number
          id?: string
          skill: Database["public"]["Enums"]["skill_type"]
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          skill?: Database["public"]["Enums"]["skill_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          marks_awarded: number
          question_id: string
          session_id: string
          user_answer: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number
          question_id: string
          session_id: string
          user_answer: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marks_awarded?: number
          question_id?: string
          session_id?: string
          user_answer?: Json
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          correct_answer: Json | null
          created_at: string
          explanation: string | null
          id: string
          marks: number
          options: Json | null
          order_index: number
          passage_text: string | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          section: Database["public"]["Enums"]["skill_type"]
          test_id: string
        }
        Insert: {
          correct_answer?: Json | null
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          options?: Json | null
          order_index: number
          passage_text?: string | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          section: Database["public"]["Enums"]["skill_type"]
          test_id: string
        }
        Update: {
          correct_answer?: Json | null
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          options?: Json | null
          order_index?: number
          passage_text?: string | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          section?: Database["public"]["Enums"]["skill_type"]
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          ai_feedback: string | null
          created_at: string
          id: string
          listening_band: number | null
          max_marks: number
          overall_band: number
          reading_band: number | null
          session_id: string
          speaking_band: number | null
          test_id: string
          total_marks: number
          user_id: string
          writing_band: number | null
        }
        Insert: {
          ai_feedback?: string | null
          created_at?: string
          id?: string
          listening_band?: number | null
          max_marks: number
          overall_band: number
          reading_band?: number | null
          session_id: string
          speaking_band?: number | null
          test_id: string
          total_marks: number
          user_id: string
          writing_band?: number | null
        }
        Update: {
          ai_feedback?: string | null
          created_at?: string
          id?: string
          listening_band?: number | null
          max_marks?: number
          overall_band?: number
          reading_band?: number | null
          session_id?: string
          speaking_band?: number | null
          test_id?: string
          total_marks?: number
          user_id?: string
          writing_band?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sections: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          difficulty: string | null
          id: string
          instructions: string | null
          section_number: number
          test_id: string
          title: string
          topic: string | null
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          difficulty?: string | null
          id?: string
          instructions?: string | null
          section_number: number
          test_id: string
          title: string
          topic?: string | null
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          difficulty?: string | null
          id?: string
          instructions?: string | null
          section_number?: number
          test_id?: string
          title?: string
          topic?: string | null
        }
        Relationships: []
      }
      test_sessions: {
        Row: {
          completed_at: string | null
          current_question: number
          current_section: Database["public"]["Enums"]["skill_type"] | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["test_status"]
          test_id: string
          time_spent_seconds: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_question?: number
          current_section?: Database["public"]["Enums"]["skill_type"] | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["test_status"]
          test_id: string
          time_spent_seconds?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_question?: number
          current_section?: Database["public"]["Enums"]["skill_type"] | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["test_status"]
          test_id?: string
          time_spent_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          book_number: number
          created_at: string | null
          difficulty: string | null
          id: string
          test_number: number
          title: string
          type: string
        }
        Insert: {
          book_number?: number
          created_at?: string | null
          difficulty?: string | null
          id?: string
          test_number?: number
          title: string
          type: string
        }
        Update: {
          book_number?: number
          created_at?: string | null
          difficulty?: string | null
          id?: string
          test_number?: number
          title?: string
          type?: string
        }
        Relationships: []
      }
      user_answers: {
        Row: {
          attempt_id: string
          id: string
          is_correct: boolean | null
          question_id: string
          time_spent_seconds: number | null
          user_answer: string | null
        }
        Insert: {
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          time_spent_seconds?: number | null
          user_answer?: string | null
        }
        Update: {
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          time_spent_seconds?: number | null
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "user_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attempts: {
        Row: {
          band_score: number | null
          completed_at: string | null
          id: string
          section_scores: Json
          started_at: string
          test_id: string
          total_score: number | null
          user_id: string
        }
        Insert: {
          band_score?: number | null
          completed_at?: string | null
          id?: string
          section_scores?: Json
          started_at?: string
          test_id: string
          total_score?: number | null
          user_id: string
        }
        Update: {
          band_score?: number | null
          completed_at?: string | null
          id?: string
          section_scores?: Json
          started_at?: string
          test_id?: string
          total_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vocabulary: {
        Row: {
          created_at: string
          due_at: string
          ease: number
          id: string
          interval_days: number
          last_result: string | null
          repetitions: number
          reviewed_at: string | null
          status: string
          user_id: string
          word_id: string
        }
        Insert: {
          created_at?: string
          due_at?: string
          ease?: number
          id?: string
          interval_days?: number
          last_result?: string | null
          repetitions?: number
          reviewed_at?: string | null
          status?: string
          user_id: string
          word_id: string
        }
        Update: {
          created_at?: string
          due_at?: string
          ease?: number
          id?: string
          interval_days?: number
          last_result?: string | null
          repetitions?: number
          reviewed_at?: string | null
          status?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vocabulary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vocabulary_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_words"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_decks: {
        Row: {
          category: string
          color: string
          created_at: string
          description: string
          id: string
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          category: string
          color?: string
          created_at?: string
          description: string
          id?: string
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          description?: string
          id?: string
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      vocabulary_words: {
        Row: {
          antonyms: string[]
          band_level: string
          created_at: string
          deck_id: string
          definition: string
          example: string
          id: string
          ipa: string | null
          part_of_speech: string
          synonyms: string[]
          word: string
        }
        Insert: {
          antonyms?: string[]
          band_level: string
          created_at?: string
          deck_id: string
          definition: string
          example: string
          id?: string
          ipa?: string | null
          part_of_speech: string
          synonyms?: string[]
          word: string
        }
        Update: {
          antonyms?: string[]
          band_level?: string
          created_at?: string
          deck_id?: string
          definition?: string
          example?: string
          id?: string
          ipa?: string | null
          part_of_speech?: string
          synonyms?: string[]
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_words_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_submissions: {
        Row: {
          ai_feedback: string | null
          band_score: number | null
          coherence_cohesion: number | null
          content: string
          created_at: string
          grammatical_accuracy: number | null
          id: string
          lexical_resource: number | null
          prompt: string
          task_achievement: number | null
          task_type: string
          user_id: string
          word_count: number
        }
        Insert: {
          ai_feedback?: string | null
          band_score?: number | null
          coherence_cohesion?: number | null
          content: string
          created_at?: string
          grammatical_accuracy?: number | null
          id?: string
          lexical_resource?: number | null
          prompt: string
          task_achievement?: number | null
          task_type: string
          user_id: string
          word_count: number
        }
        Update: {
          ai_feedback?: string | null
          band_score?: number | null
          coherence_cohesion?: number | null
          content?: string
          created_at?: string
          grammatical_accuracy?: number | null
          id?: string
          lexical_resource?: number | null
          prompt?: string
          task_achievement?: number | null
          task_type?: string
          user_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "writing_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_referral_stats: {
        Args: Record<string, never>
        Returns: {
          code: string
          name: string | null
          is_active: boolean
          created_at: string
          signups: number
          paid: number
        }[]
      }
      admin_referral_users: {
        Args: { ref_code: string }
        Returns: {
          email: string
          referred_at: string | null
          created_at: string
          has_paid: boolean
          subscription_status: string
        }[]
      }
      admin_list_users: {
        Args: { search?: string | null; lim?: number }
        Returns: {
          id: string
          email: string
          subscription_status: string
          subscription_expires_at: string | null
          lifetime_access: boolean
          subscription_plan: string | null
          subscription_source: string | null
          created_at: string
          is_admin: boolean
        }[]
      }
      admin_stats: {
        Args: Record<string, never>
        Returns: {
          total_users: number
          active_subscribers: number
          new_today: number
          new_7d: number
          ai_today: number
          writing_total: number
          speaking_total: number
          attempts_total: number
        }[]
      }
    }
    Enums: {
      band_score_source:
        | "mock_test"
        | "writing_submission"
        | "speaking_submission"
        | "manual"
      current_level:
        | "beginner"
        | "intermediate"
        | "upper_intermediate"
        | "advanced"
      experience_level: "first_time" | "studied_not_taken" | "taken_before"
      question_type:
        | "multiple_choice"
        | "matching"
        | "fill_blank"
        | "true_false_ng"
        | "essay"
      skill_type: "writing" | "speaking" | "reading" | "listening"
      study_goal: "university" | "immigration" | "work" | "personal"
      study_hours: "30_min" | "1_hour" | "2_hours" | "3_plus_hours"
      subscription_status: "free" | "pro" | "expert" | "cancelled"
      test_status: "in_progress" | "completed" | "abandoned"
      timeline: "within_1_month" | "1_3_months" | "3_6_months" | "not_sure"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      band_score_source: [
        "mock_test",
        "writing_submission",
        "speaking_submission",
        "manual",
      ],
      current_level: [
        "beginner",
        "intermediate",
        "upper_intermediate",
        "advanced",
      ],
      experience_level: ["first_time", "studied_not_taken", "taken_before"],
      question_type: [
        "multiple_choice",
        "matching",
        "fill_blank",
        "true_false_ng",
        "essay",
      ],
      skill_type: ["writing", "speaking", "reading", "listening"],
      study_goal: ["university", "immigration", "work", "personal"],
      study_hours: ["30_min", "1_hour", "2_hours", "3_plus_hours"],
      subscription_status: ["free", "pro", "expert", "cancelled"],
      test_status: ["in_progress", "completed", "abandoned"],
      timeline: ["within_1_month", "1_3_months", "3_6_months", "not_sure"],
    },
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// App-level aliases. The codebase imports these names; they derive from the
// generated Database above so they stay in sync with the real schema.
// ─────────────────────────────────────────────────────────────────────────────

export type SkillType          = Database['public']['Enums']['skill_type']
export type SubscriptionStatus = Database['public']['Enums']['subscription_status']
export type StudyGoal          = Database['public']['Enums']['study_goal']
export type ExperienceLevel    = Database['public']['Enums']['experience_level']
export type CurrentLevel       = Database['public']['Enums']['current_level']
export type Timeline           = Database['public']['Enums']['timeline']
export type StudyHours         = Database['public']['Enums']['study_hours']
export type QuestionType       = Database['public']['Enums']['question_type']
export type IeltsType = 'academic' | 'general_training'
export type ExamDate = 'within_1_month' | '1_3_months' | '3_6_months' | 'not_sure'

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type DiagnosticData = Database['public']['Tables']['diagnostic_data']['Row']
export type OnboardingData = Database['public']['Tables']['onboarding_data']['Row']
export type StudyPlan = Database['public']['Tables']['study_plans']['Row']
export type WritingSubmission = Database['public']['Tables']['writing_submissions']['Row']
export type SpeakingSubmission = Database['public']['Tables']['speaking_submissions']['Row']
export type SpeakingTurn = Database['public']['Tables']['speaking_turns']['Row']
export type BandScoreHistory = Database['public']['Tables']['band_score_history']['Row']
export type StudySession = Database['public']['Tables']['study_sessions']['Row']
export type AiUsage = Database['public']['Tables']['ai_usage']['Row']
export type IeltsTest = Database['public']['Tables']['tests']['Row']
export type TestSection = Database['public']['Tables']['test_sections']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type UserAttempt = Database['public']['Tables']['user_attempts']['Row']
export type UserAnswer = Database['public']['Tables']['user_answers']['Row']
