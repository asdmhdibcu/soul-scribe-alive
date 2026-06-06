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
      achievements: {
        Row: {
          badge_icon: string | null
          badge_name: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_icon?: string | null
          badge_name: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_icon?: string | null
          badge_name?: string
          earned_at?: string
          id?: string
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
      coins_history: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
          ai_insight: string | null
          ai_pattern: string | null
          ai_tone: string | null
          cards_swiped: Json | null
          coins_earned: number
          content: string | null
          created_at: string
          date: string
          energy_level: number | null
          focus_word: string | null
          id: string
          is_private: boolean
          life_area: string | null
          mood_color: string | null
          mood_x: number | null
          mood_y: number | null
          one_answer: string | null
          one_thing: string | null
          photos: Json | null
          price: number | null
          session_intent: string | null
          title: string | null
          tomorrow_plan: Json | null
          user_id: string
          voice_transcript: string | null
        }
        Insert: {
          ai_insight?: string | null
          ai_pattern?: string | null
          ai_tone?: string | null
          cards_swiped?: Json | null
          coins_earned?: number
          content?: string | null
          created_at?: string
          date?: string
          energy_level?: number | null
          focus_word?: string | null
          id?: string
          is_private?: boolean
          life_area?: string | null
          mood_color?: string | null
          mood_x?: number | null
          mood_y?: number | null
          one_answer?: string | null
          one_thing?: string | null
          photos?: Json | null
          price?: number | null
          session_intent?: string | null
          title?: string | null
          tomorrow_plan?: Json | null
          user_id: string
          voice_transcript?: string | null
        }
        Update: {
          ai_insight?: string | null
          ai_pattern?: string | null
          ai_tone?: string | null
          cards_swiped?: Json | null
          coins_earned?: number
          content?: string | null
          created_at?: string
          date?: string
          energy_level?: number | null
          focus_word?: string | null
          id?: string
          is_private?: boolean
          life_area?: string | null
          mood_color?: string | null
          mood_x?: number | null
          mood_y?: number | null
          one_answer?: string | null
          one_thing?: string | null
          photos?: Json | null
          price?: number | null
          session_intent?: string | null
          title?: string | null
          tomorrow_plan?: Json | null
          user_id?: string
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
      marketplace: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          is_available: boolean
          price: number
          sales_count: number
          seller_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          is_available?: boolean
          price?: number
          sales_count?: number
          seller_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          is_available?: boolean
          price?: number
          sales_count?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          ai_description: string | null
          created_at: string
          emotion_context: string | null
          entry_id: string | null
          id: string
          location_context: string | null
          people_detected: Json | null
          url: string
          user_id: string
        }
        Insert: {
          ai_description?: string | null
          created_at?: string
          emotion_context?: string | null
          entry_id?: string | null
          id?: string
          location_context?: string | null
          people_detected?: Json | null
          url: string
          user_id: string
        }
        Update: {
          ai_description?: string | null
          created_at?: string
          emotion_context?: string | null
          entry_id?: string | null
          id?: string
          location_context?: string | null
          people_detected?: Json | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          entry_id: string | null
          id: string
          platform_fee: number
          seller_id: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          entry_id?: string | null
          id?: string
          platform_fee?: number
          seller_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          entry_id?: string | null
          id?: string
          platform_fee?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          coins: number
          created_at: string
          email: string | null
          id: string
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
          avatar_url?: string | null
          coins?: number
          created_at?: string
          email?: string | null
          id: string
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
          avatar_url?: string | null
          coins?: number
          created_at?: string
          email?: string | null
          id?: string
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
    Enums: {},
  },
} as const
