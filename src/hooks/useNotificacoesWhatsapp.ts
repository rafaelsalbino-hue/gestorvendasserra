import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NotificacaoWhatsapp = {
  id: string;
  contrato_id: string | null;
  numero_destinatario: string | null;
  destinatario_nome: string | null;
  etapa_destino: string | null;
  mensagem: string | null;
  status: string | null;
  erro: string | null;
  created_at: string;
};

export function useNotificacoesWhatsapp(contratoId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["notificacoes-whatsapp", contratoId],
    enabled: enabled && !!contratoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes_whatsapp" as any)
        .select("*")
        .eq("contrato_id", contratoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NotificacaoWhatsapp[];
    },
    staleTime: 1000 * 30,
  });
}