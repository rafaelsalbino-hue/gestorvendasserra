import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SaldoEspecial = {
  total: number;
  faturado: number;
  saldo: number;
  pctFaturado: number;
};

export type SaldoEspeciaisResult = {
  totalSaldo: number;
  totalContratos: number;
  byContrato: Map<string, SaldoEspecial>;
};

/**
 * Agrega saldo de contratos especiais ativos (não excluídos / não finalizados).
 * Faz uma única query por contratos especiais + uma para faturamentos parciais.
 * Resultado é memoizado pelo React Query (deduplicado entre componentes).
 */
export function useSaldoEspeciais() {
  return useQuery<SaldoEspeciaisResult>({
    queryKey: ["saldo-especiais"],
    queryFn: async () => {
      const empty: SaldoEspeciaisResult = {
        totalSaldo: 0,
        totalContratos: 0,
        byContrato: new Map(),
      };
      const { data: contratos, error } = await supabase
        .from("contratos")
        .select("id, valor_total_contrato")
        .eq("contrato_especial", true)
        .is("deleted_at", null)
        .is("finalized_at", null);
      if (error) throw error;
      if (!contratos || contratos.length === 0) return empty;

      const ids = contratos.map((c: any) => c.id);
      const { data: parciais } = await supabase
        .from("faturamentos_parciais")
        .select("contrato_id, valor")
        .in("contrato_id", ids);

      const sumByContrato = new Map<string, number>();
      (parciais ?? []).forEach((p: any) => {
        sumByContrato.set(
          p.contrato_id,
          (sumByContrato.get(p.contrato_id) ?? 0) + Number(p.valor || 0),
        );
      });

      const byContrato = new Map<string, SaldoEspecial>();
      let totalSaldo = 0;
      for (const c of contratos as any[]) {
        const total = Number(c.valor_total_contrato || 0);
        const faturado = sumByContrato.get(c.id) ?? 0;
        const saldo = Math.max(0, total - faturado);
        const pctFaturado = total > 0 ? Math.min(100, (faturado / total) * 100) : 0;
        byContrato.set(c.id, { total, faturado, saldo, pctFaturado });
        totalSaldo += saldo;
      }
      return { totalSaldo, totalContratos: contratos.length, byContrato };
    },
    staleTime: 60_000,
  });
}