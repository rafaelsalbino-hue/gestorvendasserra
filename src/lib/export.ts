import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

export function exportContratosToPdf(contratos: Contrato[], filename = "contratos.pdf", titulo = "Contratos") {
  const etapaLabel = (id: string) => ETAPAS.find((e) => e.id === id)?.label || id;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(14);
  doc.text(titulo, 40, 32);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")} — ${contratos.length} registro(s)`,
    40,
    48,
  );

  const head = [[
    "Entidade", "Cliente", "CNPJ", "Serviço",
    "Valor (R$)", "Etapa", "Status Proposta", "Status RPC", "Faturamento", "Criado em",
  ]];
  const body = contratos.map((c) => [
    c.entidade,
    c.cliente,
    c.cnpj || "—",
    c.servico_produto || "—",
    Number(c.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    etapaLabel(c.etapa_atual),
    c.status_proposta_crm || "—",
    c.status_rpc || "—",
    c.execucao_faturamento || "—",
    new Date(c.created_at).toLocaleDateString("pt-BR"),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 60,
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });

  doc.save(filename);
}
