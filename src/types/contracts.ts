export type Entidade = "SESI" | "SENAI" | "SESI Saúde" | "REDE";

export type FuncaoResponsavel =
  | "Agente de Mercado PJ"
  | "Analista Financeiro"
  | "Coordenador de Mercado"
  | "Analista Comercial"
  | "Gerente Regional"
  | "Interlocutora de Faturamento"
  // Supervisores SENAI
  | "Supervisor SENAI — Lages Cursos Técnicos"
  | "Supervisor SENAI — Lages Cursos de Qualificação"
  | "Supervisor SENAI — Correia Pinto"
  | "Supervisor SENAI — Otacílio Costa"
  // Supervisores SESI Saúde
  | "Supervisor SESI Saúde — SST"
  | "Supervisor SESI Saúde — Promoção de Saúde"
  | "Supervisor SESI Saúde — Saúde Assistencial"
  // Supervisores SESI Educação
  | "Supervisor SESI Educação — ACE"
  | "Supervisor SESI Educação — Maker"
  // Coordenadores
  | "Coordenador SENAI"
  | "Coordenador SESI Saúde"
  | "Coordenador SESI Expansão"
  | "Coordenador Comercial SENAI"
  // Outros
  | "Secretaria Escolar"
  | "PCP SESI"
  | "PCP SENAI"
  // Backoffice segmentado por entidade
  | "Backoffice SESI Saúde"
  | "Backoffice SESI Educação"
  | "Backoffice SENAI";

export const FUNCOES_RESPONSAVEL: FuncaoResponsavel[] = [
  "Agente de Mercado PJ",
  // Supervisores SENAI
  "Supervisor SENAI — Lages Cursos Técnicos",
  "Supervisor SENAI — Lages Cursos de Qualificação",
  "Supervisor SENAI — Correia Pinto",
  "Supervisor SENAI — Otacílio Costa",
  // Supervisores SESI Saúde
  "Supervisor SESI Saúde — SST",
  "Supervisor SESI Saúde — Promoção de Saúde",
  "Supervisor SESI Saúde — Saúde Assistencial",
  // Supervisores SESI Educação
  "Supervisor SESI Educação — ACE",
  "Supervisor SESI Educação — Maker",
  // Coordenadores
  "Coordenador SENAI",
  "Coordenador SESI Saúde",
  "Coordenador SESI Expansão",
  "Coordenador Comercial SENAI",
  "Coordenador de Mercado",
  // Comercial / Backoffice
  "Analista Comercial",
  "Backoffice SESI Saúde",
  "Backoffice SESI Educação",
  "Backoffice SENAI",
  // Operacional
  "Secretaria Escolar",
  "PCP SESI",
  "PCP SENAI",
  // Financeiro
  "Interlocutora de Faturamento",
  "Analista Financeiro",
  // Gerência
  "Gerente Regional",
];

// Funções com papel de Gestor (acesso total)
export const FUNCOES_GESTOR: FuncaoResponsavel[] = [
  "Coordenador de Mercado",
  "Analista Comercial",
];

// Entidade de atuação (para supervisores)
export type EntidadeAtuacao = "SENAI" | "SESI Saúde" | "SESI Educação";

export const ENTIDADES_ATUACAO: EntidadeAtuacao[] = ["SENAI", "SESI Saúde", "SESI Educação"];

// Especialidade dinâmica por entidade
export const ESPECIALIDADES_POR_ENTIDADE: Record<EntidadeAtuacao, string[]> = {
  "SENAI": [
    "Lages Cursos Técnicos",
    "Lages Cursos de Qualificação",
    "Correia Pinto",
    "Otacílio Costa",
  ],
  "SESI Saúde": ["SST", "Promoção de Saúde", "Saúde Assistencial"],
  "SESI Educação": ["ACE", "Maker"],
};

// Funções que recebem notificações automáticas (WhatsApp obrigatório no cadastro)
export function isSupervisorRole(funcao: string): boolean {
  return typeof funcao === "string" && funcao.startsWith("Supervisor");
}

export function isNotificavelRole(funcao: string): boolean {
  if (!funcao) return false;
  if (isSupervisorRole(funcao)) return true;
  return [
    "Agente de Mercado PJ",
    "Backoffice SESI Saúde",
    "Backoffice SESI Educação",
    "Backoffice SENAI",
    "Secretaria Escolar",
    "PCP SESI",
    "PCP SENAI",
    "Analista Financeiro",
    "Interlocutora de Faturamento",
    "Coordenador SENAI",
    "Coordenador SESI Saúde",
    "Coordenador SESI Expansão",
    "Coordenador Comercial SENAI",
    "Coordenador de Mercado",
  ].includes(funcao);
}

// Funções que podem alterar QUALQUER campo de status (status_*) em qualquer etapa.
// Secretaria e Interlocutora de Faturamento têm permissão ampliada de status.
export const FUNCOES_STATUS_AMPLO: FuncaoResponsavel[] = [
  "Interlocutora de Faturamento",
  "Secretaria Escolar",
];

export type EtapaContrato =
  | "visita"
  | "crm"
  | "proposta"
  | "supervisor"
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
  { id: "crm", label: "CRM", responsavel: "Agente PJ", colorClass: "step-pj" },
  { id: "supervisor", label: "Supervisor", responsavel: "Supervisor SESI/SENAI", colorClass: "step-pj" },
  { id: "proposta", label: "Proposta", responsavel: "Backoffice / Supervisor", colorClass: "step-pj" },
  { id: "rpc", label: "RPC / Execução", responsavel: "Backoffice Comercial", colorClass: "step-backoffice" },
  { id: "execucao", label: "Status RPC", responsavel: "Backoffice Comercial", colorClass: "step-backoffice" },
  { id: "matricula", label: "Matrícula / Dados", responsavel: "Secretaria", colorClass: "step-secretaria" },
  { id: "ensalamento", label: "PCP", responsavel: "PCP", colorClass: "step-pcp" },
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

export const ALLOWED_DOMAINS = [
  "sc.senai.br",
  "edu.sc.senai.br",
  "fiesc.com.br",
  "sesisc.org.br",
  "edu.sesisc.org.br",
];

// Subdivisões disponíveis apenas para SESI Saúde
export type SubdivisaoSaude = "Promoção de Saúde" | "Saúde Assistencial" | "SST" | "NRs";

export const SUBDIVISIONS_BY_UNIT: Record<Entidade, string[]> = {
  "SESI": ["Contraturno", "ACE"],
  "SENAI": ["Cursos Técnicos", "Qualificação Profissional", "Aprendizagem"],
  "SESI Saúde": ["Promoção de Saúde", "Saúde Assistencial", "SST", "NRs"],
  "REDE": ["Demais Serviços Educação", "IEL", "Inovação", "Profissional", "Superior", "Tecnologia"],
};

// Unidades de atendimento SENAI
export const UNIDADES_ATENDIMENTO_SENAI = ["Lages", "Otacílio Costa", "Correia Pinto"] as const;
export type UnidadeAtendimentoSenai = typeof UNIDADES_ATENDIMENTO_SENAI[number];

// Turnos de trabalho
export const TURNOS = [
  { key: "turno_manha", label: "Manhã", horario: "08h00–12h00", start: 8, end: 12 },
  { key: "turno_tarde", label: "Tarde", horario: "13h00–18h00", start: 13, end: 18 },
  { key: "turno_noite", label: "Noite", horario: "18h00–22h30", start: 18, endMinutes: 22 * 60 + 30 },
] as const;

export const SUBDIVISAO_COLORS: Record<string, string> = {
  "Promoção de Saúde": "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200",
  "Saúde Assistencial": "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200",
  "SST": "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200",
  "NRs": "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200",
  "Contraturno": "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/40 dark:text-sky-200",
  "ACE": "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200",
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
