import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Responsavel = Tables<"responsaveis">;
type ResponsavelInsert = TablesInsert<"responsaveis">;

export function useResponsaveis() {
  return useQuery({
    queryKey: ["responsaveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as Responsavel[];
    },
  });
}

export function useAddResponsavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: ResponsavelInsert) => {
      const { data, error } = await supabase.from("responsaveis").insert(r).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["responsaveis"] }),
  });
}

export function useDeleteResponsavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("responsaveis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["responsaveis"] }),
  });
}
