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

function onlyDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

function ensureDdi55(num: string): string {
  if (!num) return num;
  return num.startsWith("55") ? num : `55${num}`;
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
  const secretaria = () => fetchByFuncao(["Secretaria", "Secretaria Escolar"]);
  const interlocutora = () => fetchByFuncao(["Interlocutora de Faturamento"]);
  const coordComercial = () => fetchByFuncao(["Coordenador Comercial"]);

  const backoffice = () => {
    // Cargo segmentado por entidade (Melhoria 3).
    // Fallback inclui os cargos legados "Backoffice" / "Backoffice Comercial"
    // filtrados por nome, para garantir compatibilidade enquanto os registros
    // antigos não forem migrados.
    const cargoSegmentado = isSenai
      ? "Backoffice SENAI"
      : isSaude
      ? "Backoffice SESI Saúde"
      : "Backoffice SESI Educação";
    return fetchByFuncao([cargoSegmentado]).then(async (segmentado) => {
      if (segmentado.length > 0) return segmentado;
      // Fallback legado
      const nome = isSaude ? "Ticyane" : "Deborah";
      return fetchByFuncaoAndNome(["Backoffice", "Backoffice Comercial"], nome);
    });
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
    return fetchByFuncao([cargo, "PCP"]);
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

    // Dedup por número + filtro de WhatsApp válido
    const seen = new Set<string>();
    const destinatarios = brutos
      .map((r) => ({ nome: r.nome ?? "Responsável", numero: onlyDigits(r.whatsapp) }))
      .filter((r) => {
        if (r.numero.length < 10) return false;
        if (seen.has(r.numero)) return false;
        seen.add(r.numero);
        return true;
      });

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
      const numero = ensureDdi55(dest.numero);

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
        if (resp.ok) {
          statusEnvio = "enviado";
        } else {
          erroEnvio = JSON.stringify(json).slice(0, 1000);
        }
      } catch (err) {
        erroEnvio = String(err).slice(0, 1000);
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

      resultados.push({ numero, nome: dest.nome, status: statusEnvio });
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