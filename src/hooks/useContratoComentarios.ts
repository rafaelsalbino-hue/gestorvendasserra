import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useContratoComentarios(contratoId: string | undefined) {
  return useQuery({
    queryKey: ["contrato_comentarios", contratoId],
    queryFn: async () => {
      if (!contratoId) return [];
      const { data, error } = await supabase
        .from("contrato_comentarios")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!contratoId,
  });
}

export function useAddComentario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comment: { contrato_id: string; texto: string; autor_nome: string; autor_funcao: string }) => {
      const { data, error } = await supabase.from("contrato_comentarios").insert(comment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["contrato_comentarios", vars.contrato_id] }),
  });
}
