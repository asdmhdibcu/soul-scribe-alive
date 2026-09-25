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
      briefs: {
        Row: {
          created_at: string
          for_date: string
          id: string
          items_enc: string
          opened_at: string | null
          useful: number[]
          user_id: string
        }
        Insert: {
          created_at?: string
          for_date: string
          id?: string
          items_enc: string
          opened_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          for_date?: string
          id?: string
          items_enc?: string
          opened_at?: string | null
          useful?: number[]
          user_id?: string
        }
        Relationships: []
      }
      child_entries: {
        Row: {
          cards_swiped: Json | null
          child_id: string
          coins_earned: number
          content: string | null
          created_at: string
          date: string
          id: string
          mission: string | null
          mood_emoji: string | null
          mood_stars: number | null
          photos: Json | null
          title: string | null
          voice_transcript: string | null
        }
        Insert: {
          cards_swiped?: Json | null
          child_id: string
          coins_earned?: number
          content?: string | null
          created_at?: string
          date?: string
          id?: string
          mission?: string | null
          mood_emoji?: string | null
          mood_stars?: number | null
          photos?: Json | null
          title?: string | null
          voice_transcript?: string | null
        }
        Update: {
          cards_swiped?: Json | null
          child_id?: string
          coins_earned?: number
          content?: string | null
          created_at?: string
          date?: string
          id?: string
          mission?: string | null
          mood_emoji?: string | null
          mood_stars?: number | null
          photos?: Json | null
          title?: string | null
          voice_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_entries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_profiles: {
        Row: {
          age: number | null
          age_group: string | null
          avatar: string | null
          created_at: string
          id: string
          mood_sharing_enabled: boolean
          name: string
          parent_id: string
          private_mode: boolean
        }
        Insert: {
          age?: number | null
          age_group?: string | null
          avatar?: string | null
          created_at?: string
          id?: string
          mood_sharing_enabled?: boolean
          name: string
          parent_id: string
          private_mode?: boolean
        }
        Update: {
          age?: number | null
          age_group?: string | null
          avatar?: string | null
          created_at?: string
          id?: string
          mood_sharing_enabled?: boolean
          name?: string
          parent_id?: string
          private_mode?: boolean
        }
        Relationships: []
      }
      days: {
        Row: {
          created_at: string
          date: string
          energy_enc: string | null
          id: string
          mood_enc: string | null
          rendered_enc: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          energy_enc?: string | null
          id?: string
          mood_enc?: string | null
          rendered_enc?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          energy_enc?: string | null
          id?: string
          mood_enc?: string | null
          rendered_enc?: string | null
          user_id?: string
        }
        Relationships: []
      }
      draft_sessions: {
        Row: {
          created_at: string
          current_step: string
          id: string
          mood_data: Json | null
          one_question_answer: Json | null
          one_sentence: string | null
          personal_notes: string | null
          photos: Json | null
          spark_cards: Json | null
          updated_at: string
          user_id: string
          user_voice_story: string | null
          voice_transcript: string | null
        }
        Insert: {
          created_at?: string
          current_step?: string
          id?: string
          mood_data?: Json | null
          one_question_answer?: Json | null
          one_sentence?: string | null
          personal_notes?: string | null
          photos?: Json | null
          spark_cards?: Json | null
          updated_at?: string
          user_id: string
          user_voice_story?: string | null
          voice_transcript?: string | null
        }
        Update: {
          created_at?: string
          current_step?: string
          id?: string
          mood_data?: Json | null
          one_question_answer?: Json | null
          one_sentence?: string | null
          personal_notes?: string | null
          photos?: Json | null
          spark_cards?: Json | null
          updated_at?: string
          user_id?: string
          user_voice_story?: string | null
          voice_transcript?: string | null
        }
        Relationships: []
      }
      family_capsules: {
        Row: {
          created_at: string
          entries: Json | null
          family_id: string
          id: string
          year: number
        }
        Insert: {
          created_at?: string
          entries?: Json | null
          family_id: string
          id?: string
          year: number
        }
        Update: {
          created_at?: string
          entries?: Json | null
          family_id?: string
          id?: string
          year?: number
        }
        Relationships: []
      }
      family_members: {
        Row: {
          availability: string | null
          child_id: string | null
          created_at: string
          id: string
          parent_id: string
          role: string | null
          topics: Json | null
          voice_style: string | null
          warmth_level: number | null
        }
        Insert: {
          availability?: string | null
          child_id?: string | null
          created_at?: string
          id?: string
          parent_id: string
          role?: string | null
          topics?: Json | null
          voice_style?: string | null
          warmth_level?: number | null
        }
        Update: {
          availability?: string | null
          child_id?: string | null
          created_at?: string
          id?: string
          parent_id?: string
          role?: string | null
          topics?: Json | null
          voice_style?: string | null
          warmth_level?: number | null
        }
        Relationships: []
      }
      legacy_letters: {
        Row: {
          author_id: string
          child_id: string | null
          content: string | null
          created_at: string
          id: string
          is_opened: boolean
          open_at_age: number | null
          open_at_date: string | null
          title: string | null
        }
        Insert: {
          author_id: string
          child_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_opened?: boolean
          open_at_age?: number | null
          open_at_date?: string | null
          title?: string | null
        }
        Update: {
          author_id?: string
          child_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_opened?: boolean
          open_at_age?: number | null
          open_at_date?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legacy_letters_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_files: {
        Row: {
          created_at: string
          id: string
          kind: string
          mime_enc: string | null
          moment_id: string
          name_enc: string | null
          path: string
          size_bytes: number
          text_enc: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          mime_enc?: string | null
          moment_id: string
          name_enc?: string | null
          path: string
          size_bytes?: number
          text_enc?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          mime_enc?: string | null
          moment_id?: string
          name_enc?: string | null
          path?: string
          size_bytes?: number
          text_enc?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moment_files_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
        ]
      }
      moments: {
        Row: {
          area_enc: string | null
          audio_path: string | null
          body_enc: string | null
          captured_at: string
          created_at: string
          id: string
          kind: string
          photo_path: string | null
          sorted_at: string | null
          user_id: string
        }
        Insert: {
          area_enc?: string | null
          audio_path?: string | null
          body_enc?: string | null
          captured_at: string
          created_at?: string
          id?: string
          kind: string
          photo_path?: string | null
          sorted_at?: string | null
          user_id: string
        }
        Update: {
          area_enc?: string | null
          audio_path?: string | null
          body_enc?: string | null
          captured_at?: string
          created_at?: string
          id?: string
          kind?: string
          photo_path?: string | null
          sorted_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      thread_mentions: {
        Row: {
          captured_at: string
          id: string
          moment_id: string
          quote_enc: string
          thread_id: string
          user_id: string
        }
        Insert: {
          captured_at: string
          id?: string
          moment_id: string
          quote_enc: string
          thread_id: string
          user_id: string
        }
        Update: {
          captured_at?: string
          id?: string
          moment_id?: string
          quote_enc?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_mentions_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_mentions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          first_seen: string
          hidden: boolean
          id: string
          kind_enc: string | null
          last_seen: string
          mention_count: number
          state: string
          title_enc: string
          user_id: string
        }
        Insert: {
          first_seen: string
          hidden?: boolean
          id?: string
          kind_enc?: string | null
          last_seen: string
          mention_count?: number
          state?: string
          title_enc: string
          user_id: string
        }
        Update: {
          first_seen?: string
          hidden?: boolean
          id?: string
          kind_enc?: string | null
          last_seen?: string
          mention_count?: number
          state?: string
          title_enc?: string
          user_id?: string
        }
        Relationships: []
      }
      user_keys: {
        Row: {
          created_at: string
          kdf_iterations: number
          kdf_salt: string
          recovery_verifier_hash: string | null
          user_id: string
          wrapped_by_password: string
          wrapped_by_recovery: string
        }
        Insert: {
          created_at?: string
          kdf_iterations: number
          kdf_salt: string
          recovery_verifier_hash?: string | null
          user_id: string
          wrapped_by_password: string
          wrapped_by_recovery: string
        }
        Update: {
          created_at?: string
          kdf_iterations?: number
          kdf_salt?: string
          recovery_verifier_hash?: string | null
          user_id?: string
          wrapped_by_password?: string
          wrapped_by_recovery?: string
        }
        Relationships: []
      }
      user_prefs: {
        Row: {
          ai_key_enc: string | null
          ai_model: string | null
          ai_provider: string | null
          brief_email: boolean
          brief_hour: number
          mood_enabled: boolean
          timezone: string
          user_id: string
        }
        Insert: {
          ai_key_enc?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          brief_email?: boolean
          brief_hour?: number
          mood_enabled?: boolean
          timezone?: string
          user_id: string
        }
        Update: {
          ai_key_enc?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          brief_email?: boolean
          brief_hour?: number
          mood_enabled?: boolean
          timezone?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          ai_tone: string | null
          avatar_url: string | null
          coins: number
          created_at: string
          email: string | null
          id: string
          intents: Json
          level: number
          longest_streak: number
          name: string | null
          onboarding_complete: boolean
          plan: string
          reminder_time: string | null
          streak: number
          time_credits: number
          timezone: string | null
          total_sessions: number
        }
        Insert: {
          ai_tone?: string | null
          avatar_url?: string | null
          coins?: number
          created_at?: string
          email?: string | null
          id: string
          intents?: Json
          level?: number
          longest_streak?: number
          name?: string | null
          onboarding_complete?: boolean
          plan?: string
          reminder_time?: string | null
          streak?: number
          time_credits?: number
          timezone?: string | null
          total_sessions?: number
        }
        Update: {
          ai_tone?: string | null
          avatar_url?: string | null
          coins?: number
          created_at?: string
          email?: string | null
          id?: string
          intents?: Json
          level?: number
          longest_streak?: number
          name?: string | null
          onboarding_complete?: boolean
          plan?: string
          reminder_time?: string | null
          streak?: number
          time_credits?: number
          timezone?: string | null
          total_sessions?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
