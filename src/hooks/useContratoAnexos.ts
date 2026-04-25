import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useContratoAnexos(contratoId: string | undefined) {
  return useQuery({
    queryKey: ["contrato_anexos", contratoId],
    queryFn: async () => {
      if (!contratoId) return [];
      const { data, error } = await supabase
        .from("contrato_anexos")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contratoId,
  });
}

export function useUploadAnexo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contratoId,
      file,
      uploaderNome,
    }: {
      contratoId: string;
      file: File;
      uploaderNome: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Sanitiza nome e usa UUID para evitar colisões em uploads simultâneos
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const uniqueId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const path = `${contratoId}/${uniqueId}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("contratos-anexos")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from("contrato_anexos")
        .insert({
          contrato_id: contratoId,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
          uploaded_by: user.id,
          uploader_nome: uploaderNome,
        })
        .select()
        .single();
      if (error) {
        // rollback do storage
        await supabase.storage.from("contratos-anexos").remove([path]);
        throw error;
      }
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["contrato_anexos", vars.contratoId] }),
  });
}

export function useDeleteAnexo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (anexo: { id: string; storage_path: string; contrato_id: string }) => {
      await supabase.storage.from("contratos-anexos").remove([anexo.storage_path]);
      const { error } = await supabase.from("contrato_anexos").delete().eq("id", anexo.id);
      if (error) throw error;
      return anexo;
    },
    onSuccess: (anexo) =>
      qc.invalidateQueries({ queryKey: ["contrato_anexos", anexo.contrato_id] }),
  });
}

export async function getAnexoSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from("contratos-anexos")
    .createSignedUrl(storagePath, 60 * 5); // 5 minutos
  if (error) throw error;
  return data.signedUrl;
}