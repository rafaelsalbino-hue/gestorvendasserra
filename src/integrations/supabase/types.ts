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
      audit_log: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          ip: string | null
          user_email: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          ip?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: []
      }
      contrato_anexos: {
        Row: {
          contrato_id: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          storage_path: string
          uploaded_by: string | null
          uploader_nome: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          file_name: string
          file_size?: number
          id?: string
          mime_type?: string
          storage_path: string
          uploaded_by?: string | null
          uploader_nome?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          storage_path?: string
          uploaded_by?: string | null
          uploader_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_anexos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_arquivos: {
        Row: {
          categoria: string
          contrato_id: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          storage_path: string
          uploaded_by: string | null
          uploader_nome: string
        }
        Insert: {
          categoria: string
          contrato_id: string
          created_at?: string
          file_name: string
          file_size?: number
          id?: string
          mime_type?: string
          storage_path: string
          uploaded_by?: string | null
          uploader_nome?: string
        }
        Update: {
          categoria?: string
          contrato_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          storage_path?: string
          uploaded_by?: string | null
          uploader_nome?: string
        }
        Relationships: []
      }
      contrato_comentarios: {
        Row: {
          autor_funcao: string
          autor_id: string | null
          autor_nome: string
          contrato_id: string
          created_at: string
          id: string
          is_system: boolean
          texto: string
        }
        Insert: {
          autor_funcao?: string
          autor_id?: string | null
          autor_nome?: string
          contrato_id: string
          created_at?: string
          id?: string
          is_system?: boolean
          texto: string
        }
        Update: {
          autor_funcao?: string
          autor_id?: string | null
          autor_nome?: string
          contrato_id?: string
          created_at?: string
          id?: string
          is_system?: boolean
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_comentarios_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          abertura_chamado: string
          agente_pj_id: string | null
          cadastro_estudantes: string
          cliente: string
          cnpj: string
          contrato_especial: boolean
          created_at: string
          crm: string
          dados_estudantes: string
          dados_proposta: string
          data_entrada_etapa_proposta: string | null
          data_visita: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          dias_execucao: string[]
          ensalamento_pcp: string
          entidade: Database["public"]["Enums"]["entidade_type"]
          etapa_atual: Database["public"]["Enums"]["etapa_contrato"]
          etapa_updated_at: string
          execucao_faturamento: string
          finalized_at: string | null
          finalized_by: string | null
          finalized_by_nome: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          info_execucao: string
          instrutor: string
          numero_chamado: string
          numero_rpc: string
          observacao_terceiro: string
          observacoes_visita: string
          planilha_info_gerais: string
          servico_produto: string
          status_proposta_crm: string
          status_rpc: string
          subdivisao: string | null
          sup_avaliacao_frequencia: boolean | null
          sup_avaliacao_frequencia_nota: boolean | null
          sup_carga_horaria: string | null
          sup_conteudo_programatico: string | null
          sup_cr_pj: string | null
          sup_data_inicio: string | null
          sup_data_termino: string | null
          sup_dias_horarios: string | null
          sup_finalizado: boolean | null
          sup_finalizado_at: string | null
          sup_finalizado_by: string | null
          sup_local_execucao: string | null
          sup_num_participantes: number | null
          sup_sugestao_professor: string | null
          ultima_movimentacao_at: string
          ultima_movimentacao_por: string
          updated_at: string
          valor: number
          valor_total_contrato: number | null
        }
        Insert: {
          abertura_chamado?: string
          agente_pj_id?: string | null
          cadastro_estudantes?: string
          cliente: string
          cnpj?: string
          contrato_especial?: boolean
          created_at?: string
          crm?: string
          dados_estudantes?: string
          dados_proposta?: string
          data_entrada_etapa_proposta?: string | null
          data_visita?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          dias_execucao?: string[]
          ensalamento_pcp?: string
          entidade: Database["public"]["Enums"]["entidade_type"]
          etapa_atual?: Database["public"]["Enums"]["etapa_contrato"]
          etapa_updated_at?: string
          execucao_faturamento?: string
          finalized_at?: string | null
          finalized_by?: string | null
          finalized_by_nome?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          info_execucao?: string
          instrutor?: string
          numero_chamado?: string
          numero_rpc?: string
          observacao_terceiro?: string
          observacoes_visita?: string
          planilha_info_gerais?: string
          servico_produto?: string
          status_proposta_crm?: string
          status_rpc?: string
          subdivisao?: string | null
          sup_avaliacao_frequencia?: boolean | null
          sup_avaliacao_frequencia_nota?: boolean | null
          sup_carga_horaria?: string | null
          sup_conteudo_programatico?: string | null
          sup_cr_pj?: string | null
          sup_data_inicio?: string | null
          sup_data_termino?: string | null
          sup_dias_horarios?: string | null
          sup_finalizado?: boolean | null
          sup_finalizado_at?: string | null
          sup_finalizado_by?: string | null
          sup_local_execucao?: string | null
          sup_num_participantes?: number | null
          sup_sugestao_professor?: string | null
          ultima_movimentacao_at?: string
          ultima_movimentacao_por?: string
          updated_at?: string
          valor?: number
          valor_total_contrato?: number | null
        }
        Update: {
          abertura_chamado?: string
          agente_pj_id?: string | null
          cadastro_estudantes?: string
          cliente?: string
          cnpj?: string
          contrato_especial?: boolean
          created_at?: string
          crm?: string
          dados_estudantes?: string
          dados_proposta?: string
          data_entrada_etapa_proposta?: string | null
          data_visita?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          dias_execucao?: string[]
          ensalamento_pcp?: string
          entidade?: Database["public"]["Enums"]["entidade_type"]
          etapa_atual?: Database["public"]["Enums"]["etapa_contrato"]
          etapa_updated_at?: string
          execucao_faturamento?: string
          finalized_at?: string | null
          finalized_by?: string | null
          finalized_by_nome?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          info_execucao?: string
          instrutor?: string
          numero_chamado?: string
          numero_rpc?: string
          observacao_terceiro?: string
          observacoes_visita?: string
          planilha_info_gerais?: string
          servico_produto?: string
          status_proposta_crm?: string
          status_rpc?: string
          subdivisao?: string | null
          sup_avaliacao_frequencia?: boolean | null
          sup_avaliacao_frequencia_nota?: boolean | null
          sup_carga_horaria?: string | null
          sup_conteudo_programatico?: string | null
          sup_cr_pj?: string | null
          sup_data_inicio?: string | null
          sup_data_termino?: string | null
          sup_dias_horarios?: string | null
          sup_finalizado?: boolean | null
          sup_finalizado_at?: string | null
          sup_finalizado_by?: string | null
          sup_local_execucao?: string | null
          sup_num_participantes?: number | null
          sup_sugestao_professor?: string | null
          ultima_movimentacao_at?: string
          ultima_movimentacao_por?: string
          updated_at?: string
          valor?: number
          valor_total_contrato?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_agente_pj_id_fkey"
            columns: ["agente_pj_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
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
      faturamentos_parciais: {
        Row: {
          contrato_id: string
          created_at: string
          criado_por: string | null
          criado_por_nome: string
          data_faturamento: string
          descricao: string
          id: string
          numero_nota: string
          updated_at: string
          valor: number
        }
        Insert: {
          contrato_id: string
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string
          data_faturamento?: string
          descricao?: string
          id?: string
          numero_nota?: string
          updated_at?: string
          valor: number
        }
        Update: {
          contrato_id?: string
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string
          data_faturamento?: string
          descricao?: string
          id?: string
          numero_nota?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturamentos_parciais_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          contrato_id: string | null
          created_at: string
          id: string
          lida_at: string | null
          mensagem: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          id?: string
          lida_at?: string | null
          mensagem?: string
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          id?: string
          lida_at?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      notificacoes_whatsapp: {
        Row: {
          contrato_id: string | null
          created_at: string
          destinatario_nome: string | null
          erro: string | null
          etapa_destino: string | null
          id: string
          mensagem: string | null
          numero_destinatario: string | null
          status: string | null
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          destinatario_nome?: string | null
          erro?: string | null
          etapa_destino?: string | null
          id?: string
          mensagem?: string | null
          numero_destinatario?: string | null
          status?: string | null
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          destinatario_nome?: string | null
          erro?: string | null
          etapa_destino?: string | null
          id?: string
          mensagem?: string | null
          numero_destinatario?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_whatsapp_contrato_id_fkey"
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
          entidade_atuacao: string | null
          especialidade_atuacao: string | null
          id: string
          nome: string
          responsavel_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email: string
          entidade_atuacao?: string | null
          especialidade_atuacao?: string | null
          id: string
          nome?: string
          responsavel_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          entidade_atuacao?: string | null
          especialidade_atuacao?: string | null
          id?: string
          nome?: string
          responsavel_id?: string | null
          updated_at?: string
          whatsapp?: string | null
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
          whatsapp: string | null
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
          whatsapp?: string | null
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
          whatsapp?: string | null
        }
        Relationships: []
      }
      unit_subdivisions: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          unit_name: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          unit_name: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          unit_name?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_contrato: {
        Args: { _contrato_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_backoffice: { Args: { _user_id: string }; Returns: boolean }
      is_coordenador: { Args: { _user_id: string }; Returns: boolean }
      is_gestor: { Args: { _user_id: string }; Returns: boolean }
      is_vendedor: { Args: { _user_id: string }; Returns: boolean }
      responsavel_id_of: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "gestor"
        | "operador"
        | "backoffice"
        | "admin"
        | "vendedor"
        | "secretaria"
        | "interlocutora"
        | "coordenador"
      entidade_type: "SESI" | "SENAI" | "SESI Saúde" | "SESI Educação"
      etapa_contrato:
        | "visita"
        | "proposta"
        | "supervisor"
        | "rpc"
        | "execucao"
        | "matricula"
        | "ensalamento"
        | "faturamento"
        | "finalizado"
      funcao_responsavel:
        | "Agente de Mercado PJ"
        | "Supervisor SESI"
        | "Supervisor SENAI"
        | "Backoffice Comercial"
        | "Secretaria"
        | "PCP"
        | "Analista Financeiro"
        | "Coordenador de Mercado"
        | "Analista Comercial"
        | "Gerente Regional"
        | "Interlocutora de Faturamento"
        | "Coordenador SESI/SENAI"
        | "Supervisor SENAI — Lages Cursos Técnicos"
        | "Supervisor SENAI — Lages Cursos de Qualificação"
        | "Supervisor SENAI — Correia Pinto"
        | "Supervisor SENAI — Otacílio Costa"
        | "Supervisor SESI Saúde — SST"
        | "Supervisor SESI Saúde — Promoção de Saúde"
        | "Supervisor SESI Saúde — Saúde Assistencial"
        | "Supervisor SESI Educação — ACE"
        | "Supervisor SESI Educação — Maker"
        | "Coordenador SENAI"
        | "Coordenador SESI Saúde"
        | "Coordenador SESI Expansão"
        | "Coordenador Comercial"
        | "Backoffice"
        | "Secretaria Escolar"
        | "PCP SESI"
        | "PCP SENAI"
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
      app_role: [
        "gestor",
        "operador",
        "backoffice",
        "admin",
        "vendedor",
        "secretaria",
        "interlocutora",
        "coordenador",
      ],
      entidade_type: ["SESI", "SENAI", "SESI Saúde", "SESI Educação"],
      etapa_contrato: [
        "visita",
        "proposta",
        "supervisor",
        "rpc",
        "execucao",
        "matricula",
        "ensalamento",
        "faturamento",
        "finalizado",
      ],
      funcao_responsavel: [
        "Agente de Mercado PJ",
        "Supervisor SESI",
        "Supervisor SENAI",
        "Backoffice Comercial",
        "Secretaria",
        "PCP",
        "Analista Financeiro",
        "Coordenador de Mercado",
        "Analista Comercial",
        "Gerente Regional",
        "Interlocutora de Faturamento",
        "Coordenador SESI/SENAI",
        "Supervisor SENAI — Lages Cursos Técnicos",
        "Supervisor SENAI — Lages Cursos de Qualificação",
        "Supervisor SENAI — Correia Pinto",
        "Supervisor SENAI — Otacílio Costa",
        "Supervisor SESI Saúde — SST",
        "Supervisor SESI Saúde — Promoção de Saúde",
        "Supervisor SESI Saúde — Saúde Assistencial",
        "Supervisor SESI Educação — ACE",
        "Supervisor SESI Educação — Maker",
        "Coordenador SENAI",
        "Coordenador SESI Saúde",
        "Coordenador SESI Expansão",
        "Coordenador Comercial",
        "Backoffice",
        "Secretaria Escolar",
        "PCP SESI",
        "PCP SENAI",
      ],
    },
  },
} as const
