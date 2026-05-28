
-- Notificações internas (G6)
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contrato_id UUID,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL DEFAULT '',
  lida_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notificacoes"
ON public.notificacoes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notificacoes"
ON public.notificacoes FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notificacoes"
ON public.notificacoes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated insert notificacoes"
ON public.notificacoes FOR INSERT TO authenticated
WITH CHECK (true);

CREATE INDEX idx_notificacoes_user_unread ON public.notificacoes (user_id, lida_at, created_at DESC);

-- Função que cria notificações para usuários cuja função é responsável pela nova etapa
CREATE OR REPLACE FUNCTION public.notify_contrato_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_funcoes TEXT[];
  v_titulo TEXT;
  v_mensagem TEXT;
  v_tipo TEXT;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;

  -- Mudança de etapa
  IF OLD.etapa_atual IS DISTINCT FROM NEW.etapa_atual THEN
    v_tipo := 'etapa';
    v_titulo := 'Contrato avançou de etapa';
    v_mensagem := NEW.cliente || ' — ' || OLD.etapa_atual::text || ' → ' || NEW.etapa_atual::text;

    v_funcoes := CASE NEW.etapa_atual::text
      WHEN 'proposta' THEN ARRAY['Agente de Mercado PJ','Supervisor SESI','Supervisor SENAI']
      WHEN 'rpc' THEN ARRAY['Backoffice Comercial']
      WHEN 'execucao' THEN ARRAY['Backoffice Comercial']
      WHEN 'matricula' THEN ARRAY['Secretaria']
      WHEN 'ensalamento' THEN ARRAY['PCP']
      WHEN 'faturamento' THEN ARRAY['Analista Financeiro','Interlocutora de Faturamento']
      ELSE ARRAY[]::TEXT[]
    END;

    IF NEW.entidade::text = 'SENAI' THEN
      v_funcoes := array_remove(v_funcoes, 'Supervisor SESI');
    ELSIF NEW.entidade::text = 'SESI' OR NEW.entidade::text = 'SESI Saúde' THEN
      v_funcoes := array_remove(v_funcoes, 'Supervisor SENAI');
    END IF;

    INSERT INTO public.notificacoes (user_id, contrato_id, tipo, titulo, mensagem)
    SELECT r.user_id, NEW.id, v_tipo, v_titulo, v_mensagem
    FROM public.responsaveis r
    WHERE r.ativo = true
      AND r.user_id IS NOT NULL
      AND r.funcao::text = ANY(v_funcoes);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_contrato_change
AFTER UPDATE ON public.contratos
FOR EACH ROW
EXECUTE FUNCTION public.notify_contrato_change();
