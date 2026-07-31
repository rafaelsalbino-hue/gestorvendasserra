import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Dispara a edge function `enviar-whatsapp` de forma assíncrona (fire-and-forget).
 * Nunca bloqueia o fluxo principal nem propaga erros.
 */
export async function notifyEtapaWhatsapp(params: {
  contratoId: string;
  novaEtapa: string;
  etapaAnterior?: string | null;
  origem?: "automatico" | "manual";
  silent?: boolean;
  rota?: "padrao" | "crm_direto";
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
    const result = await supabase.functions
      .invoke("enviar-whatsapp", {
        body: {
          contrato_id: params.contratoId,
          etapa_destino: params.novaEtapa,
          etapa_anterior: params.etapaAnterior ?? null,
          usuario_atual_nome: nome || user?.email || "Sistema",
          origem: params.origem ?? "automatico",
          rota: params.rota ?? "padrao",
        },
      })
      .catch((err) => {
        console.warn("Notificação WhatsApp não enviada:", err);
        return { data: null, error: err };
      });

    if (!params.silent) {
      const data: any = (result as any)?.data;
      const error: any = (result as any)?.error;
      const resultados: any[] = Array.isArray(data?.resultados) ? data.resultados : [];
      const enviados = resultados.filter((r) => r.status === "enviado").length;
      const falhou = resultados.filter((r) => r.status === "falhou").length;
      const duplicado = resultados.filter((r) => r.status === "duplicado").length;
      const agendado = resultados.filter((r) => r.status === "agendado").length;

      if (error) {
        console.error("[WhatsApp] erro ao invocar enviar-whatsapp:", error, params);
        toast.error("WhatsApp: erro de conexão", { description: String(error.message ?? error) });
      } else if (data?.error) {
        console.error("[WhatsApp] erro retornado pela função:", data.error, params);
        toast.error("WhatsApp não enviado", { description: String(data.error).slice(0, 200) });
      } else if (data?.warning) {
        console.warn("[WhatsApp] aviso:", data.warning, params);
        toast.warning(`WhatsApp: ${data.warning}`);
      } else if (resultados.length === 0) {
        console.warn("[WhatsApp] nenhum destinatário retornado", params);
        toast.warning("WhatsApp: nenhum destinatário válido");
      } else if (falhou === 0 && enviados > 0) {
        toast.success(`WhatsApp enviado para ${enviados} responsável(is)` + (duplicado ? ` (${duplicado} duplicados ignorados)` : ""));
      } else if (falhou === 0 && enviados === 0 && agendado > 0) {
        toast.info(`WhatsApp agendado para ${agendado} responsável(is) — fora do turno de trabalho`);
      } else if (enviados > 0) {
        toast.warning(`WhatsApp: ${enviados} enviado(s), ${falhou} falhou(ram)`, {
          description: "Veja o console para detalhes",
        });
        console.warn("[WhatsApp] resultados:", resultados);
      } else {
        toast.error(`WhatsApp: ${falhou} falha(s) no envio`, {
          description: resultados[0]?.erro?.slice(0, 200) ?? "Veja o console",
        });
        console.error("[WhatsApp] resultados:", resultados);
      }
    }
    return result;
  } catch (err) {
    console.warn("Notificação WhatsApp não enviada:", err);
    return { data: null, error: err };
  }
}