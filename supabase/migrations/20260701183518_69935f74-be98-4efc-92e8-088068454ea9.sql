
-- ============ 1. Entidade REDE ============
ALTER TYPE public.entidade_type ADD VALUE IF NOT EXISTS 'REDE';

-- ============ 2. Subdivisões (SENAI + REDE) ============
INSERT INTO public.unit_subdivisions (unit_name, name) VALUES
  ('SENAI', 'Cursos Técnicos'),
  ('SENAI', 'Qualificação Profissional'),
  ('SENAI', 'Aprendizagem'),
  ('REDE', 'Demais Serviços Educação'),
  ('REDE', 'IEL'),
  ('REDE', 'Inovação'),
  ('REDE', 'Profissional'),
  ('REDE', 'Superior'),
  ('REDE', 'Tecnologia')
ON CONFLICT DO NOTHING;

-- ============ 3. Unidade de Atendimento ============
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS unidade_atendimento text;

ALTER TABLE public.responsaveis
  ADD COLUMN IF NOT EXISTS unidade_atendimento text;

-- Check constraint (aceita nulo)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contratos_unidade_atendimento_chk') THEN
    ALTER TABLE public.contratos
      ADD CONSTRAINT contratos_unidade_atendimento_chk
      CHECK (unidade_atendimento IS NULL OR unidade_atendimento IN ('Lages','Otacílio Costa','Correia Pinto'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'responsaveis_unidade_atendimento_chk') THEN
    ALTER TABLE public.responsaveis
      ADD CONSTRAINT responsaveis_unidade_atendimento_chk
      CHECK (unidade_atendimento IS NULL OR unidade_atendimento IN ('Lages','Otacílio Costa','Correia Pinto'));
  END IF;
END $$;

-- ============ 4. Turnos de trabalho no responsável ============
ALTER TABLE public.responsaveis
  ADD COLUMN IF NOT EXISTS turno_manha boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS turno_tarde boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS turno_noite boolean NOT NULL DEFAULT false;

-- ============ 5. Fila de WhatsApp (enviar_a + status agendado) ============
ALTER TABLE public.notificacoes_whatsapp
  ADD COLUMN IF NOT EXISTS enviar_a timestamptz;

CREATE INDEX IF NOT EXISTS idx_notif_wpp_agendado
  ON public.notificacoes_whatsapp (enviar_a)
  WHERE status = 'agendado';

-- ============ 6. Trigger de notificação de etapa (roteamento por unidade+subdivisão em SENAI) ============
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
  v_supervisor_label TEXT;
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
      WHEN 'REDE' THEN 'REDE'
      ELSE NEW.entidade::text END;

    -- Monta rótulo específico do Supervisor SENAI conforme unidade + subdivisão
    v_supervisor_label := NULL;
    IF NEW.entidade::text = 'SENAI' AND NEW.unidade_atendimento IS NOT NULL THEN
      IF NEW.unidade_atendimento = 'Correia Pinto' THEN
        v_supervisor_label := 'Supervisor SENAI — Correia Pinto';
      ELSIF NEW.unidade_atendimento = 'Otacílio Costa' THEN
        v_supervisor_label := 'Supervisor SENAI — Otacílio Costa';
      ELSIF NEW.unidade_atendimento = 'Lages' THEN
        IF NEW.subdivisao ILIKE '%Técnico%' OR NEW.subdivisao ILIKE '%Tecnico%' THEN
          v_supervisor_label := 'Supervisor SENAI — Lages Cursos Técnicos';
        ELSIF NEW.subdivisao ILIKE '%Qualificação%' OR NEW.subdivisao ILIKE '%Qualifica%' THEN
          v_supervisor_label := 'Supervisor SENAI — Lages Cursos de Qualificação';
        END IF;
      END IF;
    END IF;

    INSERT INTO public.notificacoes (user_id, contrato_id, tipo, titulo, mensagem)
    SELECT DISTINCT r.user_id, NEW.id, v_tipo, v_titulo, v_mensagem
    FROM public.responsaveis r
    JOIN public.notificacao_permissoes p
      ON p.funcao = r.funcao AND p.etapa = NEW.etapa_atual
     AND p.canal = 'sistema' AND p.ativo = true AND p.entidade = v_entidade_perm
    WHERE r.ativo = true AND r.user_id IS NOT NULL
      AND r.funcao::text <> 'Agente de Mercado PJ'
      AND (
        -- Não é supervisor: entra normalmente
        r.funcao::text NOT LIKE 'Supervisor%'
        -- Supervisor SENAI: se há rótulo específico, restringe; senão comportamento antigo
        OR (NEW.entidade::text = 'SENAI' AND (
          (v_supervisor_label IS NOT NULL AND r.funcao::text = v_supervisor_label)
          OR (v_supervisor_label IS NULL AND r.funcao::text LIKE 'Supervisor SENAI%')
        ))
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
