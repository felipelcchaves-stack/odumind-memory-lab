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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          code: string
          created_at: string
          descricao: string
          icon: string
          id: string
          nome: string
          requisito_tipo: string
          requisito_valor: number
        }
        Insert: {
          code: string
          created_at?: string
          descricao: string
          icon: string
          id?: string
          nome: string
          requisito_tipo: string
          requisito_valor: number
        }
        Update: {
          code?: string
          created_at?: string
          descricao?: string
          icon?: string
          id?: string
          nome?: string
          requisito_tipo?: string
          requisito_valor?: number
        }
        Relationships: []
      }
      gamification_logs: {
        Row: {
          created_at: string
          detalhes: Json | null
          id: string
          tipo_evento: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          id?: string
          tipo_evento: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          id?: string
          tipo_evento?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      memorizacao: {
        Row: {
          created_at: string
          facilidade: number
          forca_memoria: number
          id: string
          intervalo: number
          odu_id: string
          proxima_revisao: string | null
          revisoes: number
          status: Database["public"]["Enums"]["status_memorizacao"]
          ultima_revisao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facilidade?: number
          forca_memoria?: number
          id?: string
          intervalo?: number
          odu_id: string
          proxima_revisao?: string | null
          revisoes?: number
          status?: Database["public"]["Enums"]["status_memorizacao"]
          ultima_revisao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          facilidade?: number
          forca_memoria?: number
          id?: string
          intervalo?: number
          odu_id?: string
          proxima_revisao?: string | null
          revisoes?: number
          status?: Database["public"]["Enums"]["status_memorizacao"]
          ultima_revisao?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorizacao_odu_id_fkey"
            columns: ["odu_id"]
            isOneToOne: false
            referencedRelation: "odu"
            referencedColumns: ["id"]
          },
        ]
      }
      odu: {
        Row: {
          created_at: string
          exemplos_praticos: string | null
          id: string
          nome: string
          numero: number
          significado: string | null
          tags: string[] | null
          texto_principal: string
          updated_at: string
          verso: string | null
        }
        Insert: {
          created_at?: string
          exemplos_praticos?: string | null
          id?: string
          nome: string
          numero: number
          significado?: string | null
          tags?: string[] | null
          texto_principal: string
          updated_at?: string
          verso?: string | null
        }
        Update: {
          created_at?: string
          exemplos_praticos?: string | null
          id?: string
          nome?: string
          numero?: number
          significado?: string | null
          tags?: string[] | null
          texto_principal?: string
          updated_at?: string
          verso?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          last_study_date: string | null
          meta_diaria: number
          streak: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_study_date?: string | null
          meta_diaria?: number
          streak?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_study_date?: string | null
          meta_diaria?: number
          streak?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          conquistado_em: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          conquistado_em?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          conquistado_em?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calcular_proxima_revisao: {
        Args: { _facilidade: number; _intervalo: number; _qualidade: number }
        Returns: {
          nova_facilidade: number
          novo_intervalo: number
          proxima_data: string
        }[]
      }
      check_and_award_badges: { Args: { _user_id: string }; Returns: undefined }
      update_user_streak: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      status_memorizacao: "nao_estudado" | "estudando" | "memorizado"
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
      status_memorizacao: ["nao_estudado", "estudando", "memorizado"],
    },
  },
} as const
