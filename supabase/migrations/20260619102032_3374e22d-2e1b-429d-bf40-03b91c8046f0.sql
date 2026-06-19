
-- 1) is_supervisor()
CREATE OR REPLACE FUNCTION public.is_supervisor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responsaveis r
    WHERE r.user_id = _user_id
      AND r.ativo = true
      AND r.funcao::text LIKE 'Supervisor%'
  )
$$;

-- 2) can_edit_contrato: permitir supervisor na etapa supervisor; coordenador já permitido.
CREATE OR REPLACE FUNCTION public.can_edit_contrato(_user_id uuid, _contrato_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agente uuid;
  v_resp uuid;
  v_finalized boolean;
  v_etapa text;
BEGIN
  SELECT agente_pj_id, (finalized_at IS NOT NULL), etapa_atual::text
    INTO v_agente, v_finalized, v_etapa
  FROM public.contratos WHERE id = _contrato_id;

  IF public.is_admin(_user_id) OR public.is_coordenador(_user_id) THEN
    RETURN TRUE;
  END IF;

  IF v_finalized THEN RETURN FALSE; END IF;

  IF public.is_backoffice(_user_id) THEN RETURN TRUE; END IF;

  -- Supervisor pode editar quando o contrato está na etapa "supervisor"
  IF v_etapa = 'supervisor' AND public.is_supervisor(_user_id) THEN
    RETURN TRUE;
  END IF;

  IF public.is_vendedor(_user_id) THEN
    SELECT id INTO v_resp FROM public.responsaveis WHERE user_id = _user_id LIMIT 1;
    RETURN v_resp IS NOT NULL AND v_agente = v_resp;
  END IF;

  RETURN FALSE;
END;
$$;

-- 3) acao_esperada coluna
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS acao_esperada text;

-- 4) função que computa acao_esperada
CREATE OR REPLACE FUNCTION public.compute_acao_esperada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.acao_esperada := CASE NEW.etapa_atual::text
    WHEN 'visita' THEN 'Aguardando envio dos dados da proposta pelo Agente PJ'
    WHEN 'proposta' THEN 'Aguardando elaboração/envio da proposta no CRM'
    WHEN 'supervisor' THEN 'Aguardando aprovação do Supervisor SESI/SENAI'
    WHEN 'rpc' THEN 'Aguardando emissão do RPC pelo Backoffice'
    WHEN 'execucao' THEN 'Aguardando atualização de status do RPC'
    WHEN 'matricula' THEN 'Aguardando cadastro/dados dos estudantes pela Secretaria'
    WHEN 'ensalamento' THEN 'Aguardando ensalamento pelo PCP'
    WHEN 'faturamento' THEN 'Aguardando faturamento pelo Analista Financeiro'
    ELSE 'Aguardando próxima ação'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_compute_acao_esperada ON public.contratos;
CREATE TRIGGER tg_compute_acao_esperada
  BEFORE INSERT OR UPDATE OF etapa_atual ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.compute_acao_esperada();

-- backfill
UPDATE public.contratos SET etapa_atual = etapa_atual;

-- 5) Auto-advance visita → proposta quando dados_proposta = 'Dados entregues'
CREATE OR REPLACE FUNCTION public.auto_advance_visita_proposta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.etapa_atual::text = 'visita'
     AND NEW.dados_proposta = 'Dados entregues'
     AND (OLD.dados_proposta IS DISTINCT FROM NEW.dados_proposta
          OR OLD.etapa_atual IS DISTINCT FROM NEW.etapa_atual) THEN
    NEW.etapa_atual := 'proposta'::etapa_contrato;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_auto_advance_visita_proposta ON public.contratos;
CREATE TRIGGER tg_auto_advance_visita_proposta
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.auto_advance_visita_proposta();
