import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function enviarZAPI(numero: string, mensagem: string): Promise<{ ok: boolean; erro?: string }> {
  const instanceId  = Deno.env.get("ZAPI_INSTANCE_ID");
  const token       = Deno.env.get("ZAPI_TOKEN");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");
  if (!instanceId || !token) return { ok: false, erro: "ZAPI secrets ausentes" };
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(clientToken ? { "Client-Token": clientToken } : {}),
      },
      body: JSON.stringify({ phone: numero, message: mensagem }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, erro: `Z-API HTTP ${res.status}` };
    if (body?.zaapId || body?.messageId || body?.id) return { ok: true };
    return { ok: false, erro: `Resposta inesperada: ${JSON.stringify(body).slice(0, 200)}` };
  } catch (err: any) {
    return { ok: false, erro: `Erro de rede: ${err?.message ?? String(err)}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const nowIso = new Date().toISOString();
  const { data: pendentes, error } = await supabase
    .from("notificacoes_whatsapp")
    .select("*")
    .eq("status", "agendado")
    .lte("enviar_a", nowIso)
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resultados: any[] = [];
  for (const n of (pendentes ?? []) as any[]) {
    if (!n.numero_destinatario || !n.mensagem) {
      await supabase.from("notificacoes_whatsapp")
        .update({ status: "falhou", erro: "sem número ou mensagem" }).eq("id", n.id);
      resultados.push({ id: n.id, status: "falhou" });
      continue;
    }
    const { ok, erro } = await enviarZAPI(n.numero_destinatario, n.mensagem);
    await supabase.from("notificacoes_whatsapp")
      .update({ status: ok ? "enviado" : "falhou", erro: ok ? null : erro })
      .eq("id", n.id);
    resultados.push({ id: n.id, status: ok ? "enviado" : "falhou" });
  }

  return new Response(JSON.stringify({ processados: resultados.length, resultados }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});