import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;
type ContratoInsert = TablesInsert<"contratos">;
type ContratoUpdate = TablesUpdate<"contratos">;

export function useContratos(entidade?: "SESI" | "SENAI" | "SESI Saúde") {
  const qc = useQueryClient();
  const query = useQuery({
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

  // REALTIME: invalida o cache quando outro usuário cria/edita/exclui contratos
  // Usa um nome de canal único para evitar conflitos quando o hook é montado em múltiplas páginas
  useEffect(() => {
    const channelName = `contratos-realtime-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contratos" },
        () => {
          qc.invalidateQueries({ queryKey: ["contratos"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

export function useAddContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: ContratoInsert) => {
      const { data, error } = await supabase.from("contratos").insert(c).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (novo) => {
      // Atualização otimista: insere o novo contrato no cache sem refetch
      qc.setQueriesData<Contrato[]>({ queryKey: ["contratos"] }, (old) => {
        if (!old) return [novo as Contrato];
        return [novo as Contrato, ...old];
      });
      // Invalida em background (não bloqueia o isPending do botão)
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "none" });
    },
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
    onSuccess: (atualizado) => {
      qc.setQueriesData<Contrato[]>({ queryKey: ["contratos"] }, (old) => {
        if (!old) return old;
        return old.map((c) => (c.id === (atualizado as Contrato).id ? (atualizado as Contrato) : c));
      });
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "none" });
    },
  });
}

export function useDeleteContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contratos").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.setQueriesData<Contrato[]>({ queryKey: ["contratos"] }, (old) => {
        if (!old) return old;
        return old.filter((c) => c.id !== id);
      });
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "none" });
    },
  });
}
