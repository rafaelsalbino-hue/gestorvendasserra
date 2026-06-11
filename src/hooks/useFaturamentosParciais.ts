import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FaturamentoParcial {
  id: string;
  contrato_id: string;
  valor: number;
  descricao: string;
  data_faturamento: string;
  numero_nota: string;
  criado_por: string | null;
  criado_por_nome: string;
  created_at: string;
  updated_at: string;
}

export function useFaturamentosParciais(contratoId: string | undefined) {
  return useQuery({
    queryKey: ["faturamentos_parciais", contratoId],
    queryFn: async () => {
      if (!contratoId) return [] as FaturamentoParcial[];
      const { data, error } = await supabase
        .from("faturamentos_parciais" as any)
        .select("*")
        .eq("contrato_id", contratoId)
        .order("data_faturamento", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FaturamentoParcial[];
    },
    enabled: !!contratoId,
  });
}

export function useAddFaturamentoParcial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contrato_id: string;
      valor: number;
      descricao?: string;
      data_faturamento?: string;
      numero_nota?: string;
      criado_por_nome: string;
    }) => {
      if (!input.contrato_id) throw new Error("Contrato ausente.");
      if (!input.valor || input.valor <= 0) throw new Error("Informe um valor maior que zero.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");
      const payload: any = {
        contrato_id: input.contrato_id,
        valor: input.valor,
        descricao: input.descricao?.trim() ?? "",
        data_faturamento: input.data_faturamento || new Date().toISOString().slice(0, 10),
        numero_nota: input.numero_nota?.trim() ?? "",
        criado_por: user.id,
        criado_por_nome: input.criado_por_nome || "Usuário",
      };
      const { data, error } = await supabase
        .from("faturamentos_parciais" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FaturamentoParcial;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["faturamentos_parciais", vars.contrato_id] });
      qc.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Faturamento parcial registrado");
    },
    onError: (err: any) => {
      toast.error("Não foi possível registrar o faturamento", {
        description: err?.message || "Tente novamente em instantes.",
      });
    },
  });
}

export function useDeleteFaturamentoParcial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; contrato_id: string }) => {
      const { error } = await supabase
        .from("faturamentos_parciais" as any)
        .delete()
        .eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (input) => {
      qc.invalidateQueries({ queryKey: ["faturamentos_parciais", input.contrato_id] });
      toast.success("Faturamento excluído");
    },
    onError: (err: any) => {
      toast.error("Não foi possível excluir", { description: err?.message });
    },
  });
}
