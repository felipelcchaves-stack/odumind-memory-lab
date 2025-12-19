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
      admin_announcements: {
        Row: {
          ativo: boolean
          conteudo: string
          created_at: string
          created_by: string | null
          id: string
          show_to: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          conteudo: string
          created_at?: string
          created_by?: string | null
          id?: string
          show_to?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          show_to?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      collaborator_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          id: string
          permission_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          id?: string
          permission_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          id?: string
          permission_type?: string
          updated_at?: string
          user_id?: string
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
      content_types: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          icon: string
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          icon: string
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          icon?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          discount_applied: number | null
          email: string
          id: string
          order_value: number | null
          used_at: string
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          discount_applied?: number | null
          email: string
          id?: string
          order_value?: number | null
          used_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          discount_applied?: number | null
          email?: string
          id?: string
          order_value?: number | null
          used_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_percent: number
          email: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          source: string
          stripe_coupon_id: string | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_percent?: number
          email?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          source?: string
          stripe_coupon_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_percent?: number
          email?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          source?: string
          stripe_coupon_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
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
      learning_paths: {
        Row: {
          ativo: boolean | null
          cor: string
          created_at: string | null
          descricao: string | null
          icone: string
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          requer_assinatura: boolean | null
          slug: string
          total_conteudos: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string
          created_at?: string | null
          descricao?: string | null
          icone?: string
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          requer_assinatura?: boolean | null
          slug: string
          total_conteudos?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string
          created_at?: string | null
          descricao?: string | null
          icone?: string
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          requer_assinatura?: boolean | null
          slug?: string
          total_conteudos?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_phases: {
        Row: {
          cor: string
          created_at: string | null
          descricao: string | null
          icone: string
          id: string
          nome: string
          odus_incluidos: number[]
          ordem: number
          path_id: string | null
          prerequisito_fase_id: string | null
          prerequisito_percentual: number | null
          slug: string
        }
        Insert: {
          cor: string
          created_at?: string | null
          descricao?: string | null
          icone: string
          id?: string
          nome: string
          odus_incluidos?: number[]
          ordem: number
          path_id?: string | null
          prerequisito_fase_id?: string | null
          prerequisito_percentual?: number | null
          slug: string
        }
        Update: {
          cor?: string
          created_at?: string | null
          descricao?: string | null
          icone?: string
          id?: string
          nome?: string
          odus_incluidos?: number[]
          ordem?: number
          path_id?: string | null
          prerequisito_fase_id?: string | null
          prerequisito_percentual?: number | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_phases_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_phases_prerequisito_fase_id_fkey"
            columns: ["prerequisito_fase_id"]
            isOneToOne: false
            referencedRelation: "learning_phases"
            referencedColumns: ["id"]
          },
        ]
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
      odu_audio: {
        Row: {
          audio_type: string
          audio_url: string
          created_at: string
          duration_seconds: number | null
          id: string
          odu_id: string
          updated_at: string
          voice_id: string | null
        }
        Insert: {
          audio_type?: string
          audio_url: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          odu_id: string
          updated_at?: string
          voice_id?: string | null
        }
        Update: {
          audio_type?: string
          audio_url?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          odu_id?: string
          updated_at?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "odu_audio_odu_id_fkey"
            columns: ["odu_id"]
            isOneToOne: false
            referencedRelation: "odu"
            referencedColumns: ["id"]
          },
        ]
      }
      odu_history: {
        Row: {
          change_description: string | null
          edited_at: string
          edited_by: string | null
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
          edited_by?: string | null
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
          edited_by?: string | null
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
      path_content: {
        Row: {
          ativo: boolean | null
          audio_url: string | null
          contexto_historico: string | null
          created_at: string | null
          dificuldade: string | null
          exemplos_praticos: string | null
          id: string
          imagem_url: string | null
          materiais_necessarios: string[] | null
          nome: string
          numero: number | null
          ordem: number | null
          path_id: string | null
          phase_id: string | null
          significado: string | null
          tags: string[] | null
          tempo_execucao: number | null
          texto_principal: string
          updated_at: string | null
          verso: string | null
          verso_resumido: string | null
        }
        Insert: {
          ativo?: boolean | null
          audio_url?: string | null
          contexto_historico?: string | null
          created_at?: string | null
          dificuldade?: string | null
          exemplos_praticos?: string | null
          id?: string
          imagem_url?: string | null
          materiais_necessarios?: string[] | null
          nome: string
          numero?: number | null
          ordem?: number | null
          path_id?: string | null
          phase_id?: string | null
          significado?: string | null
          tags?: string[] | null
          tempo_execucao?: number | null
          texto_principal: string
          updated_at?: string | null
          verso?: string | null
          verso_resumido?: string | null
        }
        Update: {
          ativo?: boolean | null
          audio_url?: string | null
          contexto_historico?: string | null
          created_at?: string | null
          dificuldade?: string | null
          exemplos_praticos?: string | null
          id?: string
          imagem_url?: string | null
          materiais_necessarios?: string[] | null
          nome?: string
          numero?: number | null
          ordem?: number | null
          path_id?: string | null
          phase_id?: string | null
          significado?: string | null
          tags?: string[] | null
          tempo_execucao?: number | null
          texto_principal?: string
          updated_at?: string | null
          verso?: string | null
          verso_resumido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "path_content_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "path_content_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "learning_phases"
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
          data_nascimento: string | null
          estado: string | null
          id: string
          last_study_date: string | null
          last_viewed_changelog: string | null
          meta_diaria: number
          nome: string | null
          onboarding_completed: boolean | null
          pais: string | null
          profile_completed: boolean | null
          sexo: string | null
          streak: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          data_nascimento?: string | null
          estado?: string | null
          id?: string
          last_study_date?: string | null
          last_viewed_changelog?: string | null
          meta_diaria?: number
          nome?: string | null
          onboarding_completed?: boolean | null
          pais?: string | null
          profile_completed?: boolean | null
          sexo?: string | null
          streak?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          data_nascimento?: string | null
          estado?: string | null
          id?: string
          last_study_date?: string | null
          last_viewed_changelog?: string | null
          meta_diaria?: number
          nome?: string | null
          onboarding_completed?: boolean | null
          pais?: string | null
          profile_completed?: boolean | null
          sexo?: string | null
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
      renewal_offers: {
        Row: {
          coupon_id: string | null
          created_at: string
          discount_percent: number
          email_sent_to: string | null
          expires_at: string | null
          id: string
          offer_type: string
          opened_at: string | null
          original_value: number | null
          plan_name: string | null
          sent_at: string | null
          status: string
          updated_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          discount_percent?: number
          email_sent_to?: string | null
          expires_at?: string | null
          id?: string
          offer_type?: string
          opened_at?: string | null
          original_value?: number | null
          plan_name?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          discount_percent?: number
          email_sent_to?: string | null
          expires_at?: string | null
          id?: string
          offer_type?: string
          opened_at?: string | null
          original_value?: number | null
          plan_name?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_offers_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_content: {
        Row: {
          audio_url: string | null
          content_type_id: string | null
          contexto_historico: string | null
          created_at: string | null
          dificuldade: string | null
          exemplos_praticos: string | null
          id: string
          materiais_necessarios: string[] | null
          nome: string
          numero: number | null
          odu_relacionados: string[] | null
          tags: string[] | null
          tempo_execucao: number | null
          texto_principal: string
          updated_at: string | null
          verso_resumido: string | null
        }
        Insert: {
          audio_url?: string | null
          content_type_id?: string | null
          contexto_historico?: string | null
          created_at?: string | null
          dificuldade?: string | null
          exemplos_praticos?: string | null
          id?: string
          materiais_necessarios?: string[] | null
          nome: string
          numero?: number | null
          odu_relacionados?: string[] | null
          tags?: string[] | null
          tempo_execucao?: number | null
          texto_principal: string
          updated_at?: string | null
          verso_resumido?: string | null
        }
        Update: {
          audio_url?: string | null
          content_type_id?: string | null
          contexto_historico?: string | null
          created_at?: string | null
          dificuldade?: string | null
          exemplos_praticos?: string | null
          id?: string
          materiais_necessarios?: string[] | null
          nome?: string
          numero?: number | null
          odu_relacionados?: string[] | null
          tags?: string[] | null
          tempo_execucao?: number | null
          texto_principal?: string
          updated_at?: string | null
          verso_resumido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ritual_content_content_type_id_fkey"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "content_types"
            referencedColumns: ["id"]
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
          auto_finalized: boolean | null
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
          auto_finalized?: boolean | null
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
          auto_finalized?: boolean | null
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
      subscription_changes: {
        Row: {
          billing_cycle: string
          changed_by: string
          created_at: string
          id: string
          new_plan: string
          new_stripe_subscription_id: string | null
          old_plan: string
          old_stripe_subscription_id: string | null
          reason: string | null
          stripe_response: Json | null
          user_id: string
        }
        Insert: {
          billing_cycle: string
          changed_by: string
          created_at?: string
          id?: string
          new_plan: string
          new_stripe_subscription_id?: string | null
          old_plan: string
          old_stripe_subscription_id?: string | null
          reason?: string | null
          stripe_response?: Json | null
          user_id: string
        }
        Update: {
          billing_cycle?: string
          changed_by?: string
          created_at?: string
          id?: string
          new_plan?: string
          new_stripe_subscription_id?: string | null
          old_plan?: string
          old_stripe_subscription_id?: string | null
          reason?: string | null
          stripe_response?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          ativo: boolean
          badge_text: string | null
          checkout_url: string | null
          cor: string | null
          created_at: string
          cta_text: string
          descricao: string | null
          duracao_dias: number | null
          features: Json
          guru_offer_id: string | null
          guru_product_id: string | null
          hierarquia: number
          id: string
          moeda: string
          nome: string
          ordem: number
          periodo: string
          plan_level: string
          preco: number
          preco_original: number | null
          slug: string
          updated_at: string
          variant: string
          visivel_landing: boolean
          visivel_subscription: boolean
        }
        Insert: {
          ativo?: boolean
          badge_text?: string | null
          checkout_url?: string | null
          cor?: string | null
          created_at?: string
          cta_text?: string
          descricao?: string | null
          duracao_dias?: number | null
          features?: Json
          guru_offer_id?: string | null
          guru_product_id?: string | null
          hierarquia?: number
          id?: string
          moeda?: string
          nome: string
          ordem?: number
          periodo?: string
          plan_level?: string
          preco?: number
          preco_original?: number | null
          slug: string
          updated_at?: string
          variant?: string
          visivel_landing?: boolean
          visivel_subscription?: boolean
        }
        Update: {
          ativo?: boolean
          badge_text?: string | null
          checkout_url?: string | null
          cor?: string | null
          created_at?: string
          cta_text?: string
          descricao?: string | null
          duracao_dias?: number | null
          features?: Json
          guru_offer_id?: string | null
          guru_product_id?: string | null
          hierarquia?: number
          id?: string
          moeda?: string
          nome?: string
          ordem?: number
          periodo?: string
          plan_level?: string
          preco?: number
          preco_original?: number | null
          slug?: string
          updated_at?: string
          variant?: string
          visivel_landing?: boolean
          visivel_subscription?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          guru_customer_id: string | null
          guru_subscription_id: string | null
          id: string
          payment_gateway: string | null
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
          guru_customer_id?: string | null
          guru_subscription_id?: string | null
          id?: string
          payment_gateway?: string | null
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
          guru_customer_id?: string | null
          guru_subscription_id?: string | null
          id?: string
          payment_gateway?: string | null
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
      technique_unlock_progress: {
        Row: {
          created_at: string | null
          id: string
          technique_id: string
          unlocked: boolean | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          technique_id: string
          unlocked?: boolean | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          technique_id?: string
          unlocked?: boolean | null
          unlocked_at?: string | null
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
      user_announcements_read: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_announcements_read_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "admin_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_announcements_read_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      user_path_content_progress: {
        Row: {
          content_id: string | null
          created_at: string | null
          facilidade: number | null
          forca_memoria: number | null
          id: string
          intervalo: number | null
          path_id: string | null
          proxima_revisao: string | null
          revisoes: number | null
          status: string | null
          ultima_revisao: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          facilidade?: number | null
          forca_memoria?: number | null
          id?: string
          intervalo?: number | null
          path_id?: string | null
          proxima_revisao?: string | null
          revisoes?: number | null
          status?: string | null
          ultima_revisao?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          facilidade?: number | null
          forca_memoria?: number | null
          id?: string
          intervalo?: number | null
          path_id?: string | null
          proxima_revisao?: string | null
          revisoes?: number | null
          status?: string | null
          ultima_revisao?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_path_content_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "path_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_path_content_progress_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      user_phase_progress: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          phase_id: string
          started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          phase_id: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          phase_id?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_phase_progress_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "learning_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reviews: {
        Row: {
          comment: string | null
          created_at: string
          display_name: string | null
          id: string
          is_approved: boolean
          is_featured: boolean
          rating: number
          updated_at: string
          user_id: string
          xp_at_review: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          rating: number
          updated_at?: string
          user_id: string
          xp_at_review?: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          rating?: number
          updated_at?: string
          user_id?: string
          xp_at_review?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_ritual_progress: {
        Row: {
          created_at: string | null
          id: string
          notas_pessoais: string | null
          proxima_revisao: string | null
          ritual_id: string | null
          status: string | null
          ultima_pratica: string | null
          updated_at: string | null
          user_id: string
          vezes_praticado: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notas_pessoais?: string | null
          proxima_revisao?: string | null
          ritual_id?: string | null
          status?: string | null
          ultima_pratica?: string | null
          updated_at?: string | null
          user_id: string
          vezes_praticado?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notas_pessoais?: string | null
          proxima_revisao?: string | null
          ritual_id?: string | null
          status?: string | null
          ultima_pratica?: string | null
          updated_at?: string | null
          user_id?: string
          vezes_praticado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_ritual_progress_ritual_id_fkey"
            columns: ["ritual_id"]
            isOneToOne: false
            referencedRelation: "ritual_content"
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
      utm_tracking: {
        Row: {
          created_at: string
          id: string
          landing_page: string | null
          referrer: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          landing_page?: string | null
          referrer?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          landing_page?: string | null
          referrer?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
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
      cleanup_abandoned_sessions: { Args: never; Returns: undefined }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      get_latest_subscriptions: {
        Args: { user_ids: string[] }
        Returns: {
          plan_name: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_demographics_summary: {
        Args: never
        Returns: {
          estado: string
          faixa_etaria: string
          pais: string
          sexo: string
          total_usuarios: number
        }[]
      }
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
      has_permission: {
        Args: { _permission_type: string; _user_id: string }
        Returns: boolean
      }
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
