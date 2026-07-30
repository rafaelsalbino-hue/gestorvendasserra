import { FUNCOES_GESTOR, FUNCOES_STATUS_AMPLO, type EtapaContrato } from "@/types/contracts";
import type { Tables } from "@/integrations/supabase/types";

type FuncaoResponsavel = Tables<"responsaveis">["funcao"];

export const EMPTY = "__empty__";

export const CRM_URL = "https://login.microsoftonline.com/2cf7d4d5-bd1b-4956-acf8-2995399b2168/oauth2/authorize?client_id=00000007-0000-0000-c000-000000000000&response_type=code%20id_token&scope=openid%20profile&state=OpenIdConnect.AuthenticationProperties%3DMAAAAIEpeTMuSxHxr8FgRb08lMT3Xi58qOpIvRZZ0vE0ka48uuHXR3QEhd9TAUTDwgvLjAEAAAABAAAACS5yZWRpcmVjdCNodHRwczovL2NybWZpZXNjLmNybTIuZHluYW1pY3MuY29tLw%26ReplyUrl%3DMAAAAIEpeTMuSxHxr8FgRb08lMRgdKbh7xVAYV6A3Vq26X7RVg8uv%252fEYG9Hhq40LK6r4EWh0dHBzOi8vY3BxLS1zYW1jcm1saXZlc2c2MDEuY3JtMi5keW5hbWljcy5jb20v%26RedirectTo%3DMAAAAIEpeTMuSxHxr8FgRb08lMRxY3CH9WBJtRsLZBpWxqcjfV906sB0lZP1JmBe%252fK9%252blWh0dHBzOi8vY3JtZmllc2MuY3JtMi5keW5hbWljcy5jb20v%26RedirectToForMcas%3Dhttps%253a%252f%252fcrmfiesc.crm2.dynamics.com%252f&response_mode=form_post&nonce=639118501407298283.OGFiNzc4MmUtOGYxNy00Zjk1LTg4ZDAtM2Y2ZjkxNGZhYjMwYjJhOTZmODctZTczNS00ZjAxLTk5YWQtOWRmMzQ5ZDBiNWEw&redirect_uri=https%3A%2F%2Fcpq--samcrmlivesg601.crm2.dynamics.com%2F&max_age=86400&claims=%7B%22id_token%22%3A%7B%22xms_cc%22%3A%7B%22values%22%3A%5B%22CP1%22%5D%7D%7D%7D&x-client-SKU=ID_NET472&x-client-ver=8.14.0.0";
export const SGN_URL = "https://sgn.sesisenai.org.br/login.html";

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  "Agente de Mercado PJ": ["dados_basicos", "proposta", "rpc", "execucao"],
  "Analista Financeiro": ["faturamento"],
  "Interlocutora de Faturamento": ["faturamento"],
  // Backoffices segmentados por entidade — todos com edição ampla até matrícula
  "Backoffice SESI Saúde": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula"],
  "Backoffice SESI Educação": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula"],
  "Backoffice SENAI": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula"],
  // Coordenadores — acesso total
  "Coordenador SENAI": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula", "ensalamento", "faturamento"],
  "Coordenador SESI Saúde": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula", "ensalamento", "faturamento"],
  "Coordenador SESI Expansão": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula", "ensalamento", "faturamento"],
  "Coordenador Comercial SENAI": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula", "ensalamento", "faturamento"],
  // Secretaria e PCP segmentados
  "Secretaria Escolar": ["matricula"],
  "PCP SESI": ["ensalamento"],
  "PCP SENAI": ["ensalamento"],
};

// Supervisores específicos (todos prefixados) recebem permissão de Supervisor.
export const SUPERVISOR_SECTIONS = ["dados_basicos", "proposta", "supervisor"];

export function canEditSection(funcao: FuncaoResponsavel | undefined, section: string): boolean {
  if (!funcao) return false;
  if (FUNCOES_GESTOR.includes(funcao as any)) return true;
  if (typeof funcao === "string" && funcao.startsWith("Supervisor")) {
    return SUPERVISOR_SECTIONS.includes(section);
  }
  return ROLE_PERMISSIONS[funcao]?.includes(section) ?? false;
}

// Permissão ampliada para alterar qualquer campo de status (status_*) em qualquer etapa.
export function canEditStatus(funcao: FuncaoResponsavel | undefined, section: string): boolean {
  if (!funcao) return false;
  if (FUNCOES_STATUS_AMPLO.includes(funcao as any)) return true;
  return canEditSection(funcao, section);
}

export const FIELD_LABELS: Record<string, string> = {
  cliente: "Cliente", cnpj: "CNPJ", servico_produto: "Serviço/Produto", valor: "Valor",
  crm: "CRM", etapa_atual: "Etapa Atual", dados_proposta: "Dados Proposta",
  status_proposta_crm: "Status Proposta CRM", planilha_info_gerais: "Planilha Info",
  numero_rpc: "Nº RPC", info_execucao: "Info Execução", status_rpc: "Status RPC",
  observacao_terceiro: "Observação", dados_estudantes: "Dados Estudantes",
  cadastro_estudantes: "Cadastro Estudantes", ensalamento_pcp: "Ensalamento PCP",
  abertura_chamado: "Abertura Chamado", numero_chamado: "Nº Chamado",
  execucao_faturamento: "Execução Faturamento",
};

export const ETAPA_ORDER: EtapaContrato[] = ["visita", "proposta", "supervisor", "rpc", "execucao", "matricula", "ensalamento", "faturamento"];

export function getNextEtapa(current: EtapaContrato): EtapaContrato | null {
  const idx = ETAPA_ORDER.indexOf(current);
  return idx >= 0 && idx < ETAPA_ORDER.length - 1 ? ETAPA_ORDER[idx + 1] : null;
}