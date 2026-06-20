
-- 1. Tabela de matriz
CREATE TABLE public.etapa_cargo_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa public.etapa_contrato NOT NULL,
  funcao public.funcao_responsavel NOT NULL,
  pode_criar boolean NOT NULL DEFAULT false,
  pode_editar boolean NOT NULL DEFAULT false,
  pode_avancar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (etapa, funcao)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.etapa_cargo_permissoes TO authenticated;
GRANT ALL ON public.etapa_cargo_permissoes TO service_role;

ALTER TABLE public.etapa_cargo_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem matriz"
  ON public.etapa_cargo_permissoes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin/Gestor gerencia matriz"
  ON public.etapa_cargo_permissoes FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER set_updated_at_etapa_cargo_permissoes
  BEFORE UPDATE ON public.etapa_cargo_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed inicial replicando regras atuais
-- Helper: inserir todos os 3 (criar/editar/avançar) para uma (etapa, funcao)
DO $$
DECLARE
  v_etapa public.etapa_contrato;
  v_func public.funcao_responsavel;
  supervisores public.funcao_responsavel[] := ARRAY[
    'Supervisor SESI','Supervisor SENAI',
    'Supervisor SENAI — Lages Cursos Técnicos',
    'Supervisor SENAI — Lages Cursos de Qualificação',
    'Supervisor SENAI — Correia Pinto',
    'Supervisor SENAI — Otacílio Costa',
    'Supervisor SESI Saúde — SST',
    'Supervisor SESI Saúde — Promoção de Saúde',
    'Supervisor SESI Saúde — Saúde Assistencial',
    'Supervisor SESI Educação — ACE',
    'Supervisor SESI Educação — Maker'
  ]::public.funcao_responsavel[];
  coordenadores public.funcao_responsavel[] := ARRAY[
    'Coordenador de Mercado','Coordenador SESI/SENAI',
    'Coordenador SENAI','Coordenador SESI Saúde',
    'Coordenador SESI Expansão','Coordenador Comercial'
  ]::public.funcao_responsavel[];
  backoffice public.funcao_responsavel[] := ARRAY[
    'Backoffice','Backoffice Comercial',
    'Backoffice SESI Saúde','Backoffice SESI Educação','Backoffice SENAI'
  ]::public.funcao_responsavel[];
  secretaria public.funcao_responsavel[] := ARRAY['Secretaria','Secretaria Escolar']::public.funcao_responsavel[];
  pcp public.funcao_responsavel[] := ARRAY['PCP','PCP SESI','PCP SENAI']::public.funcao_responsavel[];
  financeiro public.funcao_responsavel[] := ARRAY['Analista Financeiro','Interlocutora de Faturamento']::public.funcao_responsavel[];
BEGIN
  -- visita: Agente PJ + supervisores + coordenadores
  FOREACH v_func IN ARRAY (ARRAY['Agente de Mercado PJ']::public.funcao_responsavel[] || supervisores || coordenadores) LOOP
    INSERT INTO public.etapa_cargo_permissoes(etapa,funcao,pode_criar,pode_editar,pode_avancar)
    VALUES ('visita', v_func, true, true, true) ON CONFLICT DO NOTHING;
  END LOOP;

  -- proposta: Agente PJ + supervisores + coordenadores + backoffice
  FOREACH v_func IN ARRAY (ARRAY['Agente de Mercado PJ']::public.funcao_responsavel[] || supervisores || coordenadores || backoffice) LOOP
    INSERT INTO public.etapa_cargo_permissoes(etapa,funcao,pode_criar,pode_editar,pode_avancar)
    VALUES ('proposta', v_func, false, true, true) ON CONFLICT DO NOTHING;
  END LOOP;

  -- supervisor: supervisores + coordenadores
  FOREACH v_func IN ARRAY (supervisores || coordenadores) LOOP
    INSERT INTO public.etapa_cargo_permissoes(etapa,funcao,pode_criar,pode_editar,pode_avancar)
    VALUES ('supervisor', v_func, false, true, true) ON CONFLICT DO NOTHING;
  END LOOP;

  -- rpc + execucao: backoffice + analista comercial + secretaria + interlocutora
  FOREACH v_etapa IN ARRAY ARRAY['rpc','execucao']::public.etapa_contrato[] LOOP
    FOREACH v_func IN ARRAY (backoffice || ARRAY['Analista Comercial']::public.funcao_responsavel[] || secretaria || ARRAY['Interlocutora de Faturamento']::public.funcao_responsavel[]) LOOP
      INSERT INTO public.etapa_cargo_permissoes(etapa,funcao,pode_criar,pode_editar,pode_avancar)
      VALUES (v_etapa, v_func, false, true, true) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- matricula: secretaria + supervisores + analista + interlocutora
  FOREACH v_func IN ARRAY (secretaria || supervisores || ARRAY['Analista Comercial','Interlocutora de Faturamento']::public.funcao_responsavel[]) LOOP
    INSERT INTO public.etapa_cargo_permissoes(etapa,funcao,pode_criar,pode_editar,pode_avancar)
    VALUES ('matricula', v_func, false, true, true) ON CONFLICT DO NOTHING;
  END LOOP;

  -- ensalamento: pcp + analista + interlocutora
  FOREACH v_func IN ARRAY (pcp || ARRAY['Analista Comercial','Interlocutora de Faturamento']::public.funcao_responsavel[]) LOOP
    INSERT INTO public.etapa_cargo_permissoes(etapa,funcao,pode_criar,pode_editar,pode_avancar)
    VALUES ('ensalamento', v_func, false, true, true) ON CONFLICT DO NOTHING;
  END LOOP;

  -- faturamento: financeiro + analista + coordenadores
  FOREACH v_func IN ARRAY (financeiro || ARRAY['Analista Comercial']::public.funcao_responsavel[] || coordenadores) LOOP
    INSERT INTO public.etapa_cargo_permissoes(etapa,funcao,pode_criar,pode_editar,pode_avancar)
    VALUES ('faturamento', v_func, false, true, true) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 3. Função de consulta
CREATE OR REPLACE FUNCTION public.pode_lancar_etapa(
  _user_id uuid,
  _etapa public.etapa_contrato,
  _acao text
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_funcao public.funcao_responsavel;
  v_ok boolean;
BEGIN
  SELECT r.funcao INTO v_funcao
  FROM public.responsaveis r
  WHERE r.user_id = _user_id AND r.ativo = true
  LIMIT 1;

  IF v_funcao IS NULL THEN RETURN false; END IF;

  SELECT CASE _acao
    WHEN 'criar' THEN pode_criar
    WHEN 'editar' THEN pode_editar
    WHEN 'avancar' THEN pode_avancar
    ELSE false
  END INTO v_ok
  FROM public.etapa_cargo_permissoes
  WHERE etapa = _etapa AND funcao = v_funcao
  LIMIT 1;

  RETURN COALESCE(v_ok, false);
END;
$$;

-- 4. Atualiza can_edit_contrato para consultar a matriz
CREATE OR REPLACE FUNCTION public.can_edit_contrato(_user_id uuid, _contrato_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_agente uuid;
  v_resp uuid;
  v_finalized boolean;
  v_etapa public.etapa_contrato;
BEGIN
  SELECT agente_pj_id, (finalized_at IS NOT NULL), etapa_atual
    INTO v_agente, v_finalized, v_etapa
  FROM public.contratos WHERE id = _contrato_id;

  IF public.is_admin(_user_id) OR public.is_coordenador(_user_id) THEN
    RETURN TRUE;
  END IF;

  IF v_finalized THEN RETURN FALSE; END IF;

  IF public.is_backoffice(_user_id) THEN RETURN TRUE; END IF;

  -- Matriz dinâmica
  IF public.pode_lancar_etapa(_user_id, v_etapa, 'editar') THEN
    RETURN TRUE;
  END IF;

  -- Compat: supervisor na etapa supervisor
  IF v_etapa::text = 'supervisor' AND public.is_supervisor(_user_id) THEN
    RETURN TRUE;
  END IF;

  IF public.is_vendedor(_user_id) THEN
    SELECT id INTO v_resp FROM public.responsaveis WHERE user_id = _user_id LIMIT 1;
    RETURN v_resp IS NOT NULL AND v_agente = v_resp;
  END IF;

  RETURN FALSE;
END;
$$;
