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
      contratos: {
        Row: {
          abertura_chamado: string
          cadastro_estudantes: string
          cliente: string
          cnpj: string
          created_at: string
          crm: string
          dados_estudantes: string
          dados_proposta: string
          ensalamento_pcp: string
          entidade: Database["public"]["Enums"]["entidade_type"]
          etapa_atual: Database["public"]["Enums"]["etapa_contrato"]
          execucao_faturamento: string
          id: string
          info_execucao: string
          numero_chamado: string
          numero_rpc: string
          observacao_terceiro: string
          planilha_info_gerais: string
          servico_produto: string
          status_proposta_crm: string
          status_rpc: string
          updated_at: string
          valor: number
        }
        Insert: {
          abertura_chamado?: string
          cadastro_estudantes?: string
          cliente: string
          cnpj?: string
          created_at?: string
          crm?: string
          dados_estudantes?: string
          dados_proposta?: string
          ensalamento_pcp?: string
          entidade: Database["public"]["Enums"]["entidade_type"]
          etapa_atual?: Database["public"]["Enums"]["etapa_contrato"]
          execucao_faturamento?: string
          id?: string
          info_execucao?: string
          numero_chamado?: string
          numero_rpc?: string
          observacao_terceiro?: string
          planilha_info_gerais?: string
          servico_produto?: string
          status_proposta_crm?: string
          status_rpc?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          abertura_chamado?: string
          cadastro_estudantes?: string
          cliente?: string
          cnpj?: string
          created_at?: string
          crm?: string
          dados_estudantes?: string
          dados_proposta?: string
          ensalamento_pcp?: string
          entidade?: Database["public"]["Enums"]["entidade_type"]
          etapa_atual?: Database["public"]["Enums"]["etapa_contrato"]
          execucao_faturamento?: string
          id?: string
          info_execucao?: string
          numero_chamado?: string
          numero_rpc?: string
          observacao_terceiro?: string
          planilha_info_gerais?: string
          servico_produto?: string
          status_proposta_crm?: string
          status_rpc?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      contratos_historico: {
        Row: {
          campo: string
          contrato_id: string
          created_at: string
          id: string
          usuario_funcao: string | null
          usuario_nome: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo: string
          contrato_id: string
          created_at?: string
          id?: string
          usuario_funcao?: string | null
          usuario_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string
          contrato_id?: string
          created_at?: string
          id?: string
          usuario_funcao?: string | null
          usuario_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_historico_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          responsavel_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome?: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      responsaveis: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          funcao: Database["public"]["Enums"]["funcao_responsavel"]
          id: string
          nome: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          funcao: Database["public"]["Enums"]["funcao_responsavel"]
          id?: string
          nome: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          funcao?: Database["public"]["Enums"]["funcao_responsavel"]
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string | null
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
      entidade_type: "SESI" | "SENAI"
      etapa_contrato:
        | "proposta"
        | "rpc"
        | "execucao"
        | "matricula"
        | "ensalamento"
        | "faturamento"
      funcao_responsavel:
        | "Agente de Mercado PJ"
        | "Supervisor SESI"
        | "Supervisor SENAI"
        | "Backoffice Comercial"
        | "Secretaria"
        | "PCP"
        | "Analista Financeiro"
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
      entidade_type: ["SESI", "SENAI"],
      etapa_contrato: [
        "proposta",
        "rpc",
        "execucao",
        "matricula",
        "ensalamento",
        "faturamento",
      ],
      funcao_responsavel: [
        "Agente de Mercado PJ",
        "Supervisor SESI",
        "Supervisor SENAI",
        "Backoffice Comercial",
        "Secretaria",
        "PCP",
        "Analista Financeiro",
      ],
    },
  },
} as const
