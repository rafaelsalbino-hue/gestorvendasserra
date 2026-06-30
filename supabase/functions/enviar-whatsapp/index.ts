import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Z-API
const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID") ?? "";
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN") ?? "";
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN") ?? "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ETAPA_LABELS: Record<string, string> = {
  proposta: "Proposta / CRM",
  supervisor: "Supervisor",
  rpc: "RPC / Execução",
  execucao: "RPC / Execução",
  matricula: "Matrícula / Dados",
  ensalamento: "PCP",
  pcp: "PCP",
  faturamento: "Faturamento",
  finalizado: "Finalizado",
};

function mask(s: string): string {
  if (!s) return "";
  return s.length <= 6 ? s.slice(0, 2) + "***" : s.slice(0, 6) + "...";
}

/**
 * Formata número BR de forma estrita.
 * - Remove não-dígitos
 * - Prefixa 55 se faltar
 * - Insere o "9" de celular quando vier com 12 dígitos (55 + DDD + 8)
 * - Aceita 12 (fixo) ou 13 (celular) dígitos finais
 */
function formatPhoneBR(raw: string | null | undefined): string | null {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return null;

  if (!digits.startsWith("55")) digits = "55" + digits;

  if (digits.length === 12) {
    const ddd = parseInt(digits.slice(2, 4), 10);
    if (ddd >= 11 && ddd <= 99) {
      digits = digits.slice(0, 4) + "9" + digits.slice(4);
    }
  }

  if (digits.length < 12 || digits.length > 13) return null;
  return digits;
}

function brl(v: number | null | undefined): string {
  if (v === null || v === undefined) return "Não informado";
  return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Dest = { nome: string; whatsapp: string | null; funcao: string };

async function buildDestinatarios(
  supabase: ReturnType<typeof createClient>,
  etapa: string,
  entidadeRaw: string,
): Promise<Dest[]> {
  const ent = (entidadeRaw || "").toLowerCase();
  const isSaude = ent.includes("saúde") || ent.includes("saude");
  const isSenai = ent.includes("senai");
  // Default SESI (não-saúde) = SESI Educação / Expansão

  const fetchByFuncao = async (funcoes: string[]): Promise<Dest[]> => {
    if (funcoes.length === 0) return [];
    const { data } = await supabase
      .from("responsaveis")
      .select("nome, whatsapp, funcao")
      .eq("ativo", true)
      .in("funcao", funcoes);
    return (data ?? []) as Dest[];
  };

  const fetchByFuncaoLike = async (pattern: string): Promise<Dest[]> => {
    const { data } = await supabase
      .from("responsaveis")
      .select("nome, whatsapp, funcao")
      .eq("ativo", true)
      .ilike("funcao", pattern);
    return (data ?? []) as Dest[];
  };

  const fetchByFuncaoAndNome = async (funcoes: string[], nome: string): Promise<Dest[]> => {
    const { data } = await supabase
      .from("responsaveis")
      .select("nome, whatsapp, funcao")
      .eq("ativo", true)
      .in("funcao", funcoes)
      .ilike("nome", `%${nome}%`);
    return (data ?? []) as Dest[];
  };

  const analistas = () => fetchByFuncao(["Analista Comercial"]);
  const secretaria = () => fetchByFuncao(["Secretaria Escolar"]);
  const interlocutora = () => fetchByFuncao(["Interlocutora de Faturamento"]);
  const coordComercial = () => fetchByFuncao(["Coordenador Comercial SENAI"]);

  const backoffice = () => {
    // Cargo segmentado por entidade. SESI Educação e SENAI são cobertos por
    // pessoas/cargos diferentes; aqui consultamos apenas o cargo correto.
    const cargoSegmentado = isSenai
      ? "Backoffice SENAI"
      : isSaude
      ? "Backoffice SESI Saúde"
      : "Backoffice SESI Educação";
    return fetchByFuncao([cargoSegmentado]);
  };

  const coordEntidade = () => {
    const cargo = isSenai
      ? "Coordenador SENAI"
      : isSaude
      ? "Coordenador SESI Saúde"
      : "Coordenador SESI Expansão";
    return fetchByFuncao([cargo]);
  };

  const supervisorEntidade = () => {
    const prefixo = isSenai
      ? "Supervisor SENAI%"
      : isSaude
      ? "Supervisor SESI Saúde%"
      : "Supervisor SESI Educação%";
    return fetchByFuncaoLike(prefixo);
  };

  const pcpEntidade = () => {
    const cargo = isSenai ? "PCP SENAI" : "PCP SESI";
    return fetchByFuncao([cargo]);
  };

  switch (etapa) {
    case "proposta": // Visita concluída → Proposta/CRM
      return [...(await backoffice()), ...(await analistas())];
    case "supervisor": // Proposta/CRM concluída → Supervisor
      return [...(await supervisorEntidade()), ...(await coordEntidade())];
    case "rpc":
    case "execucao":
      // Etapa 4 RPC/Execução: Backoffice + Analista + Coordenador + Secretaria + Interlocutora
      return [
        ...(await backoffice()),
        ...(await analistas()),
        ...(await coordEntidade()),
        ...(await secretaria()),
        ...(await interlocutora()),
      ];
    case "matricula":
      // Etapa 5 Matrícula: PCP da entidade + Supervisor + Analista + Interlocutora
      return [
        ...(await pcpEntidade()),
        ...(await supervisorEntidade()),
        ...(await analistas()),
        ...(await interlocutora()),
      ];
    case "ensalamento":
    case "pcp":
      // Etapa 6 PCP: Analista Comercial + Interlocutora de Faturamento
      return [...(await analistas()), ...(await interlocutora())];
    case "faturamento": // PCP concluído → Faturamento
      return [...(await analistas()), ...(await interlocutora())];
    case "finalizado": // Faturamento concluído → Finalizado
      return [...(await analistas()), ...(await coordComercial()), ...(await coordEntidade())];
    default:
      return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // GET ?action=status — diagnóstico Z-API sem autenticação Supabase
    // Não envia mensagem; só consulta o status da instância e dos secrets.
    // ========================================================================
    const reqUrl = new URL(req.url);
    if (req.method === "GET" || reqUrl.searchParams.get("action") === "status") {
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
        JSON.stringify({
          ok: true,
          secretsLoaded,
          secretsPreview,
          httpStatus: statusHttp,
          instanceStatus,
          statusError,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ========================================================================
    // Check de secrets ANTES de qualquer envio
    // ========================================================================
    console.log("[Z-API] Secrets check:", {
      hasInstanceId: !!ZAPI_INSTANCE_ID,
      instanceIdPreview: mask(ZAPI_INSTANCE_ID),
      hasToken: !!ZAPI_TOKEN,
      tokenPreview: mask(ZAPI_TOKEN),
      hasClientToken: !!ZAPI_CLIENT_TOKEN,
      clientTokenPreview: mask(ZAPI_CLIENT_TOKEN),
    });

    // Autenticação
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: claims, error: authErr } = await authClient.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const contrato_id: string | undefined = body.contrato_id ?? body.processo_id;
    const etapa_destino: string | undefined = body.etapa_destino;
    const usuario_atual_nome: string = body.usuario_atual_nome ?? "Sistema";
    const origem: string = body.origem === "manual" ? "manual" : "automatico";

    if (!contrato_id || !etapa_destino) {
      return new Response(JSON.stringify({ error: "contrato_id e etapa_destino são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Busca contrato
    const { data: contrato, error: erroProc } = await supabase
      .from("contratos")
      .select("id, cliente, entidade, servico_produto, valor, acao_esperada")
      .eq("id", contrato_id)
      .single();

    if (erroProc || !contrato) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Config Z-API ausente? loga e sai sem erro
    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      await supabase.from("notificacoes_whatsapp").insert({
        contrato_id,
        etapa_destino,
        status: "api_nao_configurada",
        erro: "ZAPI_INSTANCE_ID/ZAPI_TOKEN não configurados",
        origem,
      });
      return new Response(JSON.stringify({ warning: "Z-API não configurada" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Destinatários por etapa+entidade (regras do fluxo Visita → Finalizado)
    const brutos = await buildDestinatarios(supabase, etapa_destino, String(contrato.entidade ?? ""));

    // Formata + dedupe por número final
    const seen = new Set<string>();
    const destinatarios: Array<{ nome: string; numero: string }> = [];
    for (const r of brutos) {
      const numero = formatPhoneBR(r.whatsapp);
      if (!numero) {
        console.warn("[Z-API] Telefone inválido descartado:", { nome: r.nome, whatsapp_raw: r.whatsapp });
        continue;
      }
      if (seen.has(numero)) continue;
      seen.add(numero);
      destinatarios.push({ nome: r.nome ?? "Responsável", numero });
    }

    if (destinatarios.length === 0) {
      await supabase.from("notificacoes_whatsapp").insert({
        contrato_id,
        etapa_destino,
        status: "sem_numero",
        erro: "Nenhum responsável com WhatsApp cadastrado para esta etapa",
        origem,
      });
      return new Response(JSON.stringify({ warning: "Sem destinatários" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const etapaLabel = ETAPA_LABELS[etapa_destino] ?? etapa_destino;
    const valorFmt = brl(contrato.valor as number | null);

    // Dedupe: já enviado nos últimos 5 min para mesmo (contrato, etapa, numero)?
    const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const resultados: Array<{ numero: string; nome: string; status: string }> = [];

    for (const dest of destinatarios) {
      const numero = dest.numero;

      const { data: dup } = await supabase
        .from("notificacoes_whatsapp")
        .select("id")
        .eq("contrato_id", contrato_id)
        .eq("etapa_destino", etapa_destino)
        .eq("numero_destinatario", numero)
        .eq("status", "enviado")
        .gte("created_at", cincoMinAtras)
        .limit(1)
        .maybeSingle();

      if (dup) {
        resultados.push({ numero, nome: dest.nome, status: "duplicado" });
        continue;
      }

      const mensagem =
        `Olá, ${dest.nome}! 👋\n\n` +
        `O processo *${contrato.cliente}* avançou para a etapa *${etapaLabel}* e está aguardando sua ação.\n\n` +
        `📋 Detalhes:\n` +
        `• Entidade: ${contrato.entidade ?? "Não informado"}\n` +
        `• Serviço: ${contrato.servico_produto ?? "Não informado"}\n` +
        `• Valor: R$ ${valorFmt}\n` +
        `• Responsável anterior: ${usuario_atual_nome}\n` +
        (contrato.acao_esperada ? `\n🎯 *Ação esperada:* ${contrato.acao_esperada}\n` : "") +
        `\n` +
        `Acesse o sistema para dar continuidade:\n` +
        `🔗 https://gestorvendasserra.lovable.app\n\n` +
        `_FIESC Serra Catarinense — Gestão RPC Serra_`;

      let statusEnvio = "falhou";
      let erroEnvio: string | null = null;
      let zaapId: string | null = null;

      try {
        const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (ZAPI_CLIENT_TOKEN) headers["Client-Token"] = ZAPI_CLIENT_TOKEN;

        const resp = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ phone: numero, message: mensagem }),
        });
        const json = await resp.json().catch(() => ({}));

        // Logs completos para diagnóstico
        console.log("[Z-API] HTTP Status:", resp.status);
        console.log("[Z-API] Response body:", JSON.stringify(json));
        console.log("[Z-API] Phone sent:", numero);
        console.log("[Z-API] Message preview:", mensagem.slice(0, 80));

        // Z-API retorna 200 mesmo em falha silenciosa.
        // Sucesso real = HTTP 200 + zaapId presente no body.
        const realSuccess = resp.ok && !!(json as any)?.zaapId;
        if (realSuccess) {
          statusEnvio = "enviado";
          zaapId = String((json as any).zaapId);
        } else {
          erroEnvio = `HTTP ${resp.status} | body=${JSON.stringify(json).slice(0, 800)}`;
          console.error("[Z-API] Falha (sem zaapId):", erroEnvio);
        }
      } catch (err) {
        erroEnvio = String(err).slice(0, 1000);
        console.error("[Z-API] Exceção no fetch:", erroEnvio);
      }

      await supabase.from("notificacoes_whatsapp").insert({
        contrato_id,
        numero_destinatario: numero,
        destinatario_nome: dest.nome,
        etapa_destino,
        mensagem,
        status: statusEnvio,
        erro: erroEnvio,
        origem,
      });

      resultados.push({ numero, nome: dest.nome, status: statusEnvio, zaapId: zaapId ?? undefined, erro: erroEnvio ?? undefined } as any);
    }

    return new Response(JSON.stringify({ ok: true, resultados }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[enviar-whatsapp]", msg);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});