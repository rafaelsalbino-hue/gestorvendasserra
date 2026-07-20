CREATE OR REPLACE FUNCTION public.reset_proposta_sla_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Reset SLA da etapa atual (qualquer etapa) ao adicionar comentário
  UPDATE public.contratos
    SET etapa_updated_at = now(),
        data_entrada_etapa_proposta = CASE
          WHEN etapa_atual = 'crm' THEN now()
          ELSE data_entrada_etapa_proposta
        END
    WHERE id = NEW.contrato_id;
  RETURN NEW;
END;
$function$;