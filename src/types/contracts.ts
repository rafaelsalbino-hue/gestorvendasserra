export type Entidade = "SESI" | "SENAI" | "SESI Saúde";

export type FuncaoResponsavel =
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
  | "Interlocutora de Faturamento";

export const FUNCOES_RESPONSAVEL: FuncaoResponsavel[] = [
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
];

// Funções com papel de Gestor (acesso total)
export const FUNCOES_GESTOR: FuncaoResponsavel[] = [
  "Coordenador de Mercado",
  "Analista Comercial",
];

export type EtapaContrato =
  | "visita"
  | "proposta"
  | "rpc"
  | "execucao"
  | "matricula"
  | "ensalamento"
  | "faturamento";

export interface EtapaInfo {
  id: EtapaContrato;
  label: string;
  responsavel: string;
  colorClass: string;
}

export const ETAPAS: EtapaInfo[] = [
  { id: "visita", label: "Visitas", responsavel: "Agente PJ", colorClass: "step-pj" },
  { id: "proposta", label: "Proposta / CRM", responsavel: "PJ / Supervisor", colorClass: "step-pj" },
  { id: "rpc", label: "RPC / Execução", responsavel: "Backoffice Comercial", colorClass: "step-backoffice" },
  { id: "execucao", label: "Status RPC", responsavel: "Backoffice Comercial", colorClass: "step-backoffice" },
  { id: "matricula", label: "Matrícula / Dados", responsavel: "Secretaria", colorClass: "step-secretaria" },
  { id: "ensalamento", label: "Ensalamento", responsavel: "PCP", colorClass: "step-pcp" },
  { id: "faturamento", label: "Faturamento", responsavel: "Analista Financeiro", colorClass: "step-financeiro" },
];

// Status options per field
export const STATUS_OPTIONS = {
  dados_proposta: ["Aguardando", "Dados entregues"],
  status_proposta_crm: [
    "Em elaboração",
    "Em Negociação",
    "Ganha",
    "Perdido",
    "Cancelada",
  ],
  info_execucao: ["Aguardando", "Dados entregues"],
  status_rpc: [
    "Em elaboração",
    "Aguardando Informações",
    "Aguardando Assinatura cliente",
    "Concluído",
  ],
  dados_estudantes: ["Aguardando", "Dados entregues"],
  cadastro_estudantes: ["Em elaboração", "Concluído"],
  ensalamento_pcp: ["Em elaboração", "Concluído"],
  abertura_chamado: [
    "A executar",
    "Aguardando empenho",
    "Chamado aberto",
  ],
  execucao_faturamento: [
    "Aguardando retorno da sede",
    "Aguardando integração",
    "Faturado",
  ],
} as const;

export const ALLOWED_DOMAINS = ["sc.senai.br", "fiesc.com.br", "sesisc.org.br"];

// Subdivisões disponíveis apenas para SESI Saúde
export type SubdivisaoSaude = "Promoção de Saúde" | "Saúde Assistencial" | "SST" | "NRs";

export const SUBDIVISIONS_BY_UNIT: Record<Entidade, string[]> = {
  "SESI": [],
  "SENAI": [],
  "SESI Saúde": ["Promoção de Saúde", "Saúde Assistencial", "SST", "NRs"],
};

export const SUBDIVISAO_COLORS: Record<string, string> = {
  "Promoção de Saúde": "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200",
  "Saúde Assistencial": "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200",
  "SST": "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200",
  "NRs": "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200",
};

export interface Contrato {
  id: string;
  entidade: Entidade;
  cliente: string;
  cnpj: string;
  dados_proposta: string;
  crm: string;
  servico_produto: string;
  valor: number;
  planilha_info_gerais: string;
  status_proposta_crm: string;
  numero_rpc: string;
  info_execucao: string;
  status_rpc: string;
  observacao_terceiro: string;
  dados_estudantes: string;
  cadastro_estudantes: string;
  ensalamento_pcp: string;
  abertura_chamado: string;
  numero_chamado: string;
  execucao_faturamento: string;
  etapa_atual: EtapaContrato;
  created_at: string;
}

export interface Responsavel {
  id: string;
  nome: string;
  email: string;
  funcao: FuncaoResponsavel;
  ativo: boolean;
  created_at: string;
}
