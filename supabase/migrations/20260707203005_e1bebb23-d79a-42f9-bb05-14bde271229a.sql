-- Rename existing 'proposta' etapa to 'crm' (the current UI "Proposta / CRM" corresponds to this stage).
ALTER TYPE public.etapa_contrato RENAME VALUE 'proposta' TO 'crm';

-- Add new 'proposta' value (position 4 in pipeline, after 'supervisor').
ALTER TYPE public.etapa_contrato ADD VALUE 'proposta' AFTER 'supervisor';

-- New columns in contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS observacoes_crm text,
  ADD COLUMN IF NOT EXISTS prazo_crm_dias integer DEFAULT 4,
  ADD COLUMN IF NOT EXISTS valor_final_proposta numeric,
  ADD COLUMN IF NOT EXISTS arquivo_proposta_url text,
  ADD COLUMN IF NOT EXISTS observacoes_proposta text;

-- Update functions that referenced the old 'proposta' literal
CREATE OR REPLACE FUNCTION public.compute_acao_esperada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.acao_esperada := CASE NEW.etapa_atual::text
    WHEN 'visita' THEN 'Aguardando envio dos dados da proposta pelo Agente PJ'
    WHEN 'crm' THEN 'Aguardando registro/atualização no CRM 365'
    WHEN 'supervisor' THEN 'Aguardando aprovação do Supervisor SESI/SENAI'
    WHEN 'proposta' THEN 'Aguardando formalização da proposta comercial'
    WHEN 'rpc' THEN 'Aguardando emissão do RPC pelo Backoffice'
    WHEN 'execucao' THEN 'Aguardando atualização de status do RPC'
    WHEN 'matricula' THEN 'Aguardando cadastro/dados dos estudantes pela Secretaria'
    WHEN 'ensalamento' THEN 'Aguardando ensalamento pelo PCP'
    WHEN 'faturamento' THEN 'Aguardando faturamento pelo Analista Financeiro'
    WHEN 'finalizado' THEN 'Contrato finalizado'
    ELSE 'Aguardando próxima ação'
  END;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_entrada_proposta()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.etapa_atual = 'crm' AND (OLD.etapa_atual IS DISTINCT FROM 'crm') THEN
    NEW.data_entrada_etapa_proposta := now();
  ELSIF NEW.etapa_atual IS DISTINCT FROM 'crm' AND OLD.etapa_atual = 'crm' THEN
    NEW.data_entrada_etapa_proposta := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_entrada_proposta_ins()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.etapa_atual = 'crm' AND NEW.data_entrada_etapa_proposta IS NULL THEN
    NEW.data_entrada_etapa_proposta := now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_advance_visita_proposta()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.etapa_atual::text = 'visita'
     AND NEW.dados_proposta = 'Dados entregues'
     AND (OLD.dados_proposta IS DISTINCT FROM NEW.dados_proposta
          OR OLD.etapa_atual IS DISTINCT FROM NEW.etapa_atual) THEN
    NEW.etapa_atual := 'crm'::etapa_contrato;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_proposta_sla_on_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.contratos
    SET data_entrada_etapa_proposta = now()
    WHERE id = NEW.contrato_id
      AND etapa_atual = 'crm';
  RETURN NEW;
END;
$function$;