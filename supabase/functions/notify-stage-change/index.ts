import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

// Map each etapa to the responsible function(s) that should be notified
const ETAPA_RESPONSAVEIS: Record<string, string[]> = {
  proposta: ['Agente de Mercado PJ', 'Supervisor SESI', 'Supervisor SENAI'],
  rpc: ['Backoffice Comercial'],
  execucao: ['Backoffice Comercial'],
  matricula: ['Secretaria'],
  ensalamento: ['PCP'],
  faturamento: ['Analista Financeiro'],
}

const ETAPA_LABELS: Record<string, string> = {
  proposta: 'Proposta / CRM',
  rpc: 'RPC / Execução',
  execucao: 'Status RPC',
  matricula: 'Matrícula / Dados',
  ensalamento: 'Ensalamento',
  faturamento: 'Faturamento',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured')

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured')

    const { cliente, entidade, nova_etapa, etapa_anterior } = await req.json()

    if (!cliente || !nova_etapa) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get responsible functions for the new stage
    const funcoes = ETAPA_RESPONSAVEIS[nova_etapa] || []

    // For SESI/SENAI specific supervisors, filter by entidade
    const filteredFuncoes = funcoes.filter((f) => {
      if (f === 'Supervisor SESI' && entidade === 'SENAI') return false
      if (f === 'Supervisor SENAI' && entidade === 'SESI') return false
      return true
    })

    if (filteredFuncoes.length === 0) {
      return new Response(JSON.stringify({ message: 'No responsible functions for this stage' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get active responsáveis with matching functions
    const { data: responsaveis, error } = await supabase
      .from('responsaveis')
      .select('nome, email, funcao')
      .eq('ativo', true)
      .in('funcao', filteredFuncoes)

    if (error) throw new Error(`DB error: ${error.message}`)
    if (!responsaveis || responsaveis.length === 0) {
      return new Response(JSON.stringify({ message: 'No active responsáveis found for these functions' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const novaEtapaLabel = ETAPA_LABELS[nova_etapa] || nova_etapa
    const etapaAnteriorLabel = etapa_anterior ? (ETAPA_LABELS[etapa_anterior] || etapa_anterior) : '—'

    const results = []

    for (const resp of responsaveis) {
      const response = await fetch(`${GATEWAY_URL}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: 'Sistema RPC Educação <onboarding@resend.dev>',
          to: [resp.email],
          subject: `[RPC] Contrato "${cliente}" avançou para: ${novaEtapaLabel}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #1a56db; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Sistema RPC - Gestão de Faturamento</h1>
                <p style="color: #bfdbfe; margin: 4px 0 0; font-size: 14px;">Educação ${entidade}</p>
              </div>
              <div style="border: 1px solid #e5e7eb; border-top: 0; padding: 24px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1f2937; margin: 0 0 16px;">Mudança de Etapa no Pipeline</h2>
                <p style="color: #4b5563; line-height: 1.6;">
                  Olá <strong>${resp.nome}</strong>,
                </p>
                <p style="color: #4b5563; line-height: 1.6;">
                  O contrato do cliente <strong>${cliente}</strong> avançou de etapa e requer sua atenção.
                </p>
                <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
                  <p style="margin: 0; color: #374151; font-size: 14px;">
                    <strong>Cliente:</strong> ${cliente}<br/>
                    <strong>Entidade:</strong> ${entidade}<br/>
                    <strong>Etapa Anterior:</strong> ${etapaAnteriorLabel}<br/>
                    <strong>Nova Etapa:</strong> <span style="color: #1a56db; font-weight: bold;">${novaEtapaLabel}</span><br/>
                    <strong>Sua Função:</strong> ${resp.funcao}
                  </p>
                </div>
                <p style="color: #4b5563; line-height: 1.6;">
                  Por favor, acesse o sistema para verificar as pendências deste contrato.
                </p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
                  Este é um e-mail automático enviado pelo sistema. Não responda a esta mensagem.
                </p>
              </div>
            </div>
          `,
        }),
      })

      const data = await response.json()
      results.push({
        nome: resp.nome,
        email: resp.email,
        success: response.ok,
        ...(response.ok ? {} : { error: JSON.stringify(data) }),
      })
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
