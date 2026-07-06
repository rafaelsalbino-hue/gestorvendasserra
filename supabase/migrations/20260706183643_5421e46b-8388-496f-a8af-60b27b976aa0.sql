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
  v_supervisor_saude_label TEXT;
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

    -- Supervisor SENAI específico (unidade + subdivisão)
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

    -- Supervisor SESI Saúde específico (subdivisão)
    v_supervisor_saude_label := NULL;
    IF NEW.entidade::text = 'SESI Saúde' AND NEW.subdivisao IS NOT NULL THEN
      IF NEW.subdivisao ILIKE '%Promo%' THEN
        v_supervisor_saude_label := 'Supervisor SESI Saúde — Promoção de Saúde';
      ELSIF NEW.subdivisao ILIKE '%Assistencial%' THEN
        v_supervisor_saude_label := 'Supervisor SESI Saúde — Saúde Assistencial';
      ELSIF NEW.subdivisao ILIKE '%SST%' THEN
        v_supervisor_saude_label := 'Supervisor SESI Saúde — SST';
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
        r.funcao::text NOT LIKE 'Supervisor%'
        OR (NEW.entidade::text = 'SENAI' AND (
          (v_supervisor_label IS NOT NULL AND r.funcao::text = v_supervisor_label)
          OR (v_supervisor_label IS NULL AND r.funcao::text LIKE 'Supervisor SENAI%')
        ))
        OR (NEW.entidade::text = 'SESI Saúde' AND (
          (v_supervisor_saude_label IS NOT NULL AND r.funcao::text = v_supervisor_saude_label)
          OR (v_supervisor_saude_label IS NULL AND r.funcao::text LIKE 'Supervisor SESI Saúde%')
        ))
        OR (NEW.entidade::text = 'SESI' AND r.funcao::text LIKE 'Supervisor SESI%' AND r.funcao::text NOT LIKE 'Supervisor SESI Saúde%')
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