import type { Tables } from "@/integrations/supabase/types";
import type { EtapaContrato } from "@/types/contracts";

type Contrato = Tables<"contratos">;

export interface CampoFaltante {
  campo: keyof Contrato;
  label: string;
}

/**
 * Define quais campos são obrigatórios para CONCLUIR cada etapa.
 * Usado antes de avançar para a próxima etapa ("Salvar e Seguir").
 */
const REGRAS_POR_ETAPA: Record<EtapaContrato, { campo: keyof Contrato; label: string; check?: (v: any) => boolean }[]> = {
  visita: [
    { campo: "cliente", label: "Cliente" },
  ],
  proposta: [
    { campo: "dados_proposta", label: "Dados para Proposta" },
    { campo: "status_proposta_crm", label: "Status Proposta CRM" },
  ],
  rpc: [
    { campo: "numero_rpc", label: "Nº RPC" },
  ],
  execucao: [
    { campo: "status_rpc", label: "Status RPC" },
  ],
  matricula: [
    { campo: "dados_estudantes", label: "Dados dos Estudantes" },
    { campo: "cadastro_estudantes", label: "Cadastro Estudantes / Matrícula" },
  ],
  ensalamento: [
    { campo: "ensalamento_pcp", label: "Ensalamento PCP" },
  ],
  faturamento: [
    { campo: "abertura_chamado", label: "Abertura de Chamado" },
    { campo: "execucao_faturamento", label: "Execução do Faturamento" },
  ],
};

export function validarEtapaParaAvancar(
  contrato: Partial<Contrato>,
  etapa: EtapaContrato,
): CampoFaltante[] {
  const regras = REGRAS_POR_ETAPA[etapa] || [];
  const faltantes: CampoFaltante[] = [];
  for (const r of regras) {
    const v = (contrato as any)[r.campo];
    const ok = r.check ? r.check(v) : (v != null && String(v).trim() !== "");
    if (!ok) faltantes.push({ campo: r.campo, label: r.label });
  }
  return faltantes;
}