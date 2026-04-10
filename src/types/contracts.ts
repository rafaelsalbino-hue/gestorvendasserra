export type Entidade = "SESI" | "SENAI";

export type FuncaoResponsavel =
  | "Agente de Mercado PJ"
  | "Supervisor SESI"
  | "Supervisor SENAI"
  | "Backoffice Comercial"
  | "Secretaria"
  | "PCP"
  | "Analista Financeiro";

export const FUNCOES_RESPONSAVEL: FuncaoResponsavel[] = [
  "Agente de Mercado PJ",
  "Supervisor SESI",
  "Supervisor SENAI",
  "Backoffice Comercial",
  "Secretaria",
  "PCP",
  "Analista Financeiro",
];

export type EtapaContrato =
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
  { id: "proposta", label: "Proposta / CRM", responsavel: "PJ / Supervisor", colorClass: "step-pj" },
  { id: "rpc", label: "RPC / Execução", responsavel: "Backoffice Comercial", colorClass: "step-backoffice" },
  { id: "execucao", label: "Status RPC", responsavel: "Backoffice Comercial", colorClass: "step-backoffice" },
  { id: "matricula", label: "Matrícula / Dados", responsavel: "Secretaria", colorClass: "step-secretaria" },
  { id: "ensalamento", label: "Ensalamento", responsavel: "PCP", colorClass: "step-pcp" },
  { id: "faturamento", label: "Faturamento", responsavel: "Analista Financeiro", colorClass: "step-financeiro" },
];

export interface Contrato {
  id: string;
  entidade: Entidade;
  cliente: string;
  cnpj: string;
  dados_proposta: string;
  crm: string;
  servico_produto: string;
  valor: number;
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
