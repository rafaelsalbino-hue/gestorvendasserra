
ALTER TABLE public.notificacao_permissoes ADD COLUMN IF NOT EXISTS entidade text;

DO $$ BEGIN
  ALTER TABLE public.notificacao_permissoes
    ADD CONSTRAINT notificacao_permissoes_entidade_check
    CHECK (entidade IN ('SESI Educação','SENAI','SESI Saúde'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.notificacao_permissoes SET entidade = 'SENAI' WHERE entidade IS NULL;
ALTER TABLE public.notificacao_permissoes ALTER COLUMN entidade SET NOT NULL;
ALTER TABLE public.notificacao_permissoes ALTER COLUMN entidade SET DEFAULT 'SENAI';

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.notificacao_permissoes'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.notificacao_permissoes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.notificacao_permissoes
  ADD CONSTRAINT notificacao_permissoes_etapa_funcao_canal_entidade_key
  UNIQUE (etapa, funcao, canal, entidade);

INSERT INTO public.notificacao_permissoes (etapa, funcao, canal, ativo, entidade)
SELECT etapa, funcao, canal, ativo, 'SESI Educação' FROM public.notificacao_permissoes WHERE entidade = 'SENAI'
ON CONFLICT (etapa, funcao, canal, entidade) DO NOTHING;

INSERT INTO public.notificacao_permissoes (etapa, funcao, canal, ativo, entidade)
SELECT etapa, funcao, canal, ativo, 'SESI Saúde' FROM public.notificacao_permissoes WHERE entidade = 'SENAI'
ON CONFLICT (etapa, funcao, canal, entidade) DO NOTHING;

CREATE OR REPLACE FUNCTION public.notify_contrato_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_titulo TEXT;
  v_mensagem TEXT;
  v_tipo TEXT;
  v_entidade_perm TEXT;
  v_agente_user uuid;
  v_agente_ativa boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF OLD.etapa_atual IS DISTINCT FROM NEW.etapa_atual THEN
    v_tipo := 'etapa';
    v_titulo := 'Contrato avançou de etapa';
    v_mensagem := NEW.cliente || ' — ' || OLD.etapa_atual::text || ' → ' || NEW.etapa_atual::text;
    v_entidade_perm := CASE NEW.entidade::text
      WHEN 'SESI' THEN 'SESI Educação'
      WHEN 'SENAI' THEN 'SENAI'
      WHEN 'SESI Saúde' THEN 'SESI Saúde'
      ELSE NEW.entidade::text END;

    INSERT INTO public.notificacoes (user_id, contrato_id, tipo, titulo, mensagem)
    SELECT DISTINCT r.user_id, NEW.id, v_tipo, v_titulo, v_mensagem
    FROM public.responsaveis r
    JOIN public.notificacao_permissoes p
      ON p.funcao = r.funcao AND p.etapa = NEW.etapa_atual
     AND p.canal = 'sistema' AND p.ativo = true AND p.entidade = v_entidade_perm
    WHERE r.ativo = true AND r.user_id IS NOT NULL
      AND r.funcao::text <> 'Agente de Mercado PJ'
      AND (
        r.funcao::text NOT LIKE 'Supervisor%'
        OR (NEW.entidade::text = 'SENAI' AND r.funcao::text LIKE 'Supervisor SENAI%')
        OR (NEW.entidade::text IN ('SESI','SESI Saúde') AND r.funcao::text LIKE 'Supervisor SESI%')
      );

    IF NEW.agente_pj_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.notificacao_permissoes
        WHERE etapa = NEW.etapa_atual AND canal = 'sistema' AND ativo = true
          AND entidade = v_entidade_perm AND funcao::text = 'Agente de Mercado PJ'
      ) INTO v_agente_ativa;
      IF v_agente_ativa THEN
        SELECT user_id INTO v_agente_user FROM public.responsaveis
        WHERE id = NEW.agente_pj_id AND ativo = true AND user_id IS NOT NULL;
        IF v_agente_user IS NOT NULL THEN
          INSERT INTO public.notificacoes (user_id, contrato_id, tipo, titulo, mensagem)
          VALUES (v_agente_user, NEW.id, v_tipo, v_titulo, v_mensagem);
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
