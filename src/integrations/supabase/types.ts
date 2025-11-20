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
      active_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          ip_address: string | null
          last_activity: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          last_activity?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          last_activity?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          is_sensitive: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_sensitive?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_sensitive?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      app_settings_audit: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_value: string | null
          old_value: string | null
          setting_key: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          setting_key: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          setting_key?: string
        }
        Relationships: []
      }
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
      changelog: {
        Row: {
          created_at: string | null
          destaque: boolean | null
          id: string
          items: Json
          release_date: string
          titulo: string
          version: string
        }
        Insert: {
          created_at?: string | null
          destaque?: boolean | null
          id?: string
          items: Json
          release_date?: string
          titulo: string
          version: string
        }
        Update: {
          created_at?: string | null
          destaque?: boolean | null
          id?: string
          items?: Json
          release_date?: string
          titulo?: string
          version?: string
        }
        Relationships: []
      }
      conquistas: {
        Row: {
          conquistado_em: string
          descricao: string
          icone: string
          id: string
          tipo: string
          titulo: string
          user_id: string
          valor_conquista: number
        }
        Insert: {
          conquistado_em?: string
          descricao: string
          icone: string
          id?: string
          tipo: string
          titulo: string
          user_id: string
          valor_conquista: number
        }
        Update: {
          conquistado_em?: string
          descricao?: string
          icone?: string
          id?: string
          tipo?: string
          titulo?: string
          user_id?: string
          valor_conquista?: number
        }
        Relationships: []
      }
      elaborative_notes: {
        Row: {
          created_at: string
          id: string
          odu_id: string
          pergunta_tipo: string
          resposta: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          odu_id: string
          pergunta_tipo: string
          resposta: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          odu_id?: string
          pergunta_tipo?: string
          resposta?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elaborative_notes_odu_id_fkey"
            columns: ["odu_id"]
            isOneToOne: false
            referencedRelation: "odu"
            referencedColumns: ["id"]
          },
        ]
      }
      family_groups: {
        Row: {
          created_at: string
          group_name: string | null
          id: string
          max_members: number
          owner_user_id: string
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_name?: string | null
          id?: string
          max_members?: number
          owner_user_id: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_name?: string | null
          id?: string
          max_members?: number
          owner_user_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_groups_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      family_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          family_group_id: string
          id: string
          invited_by: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          family_group_id: string
          id?: string
          invited_by: string
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          family_group_id?: string
          id?: string
          invited_by?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      family_members: {
        Row: {
          family_group_id: string
          id: string
          invited_at: string
          joined_at: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          family_group_id: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          family_group_id?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
          consecutive_correct: number | null
          consecutive_wrong: number | null
          created_at: string
          facilidade: number
          forca_memoria: number
          id: string
          intervalo: number
          last_response_time: number | null
          marked_difficult: boolean | null
          odu_id: string
          proxima_revisao: string | null
          revisoes: number
          status: Database["public"]["Enums"]["status_memorizacao"]
          total_study_time: number | null
          ultima_revisao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consecutive_correct?: number | null
          consecutive_wrong?: number | null
          created_at?: string
          facilidade?: number
          forca_memoria?: number
          id?: string
          intervalo?: number
          last_response_time?: number | null
          marked_difficult?: boolean | null
          odu_id: string
          proxima_revisao?: string | null
          revisoes?: number
          status?: Database["public"]["Enums"]["status_memorizacao"]
          total_study_time?: number | null
          ultima_revisao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consecutive_correct?: number | null
          consecutive_wrong?: number | null
          created_at?: string
          facilidade?: number
          forca_memoria?: number
          id?: string
          intervalo?: number
          last_response_time?: number | null
          marked_difficult?: boolean | null
          odu_id?: string
          proxima_revisao?: string | null
          revisoes?: number
          status?: Database["public"]["Enums"]["status_memorizacao"]
          total_study_time?: number | null
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
      memory_palace: {
        Row: {
          created_at: string
          id: string
          nota_visual: string | null
          odu_id: string
          posicao: number
          sala: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nota_visual?: string | null
          odu_id: string
          posicao: number
          sala: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nota_visual?: string | null
          odu_id?: string
          posicao?: number
          sala?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_palace_odu_id_fkey"
            columns: ["odu_id"]
            isOneToOne: false
            referencedRelation: "odu"
            referencedColumns: ["id"]
          },
        ]
      }
      mnemonics: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          is_ai_generated: boolean
          is_favorite: boolean
          odu_id: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_favorite?: boolean
          odu_id: string
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_favorite?: boolean
          odu_id?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mnemonics_odu_id_fkey"
            columns: ["odu_id"]
            isOneToOne: false
            referencedRelation: "odu"
            referencedColumns: ["id"]
          },
        ]
      }
      narrative_tags: {
        Row: {
          created_at: string | null
          id: string
          odu_id: string | null
          tag: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          odu_id?: string | null
          tag: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          id?: string
          odu_id?: string | null
          tag?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "narrative_tags_odu_id_fkey"
            columns: ["odu_id"]
            isOneToOne: false
            referencedRelation: "odu"
            referencedColumns: ["id"]
          },
        ]
      }
      odu: {
        Row: {
          contexto_historico: string | null
          created_at: string
          exemplos_praticos: string | null
          id: string
          nome: string
          numero: number
          personagens: string | null
          significado: string | null
          tags: string[] | null
          tema_principal: string | null
          tema_secundario: string | null
          texto_principal: string
          updated_at: string
          verso: string | null
          verso_resumido: string | null
        }
        Insert: {
          contexto_historico?: string | null
          created_at?: string
          exemplos_praticos?: string | null
          id?: string
          nome: string
          numero: number
          personagens?: string | null
          significado?: string | null
          tags?: string[] | null
          tema_principal?: string | null
          tema_secundario?: string | null
          texto_principal: string
          updated_at?: string
          verso?: string | null
          verso_resumido?: string | null
        }
        Update: {
          contexto_historico?: string | null
          created_at?: string
          exemplos_praticos?: string | null
          id?: string
          nome?: string
          numero?: number
          personagens?: string | null
          significado?: string | null
          tags?: string[] | null
          tema_principal?: string | null
          tema_secundario?: string | null
          texto_principal?: string
          updated_at?: string
          verso?: string | null
          verso_resumido?: string | null
        }
        Relationships: []
      }
      odu_history: {
        Row: {
          change_description: string | null
          edited_at: string
          edited_by: string
          exemplos_praticos: string | null
          id: string
          nome: string
          numero: number
          odu_id: string
          significado: string | null
          tags: string[] | null
          texto_principal: string
          verso: string | null
        }
        Insert: {
          change_description?: string | null
          edited_at?: string
          edited_by: string
          exemplos_praticos?: string | null
          id?: string
          nome: string
          numero: number
          odu_id: string
          significado?: string | null
          tags?: string[] | null
          texto_principal: string
          verso?: string | null
        }
        Update: {
          change_description?: string | null
          edited_at?: string
          edited_by?: string
          exemplos_praticos?: string | null
          id?: string
          nome?: string
          numero?: number
          odu_id?: string
          significado?: string | null
          tags?: string[] | null
          texto_principal?: string
          verso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "odu_history_odu_id_fkey"
            columns: ["odu_id"]
            isOneToOne: false
            referencedRelation: "odu"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_notes: {
        Row: {
          conteudo: string | null
          created_at: string
          id: string
          odu_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conteudo?: string | null
          created_at?: string
          id?: string
          odu_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conteudo?: string | null
          created_at?: string
          id?: string
          odu_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_notes_odu_id_fkey"
            columns: ["odu_id"]
            isOneToOne: false
            referencedRelation: "odu"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          last_study_date: string | null
          last_viewed_changelog: string | null
          meta_diaria: number
          nome: string | null
          streak: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          last_study_date?: string | null
          last_viewed_changelog?: string | null
          meta_diaria?: number
          nome?: string | null
          streak?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          last_study_date?: string | null
          last_viewed_changelog?: string | null
          meta_diaria?: number
          nome?: string | null
          streak?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      referral_program: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          successful_conversions: number
          total_earned_days: number
          total_referrals: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          successful_conversions?: number
          total_earned_days?: number
          total_referrals?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          successful_conversions?: number
          total_earned_days?: number
          total_referrals?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_program_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          claimed: boolean
          created_at: string
          expires_at: string | null
          id: string
          reward_description: string
          reward_type: string
          user_id: string
        }
        Insert: {
          claimed?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          reward_description: string
          reward_type: string
          user_id: string
        }
        Update: {
          claimed?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          reward_description?: string
          reward_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_usage: {
        Row: {
          converted_at: string | null
          id: string
          referral_code: string
          referred_user_id: string
          referrer_id: string
          reward_type: string
          reward_value: number
          status: Database["public"]["Enums"]["referral_status"]
          used_at: string
        }
        Insert: {
          converted_at?: string | null
          id?: string
          referral_code: string
          referred_user_id: string
          referrer_id: string
          reward_type: string
          reward_value: number
          status?: Database["public"]["Enums"]["referral_status"]
          used_at?: string
        }
        Update: {
          converted_at?: string | null
          id?: string
          referral_code?: string
          referred_user_id?: string
          referrer_id?: string
          reward_type?: string
          reward_value?: number
          status?: Database["public"]["Enums"]["referral_status"]
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_usage_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_usage_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      study_plan: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          data_fim_estimada: string | null
          data_inicio: string | null
          estimativa_dias: number
          id: string
          plano_completo: Json
          user_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data_fim_estimada?: string | null
          data_inicio?: string | null
          estimativa_dias: number
          id?: string
          plano_completo: Json
          user_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data_fim_estimada?: string | null
          data_inicio?: string | null
          estimativa_dias?: number
          id?: string
          plano_completo?: Json
          user_id?: string
        }
        Relationships: []
      }
      study_schedule: {
        Row: {
          ativo: boolean
          created_at: string
          dia_semana: number
          duracao_minutos: number | null
          hora_fim: string
          hora_inicio: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_semana: number
          duracao_minutos?: number | null
          hora_fim: string
          hora_inicio: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_semana?: number
          duracao_minutos?: number | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          average_response_time: number | null
          correct_answers: number | null
          created_at: string
          ended_at: string | null
          id: string
          session_mode: string | null
          started_at: string
          total_cards: number | null
          user_id: string
          wrong_answers: number | null
        }
        Insert: {
          average_response_time?: number | null
          correct_answers?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          session_mode?: string | null
          started_at?: string
          total_cards?: number | null
          user_id: string
          wrong_answers?: number | null
        }
        Update: {
          average_response_time?: number | null
          correct_answers?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          session_mode?: string | null
          started_at?: string
          total_cards?: number | null
          user_id?: string
          wrong_answers?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_name: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      unlock_progress: {
        Row: {
          created_at: string
          current_limit: number
          id: string
          next_unlock: number
          unlock_requirement_type: string
          unlock_requirement_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_limit?: number
          id?: string
          next_unlock?: number
          unlock_requirement_type?: string
          unlock_requirement_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_limit?: number
          id?: string
          next_unlock?: number
          unlock_requirement_type?: string
          unlock_requirement_value?: number
          updated_at?: string
          user_id?: string
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
      user_learning_profile: {
        Row: {
          average_accuracy: number
          average_speed: number
          best_study_hour: number | null
          created_at: string
          fast_learner: boolean
          id: string
          learning_curve_data: Json | null
          needs_reinforcement: boolean
          optimal_session_time: number
          updated_at: string
          user_id: string
          weak_odus: string[] | null
        }
        Insert: {
          average_accuracy?: number
          average_speed?: number
          best_study_hour?: number | null
          created_at?: string
          fast_learner?: boolean
          id?: string
          learning_curve_data?: Json | null
          needs_reinforcement?: boolean
          optimal_session_time?: number
          updated_at?: string
          user_id: string
          weak_odus?: string[] | null
        }
        Update: {
          average_accuracy?: number
          average_speed?: number
          best_study_hour?: number | null
          created_at?: string
          fast_learner?: boolean
          id?: string
          learning_curve_data?: Json | null
          needs_reinforcement?: boolean
          optimal_session_time?: number
          updated_at?: string
          user_id?: string
          weak_odus?: string[] | null
        }
        Relationships: []
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
      user_tour_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string
          tour_completed: boolean | null
          tour_version: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          tour_completed?: boolean | null
          tour_version?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          tour_completed?: boolean | null
          tour_version?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      check_and_award_achievements: {
        Args: { _user_id: string }
        Returns: undefined
      }
      check_and_award_badges: { Args: { _user_id: string }; Returns: undefined }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      get_user_emails: {
        Args: { user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_user_family_group: { Args: { _user_id: string }; Returns: string }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_admin_role: { Args: { _user_id: string }; Returns: boolean }
      has_aluno_role: { Args: { _user_id: string }; Returns: boolean }
      has_colaborador_role: { Args: { _user_id: string }; Returns: boolean }
      is_family_member: {
        Args: { _family_group_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_owner: {
        Args: { _family_group_id: string; _user_id: string }
        Returns: boolean
      }
      update_user_streak: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user" | "colaborador" | "aluno"
      referral_status: "pending" | "converted" | "expired"
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
      app_role: ["admin", "user", "colaborador", "aluno"],
      referral_status: ["pending", "converted", "expired"],
      status_memorizacao: ["nao_estudado", "estudando", "memorizado"],
    },
  },
} as const
