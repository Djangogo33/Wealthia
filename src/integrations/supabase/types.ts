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
      accounts: {
        Row: {
          balance: number
          created_at: string
          currency: string
          deleted_at: string | null
          icon: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          currency: string
          current_price: number | null
          deleted_at: string | null
          id: string
          name: string
          price_updated_at: string | null
          purchase_price: number
          quantity: number
          symbol: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_price?: number | null
          deleted_at?: string | null
          id?: string
          name: string
          price_updated_at?: string | null
          purchase_price?: number
          quantity?: number
          symbol: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_price?: number | null
          deleted_at?: string | null
          id?: string
          name?: string
          price_updated_at?: string | null
          purchase_price?: number
          quantity?: number
          symbol?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount_limit: number
          category_id: string | null
          created_at: string
          id: string
          period: Database["public"]["Enums"]["budget_period"]
          user_id: string
        }
        Insert: {
          amount_limit: number
          category_id?: string | null
          created_at?: string
          id?: string
          period?: Database["public"]["Enums"]["budget_period"]
          user_id: string
        }
        Update: {
          amount_limit?: number
          category_id?: string | null
          created_at?: string
          id?: string
          period?: Database["public"]["Enums"]["budget_period"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean
          name: string
          type: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          type?: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          type?: Database["public"]["Enums"]["category_type"]
          user_id?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          account_id: string | null
          created_at: string
          deleted_at: string | null
          due_date: string | null
          id: string
          label: string
          remaining_amount: number
          settled_at: string | null
          total_amount: number
          type: Database["public"]["Enums"]["debt_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          label: string
          remaining_amount: number
          settled_at?: string | null
          total_amount: number
          type: Database["public"]["Enums"]["debt_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          label?: string
          remaining_amount?: number
          settled_at?: string | null
          total_amount?: number
          type?: Database["public"]["Enums"]["debt_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          locale: string
          name: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at: string | null
          referral_code: string | null
          referred_by: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          locale?: string
          name?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          locale?: string
          name?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_uses: {
        Row: {
          applied_at: string
          code_id: string
          id: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          code_id: string
          id?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          code_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          duration_days: number
          expires_at: string | null
          id: string
          max_uses: number | null
          plan: string
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          duration_days: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          plan: string
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          duration_days?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          plan?: string
          uses_count?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          reward_granted: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          reward_granted?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_granted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          created_at: string
          current_amount: number | null
          deleted_at: string | null
          icon: string | null
          id: string
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions_tracked: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          deleted_at: string | null
          frequency: Database["public"]["Enums"]["sub_frequency"]
          id: string
          name: string
          next_billing_date: string | null
          paused: boolean
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          frequency?: Database["public"]["Enums"]["sub_frequency"]
          id?: string
          name: string
          next_billing_date?: string | null
          paused?: boolean
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          frequency?: Database["public"]["Enums"]["sub_frequency"]
          id?: string
          name?: string
          next_billing_date?: string | null
          paused?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tracked_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tracked_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          ai_categorized: boolean
          amount: number
          category_id: string | null
          created_at: string
          date: string
          deleted_at: string | null
          id: string
          label: string
          notes: string | null
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Insert: {
          account_id?: string | null
          ai_categorized?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          id?: string
          label: string
          notes?: string | null
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Update: {
          account_id?: string | null
          ai_categorized?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          id?: string
          label?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      grant_referral_rewards: {
        Args: { _referred_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "courant" | "epargne" | "livret" | "liquide" | "autre"
      app_role: "user" | "admin"
      budget_period: "monthly" | "weekly"
      category_type: "expense" | "income" | "both"
      debt_type: "debt" | "loan"
      plan_tier: "free" | "pro" | "max"
      sub_frequency: "monthly" | "yearly" | "weekly"
      tx_type: "expense" | "income"
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
      account_type: ["courant", "epargne", "livret", "liquide", "autre"],
      app_role: ["user", "admin"],
      budget_period: ["monthly", "weekly"],
      category_type: ["expense", "income", "both"],
      debt_type: ["debt", "loan"],
      plan_tier: ["free", "pro", "max"],
      sub_frequency: ["monthly", "yearly", "weekly"],
      tx_type: ["expense", "income"],
    },
  },
} as const
