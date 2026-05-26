import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ArquivoCategoria = "chamado_faturamento" | "planilha_alunos";

const BUCKET = "contratos-arquivos";

export function useContratoArquivos(contratoId: string | undefined, categoria: ArquivoCategoria) {
  return useQuery({
    queryKey: ["contrato_arquivos", contratoId, categoria],
    queryFn: async () => {
      if (!contratoId) return [] as any[];
      const { data, error } = await supabase
        .from("contrato_arquivos" as any)
        .select("*")
        .eq("contrato_id", contratoId)
        .eq("categoria", categoria)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!contratoId,
  });
}

export function useUploadArquivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contratoId,
      categoria,
      file,
      uploaderNome,
    }: {
      contratoId: string;
      categoria: ArquivoCategoria;
      file: File;
      uploaderNome: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const uniqueId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const path = `${contratoId}/${categoria}/${uniqueId}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from("contrato_arquivos" as any)
        .insert({
          contrato_id: contratoId,
          categoria,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
          uploaded_by: user.id,
          uploader_nome: uploaderNome,
        } as any)
        .select()
        .single();
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["contrato_arquivos", vars.contratoId, vars.categoria] }),
  });
}

export function useDeleteArquivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arquivo: { id: string; storage_path: string; contrato_id: string; categoria: ArquivoCategoria }) => {
      await supabase.storage.from(BUCKET).remove([arquivo.storage_path]);
      const { error } = await supabase.from("contrato_arquivos" as any).delete().eq("id", arquivo.id);
      if (error) throw error;
      return arquivo;
    },
    onSuccess: (arquivo) =>
      qc.invalidateQueries({ queryKey: ["contrato_arquivos", arquivo.contrato_id, arquivo.categoria] }),
  });
}

export async function getArquivoSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}