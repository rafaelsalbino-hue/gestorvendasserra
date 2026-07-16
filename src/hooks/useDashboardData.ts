import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PeriodoDashboard = "30d" | "60d" | "90d" | "mes" | "ano";

function getInicioPeriodo(p: PeriodoDashboard): Date {
  const now = new Date();
  if (p === "mes") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === "ano") return new Date(now.getFullYear(), 0, 1);
  const dias = p === "30d" ? 30 : p === "60d" ? 60 : 90;
  const d = new Date(now);
  d.setDate(d.getDate() - dias);
  return d;
}

export interface ContratoDash {
  id: string;
  cliente: string;
  entidade: string;
  etapa_atual: string;
  valor: number | null;
  valor_total_contrato: number | null;
  created_at: string;
  etapa_updated_at: string | null;
  finalized_at: string | null;
  deleted_at: string | null;
  subdivisao: string | null;
  unidade_atendimento: string | null;
}

export function useDashboardData(periodo: PeriodoDashboard) {
  return useQuery({
    queryKey: ["dashboard-data", periodo],
    queryFn: async () => {
      const inicio = getInicioPeriodo(periodo);
      const { data, error } = await supabase
        .from("contratos")
        .select(
          "id,cliente,entidade,etapa_atual,valor,valor_total_contrato,created_at,etapa_updated_at,finalized_at,deleted_at,subdivisao,unidade_atendimento"
        );
      if (error) throw error;
      const contratos = (data || []) as unknown as ContratoDash[];
      return { contratos, inicioPeriodo: inicio.toISOString() };
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function formatBRLCompact(v: number): string {
  if (!Number.isFinite(v)) return "R$ 0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(0)} mil`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function formatBRLFull(v: number): string {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}