import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Notificacao {
  id: string;
  user_id: string;
  contrato_id: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida_at: string | null;
  created_at: string;
}

export function useNotificacoes() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notificacoes"],
    queryFn: async (): Promise<Notificacao[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return [];
      const { data, error } = await supabase
        .from("notificacoes" as any)
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.warn("Erro ao carregar notificações:", error.message);
        return [];
      }
      return (data ?? []) as unknown as Notificacao[];
    },
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    let cancelled = false;
    let channel: any;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;
      channel = supabase
        .channel(`notificacoes-${session.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notificacoes", filter: `user_id=eq.${session.user.id}` },
          () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

export function useMarcarNotificacaoLida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes" as any)
        .update({ lida_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });
}

export function useMarcarTodasLidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase
        .from("notificacoes" as any)
        .update({ lida_at: new Date().toISOString() })
        .eq("user_id", session.user.id)
        .is("lida_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });
}