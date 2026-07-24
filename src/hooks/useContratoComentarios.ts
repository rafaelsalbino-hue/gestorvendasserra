import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    mutationFn: async (comment: { contrato_id: string; texto: string; autor_nome: string; autor_funcao: string; is_system?: boolean; silent?: boolean }) => {
      if (!comment.contrato_id) throw new Error("ID do processo ausente.");
      if (!comment.texto?.trim()) throw new Error("O comentário não pode ficar em branco.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");
      const payload = {
        contrato_id: comment.contrato_id,
        texto: comment.texto.trim(),
        autor_nome: comment.autor_nome || "Usuário",
        autor_funcao: comment.autor_funcao || "",
        is_system: comment.is_system ?? false,
        autor_id: user.id,
      } as any;
      const { data, error } = await supabase.from("contrato_comentarios").insert(payload).select().single();
      if (error) {
        console.error("[contrato_comentarios] insert failed", error, payload);
        throw error;
      }
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contrato_comentarios", vars.contrato_id] });
      qc.invalidateQueries({ queryKey: ["contrato-detail", vars.contrato_id] });
      qc.invalidateQueries({ queryKey: ["contratos"] });
      if (!vars.is_system && !vars.silent) toast.success("Comentário registrado com sucesso");
    },
    onError: (err: any) => {
      toast.error("Não foi possível salvar o comentário", {
        description: err?.message || "Tente novamente em instantes.",
      });
    },
  });
}
