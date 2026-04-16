import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;
type ContratoInsert = TablesInsert<"contratos">;
type ContratoUpdate = TablesUpdate<"contratos">;

export function useContratos(entidade?: "SESI" | "SENAI" | "SESI Saúde") {
  return useQuery({
    queryKey: ["contratos", entidade],
    queryFn: async () => {
      let q = supabase.from("contratos").select("*").order("created_at", { ascending: false });
      if (entidade) q = q.eq("entidade", entidade);
      const { data, error } = await q;
      if (error) throw error;
      return data as Contrato[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useAddContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: ContratoInsert) => {
      const { data, error } = await supabase.from("contratos").insert(c).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contratos"] }),
  });
}

export function useUpdateContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ContratoUpdate & { id: string }) => {
      const { data, error } = await supabase.from("contratos").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contratos"] }),
  });
}

export function useDeleteContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contratos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contratos"] }),
  });
}
