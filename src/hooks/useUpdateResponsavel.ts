import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

type ResponsavelUpdate = TablesUpdate<"responsaveis">;

export function useUpdateResponsavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ResponsavelUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("responsaveis")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["responsaveis"] }),
  });
}
