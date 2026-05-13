import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppSession } from "@/contexts/AppSessionContext";
import type { TablesUpdate } from "@/integrations/supabase/types";

type ResponsavelUpdate = TablesUpdate<"responsaveis">;

export function useUpdateResponsavel() {
  const qc = useQueryClient();
  const { runGuarded } = useAppSession();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ResponsavelUpdate & { id: string }) => runGuarded(async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }, { operation: `responsaveis.update.${id}`, timeoutMs: 20000 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["responsaveis"] }),
  });
}
