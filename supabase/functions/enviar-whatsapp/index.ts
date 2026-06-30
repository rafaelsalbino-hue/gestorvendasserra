import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Filtro de entidade aplicado SOMENTE a cargos cujo nome depende da entidade
// (Supervisores SESI/SENAI e Backoffice por entidade). Demais cargos não são filtrados.
function funcaoCompativelComEntidade(funcao: string, entidade: string | null | undefined): boolean {
  const ent = (entidade ?? "").trim();
  const isSenaiContrato = ent === "SENAI";
  const isSesiContrato  = ent === "SESI" || ent === "SESI Saúde" || ent === "SESI Educação";

  if (funcao.startsWith("Supervisor SENAI") || funcao === "Backoffice SENAI") return isSenaiContrato;
  if (funcao.startsWith("Supervisor SESI")  || funcao.startsWith("Backoffice SESI")) {
    // Se for backoffice específico, exige match exato com a entidade
    if (funcao === "Backoffice SESI Saúde")    return ent === "SESI Saúde" || ent === "SESI";
    if (funcao === "Backoffice SESI Educação") return ent === "SESI Educação";
    return isSesiContrato;
  }
  return true;
}

function mask(s: string): string {
  if (!s) return "";
  return s.length <= 6 ? s.slice(0, 2) + "***" : s.slice(0, 6) + "...";
}

function formatarNumero(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) return digits;
  if (digits.length === 11) return `55${digits}`;
  if (digits.length === 10) return `55${digits}`;
  if (digits.length === 9)  return `5547${digits}`;
  return null;
}

async function isDuplicado(
  supabase: any,
  contratoId: string,
  etapaDestino: string,
  numero: string,
): Promise<boolean> {
  const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("notificacoes_whatsapp")
    .select("id")
    .eq("contrato_id", contratoId)
    .eq("etapa_destino", etapaDestino)
    .eq("numero_destinatario", numero)
    .eq("status", "enviado")
    .gte("created_at", cincoMinAtras)
    .limit(1);
  return (data ?? []).length > 0;
}

async function enviarZAPI(
  numero: string,
  mensagem: string,
): Promise<{ ok: boolean; erro?: string }> {
  const instanceId  = Deno.env.get("ZAPI_INSTANCE_ID");
  const token       = Deno.env.get("ZAPI_TOKEN");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");

  if (!instanceId || !token) {
    return { ok: false, erro: "Variáveis ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configuradas" };
  }

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
    console.log("[Z-API] HTTP", res.status, "body:", JSON.stringify(body).slice(0, 500));

    if (!res.ok) {
      return { ok: false, erro: `Z-API HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}` };
    }
    if (body?.zaapId || body?.messageId || body?.id) {
      return { ok: true };
    }
    return { ok: false, erro: `Resposta inesperada Z-API: ${JSON.stringify(body).slice(0, 300)}` };
  } catch (err: any) {
    return { ok: false, erro: `Erro de rede Z-API: ${err?.message ?? String(err)}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // GET ?action=status — diagnóstico Z-API (mantido para o painel existente)
  const reqUrl = new URL(req.url);
  if (req.method === "GET" && reqUrl.searchParams.get("action") === "status") {
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID") ?? "";
    const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN") ?? "";
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN") ?? "";
    const secretsLoaded = {
      ZAPI_INSTANCE_ID: !!ZAPI_INSTANCE_ID,
      ZAPI_TOKEN: !!ZAPI_TOKEN,
      ZAPI_CLIENT_TOKEN: !!ZAPI_CLIENT_TOKEN,
    };
    const secretsPreview = {
      ZAPI_INSTANCE_ID: mask(ZAPI_INSTANCE_ID),
      ZAPI_TOKEN: mask(ZAPI_TOKEN),
      ZAPI_CLIENT_TOKEN: mask(ZAPI_CLIENT_TOKEN),
    };
    let instanceStatus: unknown = null;
    let statusHttp = 0;
    let statusError: string | null = null;
    if (ZAPI_INSTANCE_ID && ZAPI_TOKEN) {
      try {
        const statusUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/status`;
        const headers: Record<string, string> = {};
        if (ZAPI_CLIENT_TOKEN) headers["Client-Token"] = ZAPI_CLIENT_TOKEN;
        const r = await fetch(statusUrl, { headers });
        statusHttp = r.status;
        instanceStatus = await r.json().catch(() => ({}));
      } catch (err) {
        statusError = String(err).slice(0, 500);
      }
    } else {
      statusError = "Secrets ZAPI_INSTANCE_ID/ZAPI_TOKEN ausentes";
    }
    return new Response(
      JSON.stringify({ ok: true, secretsLoaded, secretsPreview, httpStatus: statusHttp, instanceStatus, statusError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Body JSON inválido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Health check — verifica variáveis de ambiente sem expor valores
  if (body?.action === "health_check") {
    return new Response(
      JSON.stringify({
        zapi_instance_id: !!Deno.env.get("ZAPI_INSTANCE_ID"),
        zapi_token: !!Deno.env.get("ZAPI_TOKEN"),
        zapi_client_token: !!Deno.env.get("ZAPI_CLIENT_TOKEN"),
        supabase_url: !!Deno.env.get("SUPABASE_URL"),
        service_role_key: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        previews: {
          ZAPI_INSTANCE_ID: mask(Deno.env.get("ZAPI_INSTANCE_ID") ?? ""),
          ZAPI_TOKEN: mask(Deno.env.get("ZAPI_TOKEN") ?? ""),
          ZAPI_CLIENT_TOKEN: mask(Deno.env.get("ZAPI_CLIENT_TOKEN") ?? ""),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const {
    contrato_id,
    etapa_destino,
    etapa_anterior = null,
    usuario_atual_nome = "Sistema",
    origem = "automatico",
  } = body;

  if (!contrato_id || !etapa_destino) {
    return new Response(
      JSON.stringify({ error: "contrato_id e etapa_destino são obrigatórios" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: contrato, error: contratoErr } = await supabase
    .from("contratos")
    .select("id, cliente, entidade, valor, agente_pj_id, etapa_atual")
    .eq("id", contrato_id)
    .maybeSingle();

  if (contratoErr || !contrato) {
    return new Response(
      JSON.stringify({ error: `Contrato não encontrado: ${contratoErr?.message}` }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 1) Buscar cargos habilitados para esta etapa+canal na matriz de permissões
  const entidadePerm =
    contrato.entidade === "SESI" ? "SESI Educação" :
    contrato.entidade === "SENAI" ? "SENAI" :
    contrato.entidade === "SESI Saúde" ? "SESI Saúde" :
    (contrato.entidade as string);

  const { data: perms, error: permsErr } = await supabase
    .from("notificacao_permissoes")
    .select("funcao")
    .eq("etapa", etapa_destino)
    .eq("canal", "whatsapp")
    .eq("entidade", entidadePerm)
    .eq("ativo", true);

  if (permsErr) {
    return new Response(
      JSON.stringify({ error: `Erro ao ler permissões: ${permsErr.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const funcoesHabilitadas = Array.from(new Set((perms ?? []).map((p: any) => p.funcao as string)))
    .filter((f) => funcaoCompativelComEntidade(f, contrato.entidade));

  // "Agente de Mercado PJ" é tratado separadamente: só notifica o agente do contrato
  const agentePjHabilitado = funcoesHabilitadas.includes("Agente de Mercado PJ");
  const funcoesParaBuscarBroad = funcoesHabilitadas.filter((f) => f !== "Agente de Mercado PJ");

  let destinatarios: any[] = [];
  if (funcoesParaBuscarBroad.length > 0) {
    const { data, error: destErr } = await supabase
      .from("responsaveis")
      .select("id, nome, whatsapp, funcao")
      .in("funcao", funcoesParaBuscarBroad)
      .eq("ativo", true)
      .not("whatsapp", "is", null)
      .neq("whatsapp", "");

    if (destErr) {
      return new Response(
        JSON.stringify({ error: `Erro ao buscar destinatários: ${destErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    destinatarios = data ?? [];
  }

  let agente: any = null;
  if (contrato.agente_pj_id && agentePjHabilitado) {
    const { data } = await supabase
      .from("responsaveis")
      .select("id, nome, whatsapp, funcao")
      .eq("id", contrato.agente_pj_id)
      .eq("ativo", true)
      .not("whatsapp", "is", null)
      .neq("whatsapp", "")
      .maybeSingle();
    agente = data;
  }

  const todosDestinatarios = [...(destinatarios ?? [])];
  if (agente && !todosDestinatarios.find((d: any) => d.id === agente.id)) {
    todosDestinatarios.push(agente);
  }

  if (todosDestinatarios.length === 0) {
    await supabase.from("notificacoes_whatsapp").insert({
      contrato_id,
      etapa_destino,
      destinatario_nome: "NENHUM",
      numero_destinatario: null,
      mensagem: null,
      status: "sem_destinatario",
      erro: `Etapa "${etapa_destino}" / entidade "${contrato.entidade}" — cargos habilitados: ${funcoesHabilitadas.join(", ") || "(nenhum)"} — nenhum responsável ativo com WhatsApp encontrado`,
      origem,
    });

    return new Response(
      JSON.stringify({
        warning: `Nenhum destinatário para etapa "${etapa_destino}" / entidade "${contrato.entidade}". Cargos habilitados: ${funcoesHabilitadas.join(", ") || "(nenhum — configure no painel Notificações por cargo)"}`,
        resultados: [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const etapaLabel: Record<string, string> = {
    visita: "Visita",
    proposta: "Proposta/CRM",
    supervisor: "Supervisor",
    rpc: "RPC",
    execucao: "Execução",
    matricula: "Matrícula",
    ensalamento: "Ensalamento",
    faturamento: "Faturamento",
    finalizado: "Finalizado",
  };

  const etapaAnteriorLabel = etapa_anterior ? etapaLabel[etapa_anterior] ?? etapa_anterior : null;
  const etapaDestinoLabel  = etapaLabel[etapa_destino] ?? etapa_destino;
  const valorFormatado = contrato.valor
    ? `R$ ${Number(contrato.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "";

  const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://gestorvendasserra.lovable.app";
  const linkProcesso = `${APP_URL.replace(/\/$/, "")}/contratos?highlight=${contrato.id}`;

  const mensagem = [
    `📋 *Atualização de Contrato — ${contrato.entidade}*`,
    ``,
    `Cliente: *${contrato.cliente}*`,
    valorFormatado ? `Valor: *${valorFormatado}*` : null,
    ``,
    etapaAnteriorLabel
      ? `Etapa: ${etapaAnteriorLabel} → *${etapaDestinoLabel}*`
      : `Etapa atual: *${etapaDestinoLabel}*`,
    ``,
    `Movimentado por: ${usuario_atual_nome}`,
    ``,
    `🔗 Acessar processo: ${linkProcesso}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const resultados: any[] = [];

  for (const dest of todosDestinatarios) {
    const numeroFormatado = formatarNumero(dest.whatsapp ?? "");

    if (!numeroFormatado) {
      const log = {
        contrato_id,
        etapa_destino,
        destinatario_nome: dest.nome,
        numero_destinatario: dest.whatsapp,
        mensagem,
        status: "falhou",
        erro: `Número inválido ou não formatável: "${dest.whatsapp}"`,
        origem,
      };
      await supabase.from("notificacoes_whatsapp").insert(log);
      resultados.push({ destinatario: dest.nome, status: "falhou", erro: log.erro });
      continue;
    }

    const duplicado = await isDuplicado(supabase, contrato_id, etapa_destino, numeroFormatado);
    if (duplicado) {
      resultados.push({
        destinatario: dest.nome,
        status: "duplicado",
        erro: "Mensagem já enviada nos últimos 5 minutos",
      });
      continue;
    }

    const { ok, erro } = await enviarZAPI(numeroFormatado, mensagem);

    const logEntry = {
      contrato_id,
      etapa_destino,
      destinatario_nome: dest.nome,
      numero_destinatario: numeroFormatado,
      mensagem,
      status: ok ? "enviado" : "falhou",
      erro: ok ? null : erro,
      origem,
    };
    await supabase.from("notificacoes_whatsapp").insert(logEntry);

    resultados.push({
      destinatario: dest.nome,
      numero: numeroFormatado,
      status: logEntry.status,
      erro: logEntry.erro,
    });
  }

  return new Response(
    JSON.stringify({ resultados }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});