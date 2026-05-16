import * as XLSX from "xlsx";
import type { Tables } from "@/integrations/supabase/types";
import { ETAPAS } from "@/types/contracts";

type Contrato = Tables<"contratos">;
type Responsavel = Tables<"responsaveis">;

export function exportContratosToXlsx(contratos: Contrato[], filename = "contratos.xlsx") {
  const etapaLabel = (id: string) => ETAPAS.find((e) => e.id === id)?.label || id;

  const data = contratos.map((c) => ({
    Entidade: c.entidade,
    Cliente: c.cliente,
    CNPJ: c.cnpj,
    "Serviço/Produto": c.servico_produto,
    "Valor (R$)": c.valor,
    CRM: c.crm,
    "Etapa Atual": etapaLabel(c.etapa_atual),
    "Dados Proposta": c.dados_proposta,
    "Status Proposta CRM": c.status_proposta_crm,
    "Nº RPC": c.numero_rpc,
    "Info Execução": c.info_execucao,
    "Status RPC": c.status_rpc,
    "Dados Estudantes": c.dados_estudantes,
    "Cadastro Estudantes": c.cadastro_estudantes,
    "Ensalamento PCP": c.ensalamento_pcp,
    "Abertura Chamado": c.abertura_chamado,
    "Nº Chamado": c.numero_chamado,
    "Execução Faturamento": c.execucao_faturamento,
    "Criado em": new Date(c.created_at).toLocaleDateString("pt-BR"),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contratos");
  XLSX.writeFile(wb, filename);
}

export function exportResponsaveisToXlsx(responsaveis: Responsavel[], filename = "responsaveis.xlsx") {
  const data = responsaveis.map((r) => ({
    Nome: r.nome,
    "E-mail": r.email,
    Função: r.funcao,
    Ativo: r.ativo ? "Sim" : "Não",
    "Criado em": new Date(r.created_at).toLocaleDateString("pt-BR"),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Responsáveis");
  XLSX.writeFile(wb, filename);
}
