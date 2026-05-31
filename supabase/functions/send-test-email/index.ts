import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Authn: require a valid Supabase JWT and gestor role (test email blasts all responsáveis)
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: userErr } = await authClient.auth.getUser(token)
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: isGestor } = await authClient.rpc('is_gestor', { _user_id: userData.user.id })
    if (!isGestor) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all active responsáveis
    const { data: responsaveis, error } = await supabase
      .from('responsaveis')
      .select('nome, email, funcao')
      .eq('ativo', true)

    if (error) throw new Error(`DB error: ${error.message}`)
    if (!responsaveis || responsaveis.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum responsável cadastrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results = []

    for (const resp of responsaveis) {
      const safeNome = escapeHtml(resp.nome)
      const safeFuncao = escapeHtml(resp.funcao)
      const safeEmail = escapeHtml(resp.email)
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
          subject: 'TESTE SISTEMA RPC EDUCAÇÃO',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #1a56db; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Sistema RPC - Gestão de Faturamento</h1>
                <p style="color: #bfdbfe; margin: 4px 0 0; font-size: 14px;">Educação SESI / SENAI</p>
              </div>
              <div style="border: 1px solid #e5e7eb; border-top: 0; padding: 24px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1f2937; margin: 0 0 16px;">TESTE SISTEMA RPC EDUCAÇÃO</h2>
                <p style="color: #4b5563; line-height: 1.6;">
                  Olá <strong>${safeNome}</strong>,
                </p>
                <p style="color: #4b5563; line-height: 1.6;">
                  Este é um e-mail de teste do Sistema de Gestão de Faturamento RPC — Educação.
                </p>
                <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
                  <p style="margin: 0; color: #374151; font-size: 14px;">
                    <strong>Função:</strong> ${safeFuncao}<br/>
                    <strong>E-mail:</strong> ${safeEmail}
                  </p>
                </div>
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
    console.error('[send-test-email] internal error:', message)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
