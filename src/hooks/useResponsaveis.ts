import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppSession } from "@/contexts/AppSessionContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Responsavel = Tables<"responsaveis">;
type ResponsavelInsert = TablesInsert<"responsaveis">;

export function useResponsaveis() {
  const { runGuarded } = useAppSession();
  return useQuery({
    queryKey: ["responsaveis"],
    queryFn: async () => runGuarded(async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as Responsavel[];
    }, { operation: "responsaveis.list", timeoutMs: 15000 }),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddResponsavel() {
  const qc = useQueryClient();
  const { runGuarded } = useAppSession();
  return useMutation({
    mutationFn: async (r: ResponsavelInsert) => runGuarded(async () => {
      const { data, error } = await supabase.from("responsaveis").insert(r).select().single();
      if (error) throw error;
      return data;
    }, { operation: "responsaveis.create", timeoutMs: 20000 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["responsaveis"] }),
  });
}

export function useDeleteResponsavel() {
  const qc = useQueryClient();
  const { runGuarded } = useAppSession();
  return useMutation({
    mutationFn: async (id: string) => runGuarded(async () => {
      const { error } = await supabase.from("responsaveis").delete().eq("id", id);
      if (error) throw error;
    }, { operation: `responsaveis.delete.${id}`, timeoutMs: 20000 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["responsaveis"] }),
  });
}
