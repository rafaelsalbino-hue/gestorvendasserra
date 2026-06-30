CREATE OR REPLACE FUNCTION public.reset_proposta_sla_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contratos
    SET data_entrada_etapa_proposta = now()
    WHERE id = NEW.contrato_id
      AND etapa_atual = 'proposta';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_reset_proposta_sla_on_comment ON public.contrato_comentarios;
CREATE TRIGGER tg_reset_proposta_sla_on_comment
AFTER INSERT ON public.contrato_comentarios
FOR EACH ROW EXECUTE FUNCTION public.reset_proposta_sla_on_comment();