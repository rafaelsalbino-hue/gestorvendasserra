DROP TRIGGER IF EXISTS tg_reset_sla_on_contrato_comentario ON public.contrato_comentarios;

CREATE TRIGGER tg_reset_sla_on_contrato_comentario
AFTER INSERT ON public.contrato_comentarios
FOR EACH ROW
EXECUTE FUNCTION public.reset_proposta_sla_on_comment();