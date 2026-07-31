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
  const isRedeContrato  = ent === "REDE";

  if (funcao.startsWith("Supervisor SENAI") || funcao === "Backoffice SENAI") return isSenaiContrato;
  if (funcao.startsWith("Supervisor SESI")  || funcao.startsWith("Backoffice SESI")) {
    // Se for backoffice específico, exige match exato com a entidade
    if (funcao === "Backoffice SESI Saúde")    return ent === "SESI Saúde" || ent === "SESI";
    if (funcao === "Backoffice SESI Educação") return ent === "SESI Educação";
    return isSesiContrato;
  }
  return true;
}

// Retorna [inicioMin, fimMin] de cada turno (horário de Brasília em minutos)
const TURNOS_MIN: Array<{ key: "turno_manha" | "turno_tarde" | "turno_noite"; start: number; end: number }> = [
  { key: "turno_manha", start:  8 * 60,          end: 12 * 60 },
  { key: "turno_tarde", start: 13 * 60,          end: 18 * 60 },
  { key: "turno_noite", start: 18 * 60,          end: 22 * 60 + 30 },
];

function nowBrtMinutes(): number {
  const now = new Date();
  // Usa Intl para minutos de Brasília sem depender de TZ do runtime
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

// Se está fora de turno, devolve a próxima data (UTC ISO) do próximo turno habilitado
function proximoInicioTurno(dest: any): string {
  const nowMin = nowBrtMinutes();
  const habilitados = TURNOS_MIN.filter((t) => dest[t.key]);
  if (habilitados.length === 0) {
    // sem turno definido → agenda para amanhã 08:00 BRT
    const d = new Date();
    d.setUTCHours(11, 0, 0, 0); // 08:00 BRT (UTC-3)
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString();
  }
  const proxHoje = habilitados.find((t) => t.start > nowMin);
  if (proxHoje) {
    const d = new Date();
    const hh = Math.floor(proxHoje.start / 60), mm = proxHoje.start % 60;
    d.setUTCHours(hh + 3, mm, 0, 0); // BRT = UTC-3
    return d.toISOString();
  }
  // Nenhum turno hoje - primeiro turno amanhã
  const p = habilitados[0];
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  const hh = Math.floor(p.start / 60), mm = p.start % 60;
  d.setUTCHours(hh + 3, mm, 0, 0);
  return d.toISOString();
}

function dentroDeTurno(dest: any): boolean {
  const nowMin = nowBrtMinutes();
  for (const t of TURNOS_MIN) {
    if (dest[t.key] && nowMin >= t.start && nowMin < t.end) return true;
  }
  return false;
}

// Retorna o rótulo específico de supervisor SENAI para roteamento por unidade+subdivisão
function supervisorSenaiEsperado(contrato: any): string | null {
  if (contrato?.entidade !== "SENAI" || !contrato?.unidade_atendimento) return null;
  const un = String(contrato.unidade_atendimento);
  const sub = String(contrato?.subdivisao ?? "");
  if (un === "Correia Pinto") return "Supervisor SENAI — Correia Pinto";
  if (un === "Otacílio Costa") return "Supervisor SENAI — Otacílio Costa";
  if (un === "Lages") {
    if (/Técnico|Tecnico/i.test(sub)) return "Supervisor SENAI — Lages Cursos Técnicos";
    if (/Qualifica/i.test(sub)) return "Supervisor SENAI — Lages Cursos de Qualificação";
  }
  return null;
}

// Retorna o rótulo específico de supervisor SESI Saúde por subdivisão
function supervisorSesiSaudeEsperado(contrato: any): string | null {
  if (contrato?.entidade !== "SESI Saúde") return null;
  const sub = String(contrato?.subdivisao ?? "");
  if (/Promo/i.test(sub)) return "Supervisor SESI Saúde — Promoção de Saúde";
  if (/Assistencial/i.test(sub)) return "Supervisor SESI Saúde — Saúde Assistencial";
  if (/SST/i.test(sub)) return "Supervisor SESI Saúde — SST";
  return null;
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
  destInfo?: { id?: string; nome?: string },
): Promise<{ ok: boolean; erro?: string }> {
  const instanceId  = Deno.env.get("ZAPI_INSTANCE_ID");
  const token       = Deno.env.get("ZAPI_TOKEN");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");

  if (!instanceId || !token) {
    console.error("[Z-API] secrets ausentes", { responsavel_id: destInfo?.id ?? null, numero });
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
      console.error("[Z-API] falha HTTP", {
        responsavel_id: destInfo?.id ?? null, responsavel: destInfo?.nome ?? null,
        numero, http: res.status, body: JSON.stringify(body).slice(0, 300),
      });
      return { ok: false, erro: `Z-API HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}` };
    }
    if (body?.zaapId || body?.messageId || body?.id) {
      return { ok: true };
    }
    console.error("[Z-API] resposta 200 sem confirmação de envio", {
      responsavel_id: destInfo?.id ?? null, responsavel: destInfo?.nome ?? null,
      numero, body: JSON.stringify(body).slice(0, 300),
    });
    return { ok: false, erro: `Resposta inesperada Z-API: ${JSON.stringify(body).slice(0, 300)}` };
  } catch (err: any) {
    console.error("[Z-API] erro de rede", {
      responsavel_id: destInfo?.id ?? null, numero, err: String(err?.message ?? err),
    });
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

  // ============================================================
  // Modo COMENTÁRIO: notifica Backoffice(s) da entidade do contrato
  // sempre que um comentário é adicionado (exceto quando o autor
  // já é o próprio Backoffice destinatário).
  // ============================================================
  if (body?.tipo === "comentario") {
    const {
      contrato_id: cId,
      autor_id = null,
      autor_nome = "Usuário",
      texto = "",
    } = body;

    if (!cId) {
      return new Response(
        JSON.stringify({ error: "contrato_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: contrato, error: contratoErr } = await supabase
      .from("contratos")
      .select("id, cliente, entidade, etapa_atual, agente_pj_id, unidade_atendimento, subdivisao")
      .eq("id", cId)
      .maybeSingle();

    if (contratoErr || !contrato) {
      return new Response(
        JSON.stringify({ error: `Contrato não encontrado: ${contratoErr?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mapa entidade → função Backoffice esperada
    const ent = String(contrato.entidade ?? "");
    const funcaoBackoffice =
      ent === "SENAI" ? "Backoffice SENAI" :
      ent === "SESI Saúde" ? "Backoffice SESI Saúde" :
      ent === "REDE" ? "Backoffice REDE" :
      "Backoffice SESI Educação"; // SESI / SESI Educação → Educação

    const selectResp =
      "id, nome, whatsapp, funcao, user_id, unidade_atendimento, turno_manha, turno_tarde, turno_noite";

    const etapaDestinoLogPre = `comentario:${contrato.etapa_atual ?? "?"}`;
    // Registra qualquer falha de busca/roteamento para não sumir silenciosamente
    const logFalha = async (erro: string, status = "falhou") => {
      console.error("[comentario→whatsapp]", erro, { contrato_id: cId, entidade: ent });
      await supabase.from("notificacoes_whatsapp").insert({
        contrato_id: cId,
        etapa_destino: etapaDestinoLogPre,
        destinatario_nome: "NENHUM",
        numero_destinatario: null,
        mensagem: null,
        status,
        erro,
        origem: "comentario",
      });
    };

    // 1) Backoffice da entidade
    const { data: backRaw, error: destErr } = await supabase
      .from("responsaveis")
      .select(selectResp)
      .eq("funcao", funcaoBackoffice)
      .eq("ativo", true)
      .not("whatsapp", "is", null)
      .neq("whatsapp", "");

    if (destErr) {
      await logFalha(`Erro ao buscar destinatários: ${destErr.message}`);
      return new Response(
        JSON.stringify({ error: `Erro ao buscar destinatários: ${destErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const candidatos: any[] = [...(backRaw ?? [])];

    // 2) Agente de Mercado PJ responsável pelo contrato
    if (contrato.agente_pj_id) {
      const { data: pj } = await supabase
        .from("responsaveis")
        .select(selectResp)
        .eq("id", contrato.agente_pj_id)
        .eq("ativo", true)
        .not("whatsapp", "is", null)
        .neq("whatsapp", "")
        .maybeSingle();
      if (pj) candidatos.push(pj);
    }

    // 3) Supervisor responsável (por unidade/subdivisão quando aplicável)
    const supLabel =
      supervisorSenaiEsperado(contrato) ?? supervisorSesiSaudeEsperado(contrato);
    let supQuery = supabase
      .from("responsaveis")
      .select(selectResp)
      .eq("ativo", true)
      .not("whatsapp", "is", null)
      .neq("whatsapp", "");
    if (supLabel) {
      supQuery = supQuery.eq("funcao", supLabel);
    } else if (ent === "SENAI") {
      supQuery = supQuery.like("funcao", "Supervisor SENAI%");
    } else if (ent === "SESI Saúde") {
      supQuery = supQuery.like("funcao", "Supervisor SESI Saúde%");
    } else {
      supQuery = supQuery.like("funcao", "Supervisor SESI Educação%");
    }
    const { data: supRaw, error: supErr } = await supQuery;
    if (supErr) await logFalha(`Erro ao buscar supervisor: ${supErr.message}`, "falhou");
    for (const s of supRaw ?? []) candidatos.push(s);

    // Deduplica por id e exclui o autor do comentário
    const vistos = new Set<string>();
    const destinatarios = candidatos.filter((r: any) => {
      if (!r) return false;
      if (autor_id && r.user_id === autor_id) return false;
      if (vistos.has(r.id)) return false;
      vistos.add(r.id);
      return true;
    });

    if (destinatarios.length === 0) {
      await logFalha(
        `Nenhum destinatário elegível para ${ent} (Backoffice "${funcaoBackoffice}" / Agente PJ / Supervisor) — verifique cadastro de WhatsApp e status ativo`,
        "sem_destinatario",
      );
      return new Response(
        JSON.stringify({
          warning: `Nenhum destinatário elegível para ${ent} (Backoffice / PJ / Supervisor).`,
          resultados: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const etapaLabelMap: Record<string, string> = {
      visita: "Visita", crm: "CRM", proposta: "Proposta", supervisor: "Supervisor",
      rpc: "RPC", execucao: "Execução", matricula: "Matrícula",
      ensalamento: "Ensalamento", faturamento: "Faturamento", finalizado: "Finalizado",
    };
    const etapaLbl = etapaLabelMap[String(contrato.etapa_atual)] ?? String(contrato.etapa_atual ?? "");

    const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://gestorvendasserra.lovable.app";
    const linkProcesso = `${APP_URL.replace(/\/$/, "")}/contratos?highlight=${contrato.id}`;

    const textoLimpo = String(texto ?? "").trim();
    const preview = textoLimpo.length > 240 ? textoLimpo.slice(0, 240) + "…" : textoLimpo;

    const mensagem = [
      `🗒️ *Novo comentário — ${ent}*`,
      ``,
      `Cliente: *${contrato.cliente}*`,
      `Etapa: *${etapaLbl}*`,
      `Autor: ${autor_nome}`,
      preview ? `` : null,
      preview ? `"${preview}"` : null,
      ``,
      `🔗 Acessar processo: ${linkProcesso}`,
    ].filter((l) => l !== null).join("\n");

    const etapaDestinoLog = `comentario:${contrato.etapa_atual ?? "?"}`;
    const resultados: any[] = [];

    for (const dest of destinatarios) {
      const numeroFormatado = formatarNumero(dest.whatsapp ?? "");
      if (!numeroFormatado) {
        console.error("[comentario→whatsapp] número inválido", {
          responsavel_id: dest.id, responsavel: dest.nome, whatsapp: dest.whatsapp,
        });
        await supabase.from("notificacoes_whatsapp").insert({
          contrato_id: cId,
          etapa_destino: etapaDestinoLog,
          destinatario_nome: dest.nome,
          numero_destinatario: dest.whatsapp,
          mensagem,
          status: "falhou",
          erro: `Número inválido: "${dest.whatsapp}"`,
          origem: "comentario",
        });
        resultados.push({ destinatario: dest.nome, status: "falhou" });
        continue;
      }

      const duplicado = await isDuplicado(supabase, cId, etapaDestinoLog, numeroFormatado);
      if (duplicado) {
        resultados.push({ destinatario: dest.nome, status: "duplicado" });
        continue;
      }

      if (!dentroDeTurno(dest)) {
        const enviarA = proximoInicioTurno(dest);
        await supabase.from("notificacoes_whatsapp").insert({
          contrato_id: cId,
          etapa_destino: etapaDestinoLog,
          destinatario_nome: dest.nome,
          numero_destinatario: numeroFormatado,
          mensagem,
          status: "agendado",
          erro: null,
          enviar_a: enviarA,
          origem: "comentario",
        });
        resultados.push({ destinatario: dest.nome, status: "agendado", enviar_a: enviarA });
        continue;
      }

      const { ok, erro } = await enviarZAPI(numeroFormatado, mensagem, { id: dest.id, nome: dest.nome });
      await supabase.from("notificacoes_whatsapp").insert({
        contrato_id: cId,
        etapa_destino: etapaDestinoLog,
        destinatario_nome: dest.nome,
        numero_destinatario: numeroFormatado,
        mensagem,
        status: ok ? "enviado" : "falhou",
        erro: ok ? null : erro,
        origem: "comentario",
      });
      resultados.push({
        destinatario: dest.nome,
        numero: numeroFormatado,
        status: ok ? "enviado" : "falhou",
        erro: ok ? null : erro,
      });
    }

    return new Response(
      JSON.stringify({ resultados }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const {
    contrato_id,
    etapa_destino,
    etapa_anterior = null,
    usuario_atual_nome = "Sistema",
    origem = "automatico",
    rota: rotaBody = null,
  } = body;

  if (!contrato_id || !etapa_destino) {
    return new Response(
      JSON.stringify({ error: "contrato_id e etapa_destino são obrigatórios" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: contrato, error: contratoErr } = await supabase
    .from("contratos")
    .select("id, cliente, entidade, valor, agente_pj_id, etapa_atual, unidade_atendimento, subdivisao")
    .eq("id", contrato_id)
    .maybeSingle();

  if (contratoErr || !contrato) {
    return new Response(
      JSON.stringify({ error: `Contrato não encontrado: ${contratoErr?.message}` }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Rota da notificação: se veio de CRM direto para Proposta (pulou Supervisor),
  // usa a configuração "crm_direto" da matriz; caso contrário "padrao".
  const rota: "padrao" | "crm_direto" =
    rotaBody === "crm_direto" || rotaBody === "padrao"
      ? (rotaBody as "padrao" | "crm_direto")
      : (etapa_anterior === "crm" && etapa_destino === "proposta" ? "crm_direto" : "padrao");

  // 1) Buscar cargos habilitados para esta etapa+canal na matriz de permissões
  const entidadePerm =
    contrato.entidade === "SESI" ? "SESI Educação" :
    contrato.entidade === "SENAI" ? "SENAI" :
    contrato.entidade === "SESI Saúde" ? "SESI Saúde" :
    contrato.entidade === "REDE" ? "REDE" :
    (contrato.entidade as string);

  const buscarPerms = async (r: string) =>
    await supabase
      .from("notificacao_permissoes")
      .select("funcao")
      .eq("etapa", etapa_destino)
      .eq("canal", "whatsapp")
      .eq("entidade", entidadePerm)
      .eq("rota", r)
      .eq("ativo", true);

  let { data: perms, error: permsErr } = await buscarPerms(rota);
  let rotaUsada = rota;

  // Fallback: se a rota específica (ex.: "crm_direto") não tem nenhuma
  // configuração na matriz, usa "padrao" em vez de não notificar ninguém.
  if (!permsErr && (perms ?? []).length === 0 && rota !== "padrao") {
    console.warn(`[etapa→whatsapp] matriz sem configuração para rota "${rota}" — usando "padrao"`, {
      contrato_id, etapa_destino, entidade: entidadePerm,
    });
    const fb = await buscarPerms("padrao");
    if (!fb.error) { perms = fb.data; rotaUsada = "padrao"; }
  }

  if (permsErr) {
    console.error("[etapa→whatsapp] erro ao ler permissões", permsErr.message, { contrato_id, etapa_destino });
    await supabase.from("notificacoes_whatsapp").insert({
      contrato_id,
      etapa_destino,
      destinatario_nome: "NENHUM",
      numero_destinatario: null,
      mensagem: null,
      status: "falhou",
      erro: `Erro ao ler matriz de permissões: ${permsErr.message}`,
      origem,
    });
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
      .select("id, nome, whatsapp, funcao, unidade_atendimento, turno_manha, turno_tarde, turno_noite")
      .in("funcao", funcoesParaBuscarBroad)
      .eq("ativo", true)
      .not("whatsapp", "is", null)
      .neq("whatsapp", "");

    if (destErr) {
      console.error("[etapa→whatsapp] erro ao buscar destinatários", destErr.message, { contrato_id, etapa_destino });
      await supabase.from("notificacoes_whatsapp").insert({
        contrato_id,
        etapa_destino,
        destinatario_nome: "NENHUM",
        numero_destinatario: null,
        mensagem: null,
        status: "falhou",
        erro: `Erro ao buscar destinatários: ${destErr.message}`,
        origem,
      });
      return new Response(
        JSON.stringify({ error: `Erro ao buscar destinatários: ${destErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    destinatarios = data ?? [];

    // Roteamento Supervisor SENAI por Unidade + Subdivisão
    const supEsperado = supervisorSenaiEsperado(contrato);
    if (contrato.entidade === "SENAI") {
      destinatarios = destinatarios.filter((r: any) => {
        if (!String(r.funcao).startsWith("Supervisor SENAI")) return true;
        // Se conseguimos determinar o supervisor esperado, exige match exato
        if (supEsperado) return r.funcao === supEsperado;
        // Caso contrário, mantém o comportamento anterior (broad)
        return true;
      });
    }

    // Roteamento Supervisor SESI Saúde por Subdivisão (Promoção / Assistencial / SST)
    const supSaudeEsperado = supervisorSesiSaudeEsperado(contrato);
    if (contrato.entidade === "SESI Saúde") {
      destinatarios = destinatarios.filter((r: any) => {
        if (!String(r.funcao).startsWith("Supervisor SESI Saúde")) return true;
        if (supSaudeEsperado) return r.funcao === supSaudeEsperado;
        return true;
      });
    }
  }

  let agente: any = null;
  if (contrato.agente_pj_id && agentePjHabilitado) {
    const { data } = await supabase
      .from("responsaveis")
      .select("id, nome, whatsapp, funcao, unidade_atendimento, turno_manha, turno_tarde, turno_noite")
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
      erro: `Etapa "${etapa_destino}" / entidade "${contrato.entidade}" / rota "${rotaUsada}" — cargos habilitados: ${funcoesHabilitadas.join(", ") || "(nenhum)"} — nenhum responsável ativo com WhatsApp encontrado`,
      origem,
    });

    return new Response(
      JSON.stringify({
        warning: `Nenhum destinatário para etapa "${etapa_destino}" / entidade "${contrato.entidade}" (rota "${rotaUsada}"). Cargos habilitados: ${funcoesHabilitadas.join(", ") || "(nenhum — configure no painel Notificações por cargo)"}`,
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
      console.error("[etapa→whatsapp] número inválido", {
        responsavel_id: dest.id, responsavel: dest.nome, whatsapp: dest.whatsapp, contrato_id, etapa_destino,
      });
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

    // Respeita turno de trabalho do responsável — se fora, enfileira para próximo turno
    if (!dentroDeTurno(dest)) {
      const enviarA = proximoInicioTurno(dest);
      await supabase.from("notificacoes_whatsapp").insert({
        contrato_id,
        etapa_destino,
        destinatario_nome: dest.nome,
        numero_destinatario: numeroFormatado,
        mensagem,
        status: "agendado",
        erro: null,
        enviar_a: enviarA,
        origem,
      });
      resultados.push({
        destinatario: dest.nome,
        numero: numeroFormatado,
        status: "agendado",
        enviar_a: enviarA,
      });
      continue;
    }

    const { ok, erro } = await enviarZAPI(numeroFormatado, mensagem, { id: dest.id, nome: dest.nome });

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