
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
    WHEN 'finalizado' THEN 'Contrato finalizado'
    ELSE 'Aguardando próxima ação'
  END;
  RETURN NEW;
END;
$$;

-- Dispara em qualquer UPDATE para acompanhar avanços feitos por outros triggers BEFORE.
DROP TRIGGER IF EXISTS tg_compute_acao_esperada ON public.contratos;
CREATE TRIGGER tg_compute_acao_esperada
  BEFORE INSERT OR UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.compute_acao_esperada();

-- backfill
UPDATE public.contratos SET etapa_atual = etapa_atual;
