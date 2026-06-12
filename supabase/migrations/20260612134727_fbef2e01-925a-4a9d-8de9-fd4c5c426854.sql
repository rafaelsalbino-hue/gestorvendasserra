
-- 1) Coluna whatsapp em responsaveis
ALTER TABLE public.responsaveis
  ADD COLUMN IF NOT EXISTS whatsapp varchar(20);

-- 2) Tabela de log de notificações WhatsApp
CREATE TABLE IF NOT EXISTS public.notificacoes_whatsapp (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  numero_destinatario varchar(20),
  destinatario_nome varchar(150),
  etapa_destino text,
  mensagem text,
  status varchar(30), -- 'enviado' | 'falhou' | 'sem_numero' | 'api_nao_configurada' | 'duplicado'
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_whatsapp_contrato ON public.notificacoes_whatsapp(contrato_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_whatsapp_dedupe ON public.notificacoes_whatsapp(contrato_id, etapa_destino, numero_destinatario, created_at DESC);

GRANT SELECT ON public.notificacoes_whatsapp TO authenticated;
GRANT ALL ON public.notificacoes_whatsapp TO service_role;

ALTER TABLE public.notificacoes_whatsapp ENABLE ROW LEVEL SECURITY;

-- Visualização: admin, gestor, coordenador, backoffice
DROP POLICY IF EXISTS "Privileged roles can view whatsapp notifications" ON public.notificacoes_whatsapp;
CREATE POLICY "Privileged roles can view whatsapp notifications"
ON public.notificacoes_whatsapp FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_coordenador(auth.uid())
  OR public.is_backoffice(auth.uid())
);

-- Insert/Update/Delete só via service_role (edge function). Não criamos policies para authenticated.
