
CREATE TABLE public.notificacao_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa public.etapa_contrato NOT NULL,
  funcao public.funcao_responsavel NOT NULL,
  canal text NOT NULL CHECK (canal IN ('whatsapp','sistema')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (etapa, funcao, canal)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacao_permissoes TO authenticated;
GRANT ALL ON public.notificacao_permissoes TO service_role;

ALTER TABLE public.notificacao_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem permissoes"
  ON public.notificacao_permissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins inserem permissoes"
  ON public.notificacao_permissoes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins atualizam permissoes"
  ON public.notificacao_permissoes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins excluem permissoes"
  ON public.notificacao_permissoes FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_notif_perm_updated_at
  BEFORE UPDATE ON public.notificacao_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed
WITH base(etapa, funcao) AS (
  VALUES
    ('proposta'::public.etapa_contrato, 'Agente de Mercado PJ'::public.funcao_responsavel),
    ('proposta', 'Supervisor SENAI — Lages Cursos Técnicos'),
    ('proposta', 'Supervisor SENAI — Lages Cursos de Qualificação'),
    ('proposta', 'Supervisor SENAI — Correia Pinto'),
    ('proposta', 'Supervisor SENAI — Otacílio Costa'),
    ('proposta', 'Supervisor SESI Saúde — SST'),
    ('proposta', 'Supervisor SESI Saúde — Promoção de Saúde'),
    ('proposta', 'Supervisor SESI Saúde — Saúde Assistencial'),
    ('proposta', 'Supervisor SESI Educação — ACE'),
    ('proposta', 'Supervisor SESI Educação — Maker'),
    ('supervisor', 'Supervisor SENAI — Lages Cursos Técnicos'),
    ('supervisor', 'Supervisor SENAI — Lages Cursos de Qualificação'),
    ('supervisor', 'Supervisor SENAI — Correia Pinto'),
    ('supervisor', 'Supervisor SENAI — Otacílio Costa'),
    ('supervisor', 'Supervisor SESI Saúde — SST'),
    ('supervisor', 'Supervisor SESI Saúde — Promoção de Saúde'),
    ('supervisor', 'Supervisor SESI Saúde — Saúde Assistencial'),
    ('supervisor', 'Supervisor SESI Educação — ACE'),
    ('supervisor', 'Supervisor SESI Educação — Maker'),
    ('rpc', 'Backoffice SESI Saúde'),
    ('rpc', 'Backoffice SESI Educação'),
    ('rpc', 'Backoffice SENAI'),
    ('execucao', 'Backoffice SESI Saúde'),
    ('execucao', 'Backoffice SESI Educação'),
    ('execucao', 'Backoffice SENAI'),
    ('matricula', 'Secretaria Escolar'),
    ('ensalamento', 'PCP SESI'),
    ('ensalamento', 'PCP SENAI'),
    ('faturamento', 'Analista Financeiro'),
    ('faturamento', 'Interlocutora de Faturamento')
)
INSERT INTO public.notificacao_permissoes (etapa, funcao, canal, ativo)
SELECT etapa, funcao, c.canal, true
FROM base, (VALUES ('sistema'),('whatsapp')) AS c(canal)
ON CONFLICT (etapa, funcao, canal) DO NOTHING;

-- Refatorar trigger
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
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;

  IF OLD.etapa_atual IS DISTINCT FROM NEW.etapa_atual THEN
    v_tipo := 'etapa';
    v_titulo := 'Contrato avançou de etapa';
    v_mensagem := NEW.cliente || ' — ' || OLD.etapa_atual::text || ' → ' || NEW.etapa_atual::text;

    INSERT INTO public.notificacoes (user_id, contrato_id, tipo, titulo, mensagem)
    SELECT DISTINCT r.user_id, NEW.id, v_tipo, v_titulo, v_mensagem
    FROM public.responsaveis r
    JOIN public.notificacao_permissoes p
      ON p.funcao = r.funcao
     AND p.etapa = NEW.etapa_atual
     AND p.canal = 'sistema'
     AND p.ativo = true
    WHERE r.ativo = true
      AND r.user_id IS NOT NULL
      AND (
        r.funcao::text NOT LIKE 'Supervisor%'
        OR (NEW.entidade::text = 'SENAI' AND r.funcao::text LIKE 'Supervisor SENAI%')
        OR (NEW.entidade::text IN ('SESI','SESI Saúde') AND r.funcao::text LIKE 'Supervisor SESI%')
      );
  END IF;

  RETURN NEW;
END;
$function$;
