-- 1) Adiciona 'supervisor' ao enum etapa_contrato, entre 'proposta' e 'rpc'.
ALTER TYPE public.etapa_contrato ADD VALUE IF NOT EXISTS 'supervisor' BEFORE 'rpc';

-- 2) Colunas da nova etapa Supervisor em contratos (a spec mencionava 'visitas', mas o projeto usa 'contratos').
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS sup_carga_horaria varchar(50),
  ADD COLUMN IF NOT EXISTS sup_data_inicio date,
  ADD COLUMN IF NOT EXISTS sup_data_termino date,
  ADD COLUMN IF NOT EXISTS sup_num_participantes integer,
  ADD COLUMN IF NOT EXISTS sup_dias_horarios text,
  ADD COLUMN IF NOT EXISTS sup_conteudo_programatico text,
  ADD COLUMN IF NOT EXISTS sup_avaliacao_frequencia_nota boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sup_avaliacao_frequencia boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sup_cr_pj varchar(100),
  ADD COLUMN IF NOT EXISTS sup_sugestao_professor varchar(100),
  ADD COLUMN IF NOT EXISTS sup_local_execucao varchar(200),
  ADD COLUMN IF NOT EXISTS sup_finalizado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sup_finalizado_at timestamptz,
  ADD COLUMN IF NOT EXISTS sup_finalizado_by uuid REFERENCES auth.users(id);

-- 3) Trigger de notificações de mudança de etapa: incluir 'supervisor'.
CREATE OR REPLACE FUNCTION public.notify_contrato_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_funcoes TEXT[];
  v_titulo TEXT;
  v_mensagem TEXT;
  v_tipo TEXT;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;

  IF OLD.etapa_atual IS DISTINCT FROM NEW.etapa_atual THEN
    v_tipo := 'etapa';
    v_titulo := 'Contrato avançou de etapa';
    v_mensagem := NEW.cliente || ' — ' || OLD.etapa_atual::text || ' → ' || NEW.etapa_atual::text;

    v_funcoes := CASE NEW.etapa_atual::text
      WHEN 'proposta' THEN ARRAY['Agente de Mercado PJ','Supervisor SESI','Supervisor SENAI']
      WHEN 'supervisor' THEN ARRAY['Supervisor SESI','Supervisor SENAI']
      WHEN 'rpc' THEN ARRAY['Backoffice Comercial']
      WHEN 'execucao' THEN ARRAY['Backoffice Comercial']
      WHEN 'matricula' THEN ARRAY['Secretaria']
      WHEN 'ensalamento' THEN ARRAY['PCP']
      WHEN 'faturamento' THEN ARRAY['Analista Financeiro','Interlocutora de Faturamento']
      ELSE ARRAY[]::TEXT[]
    END;

    IF NEW.entidade::text = 'SENAI' THEN
      v_funcoes := array_remove(v_funcoes, 'Supervisor SESI');
    ELSIF NEW.entidade::text = 'SESI' OR NEW.entidade::text = 'SESI Saúde' THEN
      v_funcoes := array_remove(v_funcoes, 'Supervisor SENAI');
    END IF;

    INSERT INTO public.notificacoes (user_id, contrato_id, tipo, titulo, mensagem)
    SELECT r.user_id, NEW.id, v_tipo, v_titulo, v_mensagem
    FROM public.responsaveis r
    WHERE r.ativo = true
      AND r.user_id IS NOT NULL
      AND r.funcao::text = ANY(v_funcoes);
  END IF;

  RETURN NEW;
END;
$function$;