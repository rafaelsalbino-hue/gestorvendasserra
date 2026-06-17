import { supabase } from "@/integrations/supabase/client";

/**
 * Dispara a edge function `enviar-whatsapp` de forma assíncrona (fire-and-forget).
 * Nunca bloqueia o fluxo principal nem propaga erros.
 */
export async function notifyEtapaWhatsapp(params: {
  contratoId: string;
  novaEtapa: string;
  etapaAnterior?: string | null;
  origem?: "automatico" | "manual";
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let nome: string | null = null;
    if (user?.id) {
      const { data: perfil } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user.id)
        .maybeSingle();
      nome = perfil?.nome ?? null;
    }
    return await supabase.functions
      .invoke("enviar-whatsapp", {
        body: {
          contrato_id: params.contratoId,
          etapa_destino: params.novaEtapa,
          etapa_anterior: params.etapaAnterior ?? null,
          usuario_atual_nome: nome || user?.email || "Sistema",
          origem: params.origem ?? "automatico",
        },
      })
      .catch((err) => {
        console.warn("Notificação WhatsApp não enviada:", err);
        return { data: null, error: err };
      });
  } catch (err) {
    console.warn("Notificação WhatsApp não enviada:", err);
    return { data: null, error: err };
  }
}