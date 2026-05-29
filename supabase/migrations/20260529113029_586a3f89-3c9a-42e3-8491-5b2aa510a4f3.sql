
-- Finalização em contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by uuid,
  ADD COLUMN IF NOT EXISTS finalized_by_nome text;

-- Helpers de role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'gestor')
$$;

CREATE OR REPLACE FUNCTION public.is_backoffice(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'backoffice')
$$;

CREATE OR REPLACE FUNCTION public.is_vendedor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'vendedor')
$$;

CREATE OR REPLACE FUNCTION public.is_coordenador(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'coordenador')
$$;

-- Pode editar um contrato específico
CREATE OR REPLACE FUNCTION public.can_edit_contrato(_user_id uuid, _contrato_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_agente uuid;
  v_resp uuid;
  v_finalized boolean;
BEGIN
  SELECT agente_pj_id, (finalized_at IS NOT NULL) INTO v_agente, v_finalized
  FROM public.contratos WHERE id = _contrato_id;

  -- Admin/gestor/coordenador editam sempre
  IF public.is_admin(_user_id) OR public.is_coordenador(_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Vendedor não edita contrato finalizado
  IF v_finalized THEN RETURN FALSE; END IF;

  -- Backoffice edita todos não-finalizados
  IF public.is_backoffice(_user_id) THEN RETURN TRUE; END IF;

  -- Vendedor edita só os seus
  IF public.is_vendedor(_user_id) THEN
    SELECT id INTO v_resp FROM public.responsaveis WHERE user_id = _user_id LIMIT 1;
    RETURN v_resp IS NOT NULL AND v_agente = v_resp;
  END IF;

  RETURN FALSE;
END;
$$;

-- Vendedor: id de responsável
CREATE OR REPLACE FUNCTION public.responsavel_id_of(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.responsaveis WHERE user_id = _user_id LIMIT 1
$$;

-- Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  user_nome text,
  acao text NOT NULL,
  entidade text NOT NULL,
  entidade_id uuid,
  detalhes jsonb DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated insert audit_log" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_entidade ON public.audit_log(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- RLS endurecida em contratos
DROP POLICY IF EXISTS "Authenticated users can read contratos" ON public.contratos;
DROP POLICY IF EXISTS "Authenticated users can update contratos" ON public.contratos;
DROP POLICY IF EXISTS "Authenticated users can insert contratos" ON public.contratos;

CREATE POLICY "Read contratos by role" ON public.contratos
  FOR SELECT TO authenticated USING (
    deleted_at IS NULL
    AND (
      public.is_admin(auth.uid())
      OR public.is_backoffice(auth.uid())
      OR public.is_coordenador(auth.uid())
      OR public.has_role(auth.uid(), 'operador')
      OR public.has_role(auth.uid(), 'secretaria')
      OR public.has_role(auth.uid(), 'interlocutora')
      OR (public.is_vendedor(auth.uid()) AND agente_pj_id = public.responsavel_id_of(auth.uid()))
    )
  );

-- Permite leitura de arquivados/deletados para admin/coordenador
CREATE POLICY "Read deleted contratos admin" ON public.contratos
  FOR SELECT TO authenticated USING (
    deleted_at IS NOT NULL AND (public.is_admin(auth.uid()) OR public.is_coordenador(auth.uid()))
  );

CREATE POLICY "Insert contratos" ON public.contratos
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin(auth.uid()) OR public.is_vendedor(auth.uid()) OR public.is_coordenador(auth.uid()) OR public.is_backoffice(auth.uid())
  );

CREATE POLICY "Update contratos by permission" ON public.contratos
  FOR UPDATE TO authenticated
  USING (public.can_edit_contrato(auth.uid(), id))
  WITH CHECK (public.can_edit_contrato(auth.uid(), id));

-- Atualizar handle_new_user para mapear funções aos novos perfis
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_responsavel_id uuid;
  v_funcao public.funcao_responsavel;
  v_roles public.app_role[];
  r public.app_role;
BEGIN
  BEGIN
    v_funcao := (NEW.raw_user_meta_data->>'funcao')::public.funcao_responsavel;
  EXCEPTION WHEN OTHERS THEN
    v_funcao := 'Backoffice Comercial';
  END;

  INSERT INTO public.responsaveis (nome, email, funcao, user_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    v_funcao,
    NEW.id
  )
  RETURNING id INTO new_responsavel_id;

  INSERT INTO public.profiles (id, email, nome, responsavel_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    new_responsavel_id
  )
  ON CONFLICT (id) DO NOTHING;

  v_roles := CASE v_funcao
    WHEN 'Coordenador de Mercado' THEN ARRAY['admin','gestor']::public.app_role[]
    WHEN 'Analista Comercial' THEN ARRAY['admin','gestor']::public.app_role[]
    WHEN 'Coordenador SESI/SENAI' THEN ARRAY['coordenador']::public.app_role[]
    WHEN 'Backoffice Comercial' THEN ARRAY['backoffice']::public.app_role[]
    WHEN 'Agente de Mercado PJ' THEN ARRAY['vendedor']::public.app_role[]
    WHEN 'Secretaria' THEN ARRAY['secretaria']::public.app_role[]
    WHEN 'Interlocutora de Faturamento' THEN ARRAY['interlocutora']::public.app_role[]
    ELSE ARRAY['operador']::public.app_role[]
  END;

  FOREACH r IN ARRAY v_roles LOOP
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Sincroniza user_roles para usuários existentes com base na função do responsável
INSERT INTO public.user_roles (user_id, role)
SELECT r.user_id,
  CASE r.funcao
    WHEN 'Coordenador de Mercado' THEN 'admin'
    WHEN 'Analista Comercial' THEN 'admin'
    WHEN 'Coordenador SESI/SENAI' THEN 'coordenador'
    WHEN 'Backoffice Comercial' THEN 'backoffice'
    WHEN 'Agente de Mercado PJ' THEN 'vendedor'
    WHEN 'Secretaria' THEN 'secretaria'
    WHEN 'Interlocutora de Faturamento' THEN 'interlocutora'
    ELSE 'operador'
  END::public.app_role
FROM public.responsaveis r
WHERE r.user_id IS NOT NULL AND r.ativo = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Seed subdivisões SESI Educação
INSERT INTO public.unit_subdivisions (unit_name, name)
VALUES ('SESI Educação', 'Contraturno'), ('SESI Educação', 'ACE')
ON CONFLICT DO NOTHING;

-- Trigger de auditoria para contratos
CREATE OR REPLACE FUNCTION public.audit_contrato_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
  v_nome text;
BEGIN
  SELECT email, nome INTO v_email, v_nome FROM public.profiles WHERE id = auth.uid();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(user_id, user_email, user_nome, acao, entidade, entidade_id, detalhes)
    VALUES (auth.uid(), v_email, v_nome, 'criar', 'contrato', NEW.id, jsonb_build_object('cliente', NEW.cliente, 'entidade', NEW.entidade));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.finalized_at IS NULL AND NEW.finalized_at IS NOT NULL THEN
      INSERT INTO public.audit_log(user_id, user_email, user_nome, acao, entidade, entidade_id, detalhes)
      VALUES (auth.uid(), v_email, v_nome, 'finalizar', 'contrato', NEW.id, jsonb_build_object('cliente', NEW.cliente));
    ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      INSERT INTO public.audit_log(user_id, user_email, user_nome, acao, entidade, entidade_id, detalhes)
      VALUES (auth.uid(), v_email, v_nome, 'arquivar', 'contrato', NEW.id, jsonb_build_object('cliente', NEW.cliente));
    ELSIF OLD.etapa_atual IS DISTINCT FROM NEW.etapa_atual THEN
      INSERT INTO public.audit_log(user_id, user_email, user_nome, acao, entidade, entidade_id, detalhes)
      VALUES (auth.uid(), v_email, v_nome, 'mover_etapa', 'contrato', NEW.id, jsonb_build_object('de', OLD.etapa_atual, 'para', NEW.etapa_atual));
    ELSE
      INSERT INTO public.audit_log(user_id, user_email, user_nome, acao, entidade, entidade_id, detalhes)
      VALUES (auth.uid(), v_email, v_nome, 'editar', 'contrato', NEW.id, '{}'::jsonb);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log(user_id, user_email, user_nome, acao, entidade, entidade_id, detalhes)
    VALUES (auth.uid(), v_email, v_nome, 'excluir', 'contrato', OLD.id, jsonb_build_object('cliente', OLD.cliente));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_contratos ON public.contratos;
CREATE TRIGGER trg_audit_contratos
AFTER INSERT OR UPDATE OR DELETE ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.audit_contrato_change();
