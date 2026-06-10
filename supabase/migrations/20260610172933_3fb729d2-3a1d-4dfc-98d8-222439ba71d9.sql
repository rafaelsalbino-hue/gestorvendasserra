
-- 1. New columns on contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS ultima_movimentacao_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ultima_movimentacao_por text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_entrada_etapa_proposta timestamptz;

-- 2. Backfill
UPDATE public.contratos SET ultima_movimentacao_at = GREATEST(updated_at, etapa_updated_at, created_at) WHERE ultima_movimentacao_at < updated_at;
UPDATE public.contratos SET data_entrada_etapa_proposta = etapa_updated_at WHERE etapa_atual = 'proposta' AND data_entrada_etapa_proposta IS NULL;

-- 3. Trigger: bump ultima_movimentacao_at when comentario / anexo / arquivo inserted
CREATE OR REPLACE FUNCTION public.bump_ultima_movimentacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text := '';
BEGIN
  IF TG_TABLE_NAME = 'contrato_comentarios' THEN
    v_nome := COALESCE(NEW.autor_nome, '');
  ELSIF TG_TABLE_NAME = 'contrato_anexos' OR TG_TABLE_NAME = 'contrato_arquivos' THEN
    v_nome := COALESCE(NEW.uploader_nome, '');
  END IF;

  UPDATE public.contratos
    SET ultima_movimentacao_at = now(),
        ultima_movimentacao_por = v_nome
    WHERE id = NEW.contrato_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_bump_mov_comentario ON public.contrato_comentarios;
CREATE TRIGGER tg_bump_mov_comentario
AFTER INSERT ON public.contrato_comentarios
FOR EACH ROW EXECUTE FUNCTION public.bump_ultima_movimentacao();

DROP TRIGGER IF EXISTS tg_bump_mov_anexo ON public.contrato_anexos;
CREATE TRIGGER tg_bump_mov_anexo
AFTER INSERT ON public.contrato_anexos
FOR EACH ROW EXECUTE FUNCTION public.bump_ultima_movimentacao();

DROP TRIGGER IF EXISTS tg_bump_mov_arquivo ON public.contrato_arquivos;
CREATE TRIGGER tg_bump_mov_arquivo
AFTER INSERT ON public.contrato_arquivos
FOR EACH ROW EXECUTE FUNCTION public.bump_ultima_movimentacao();

-- 4. Trigger: data_entrada_etapa_proposta when etapa moves to/away from 'proposta'
CREATE OR REPLACE FUNCTION public.registrar_entrada_proposta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.etapa_atual = 'proposta' AND (OLD.etapa_atual IS DISTINCT FROM 'proposta') THEN
    NEW.data_entrada_etapa_proposta := now();
  ELSIF NEW.etapa_atual IS DISTINCT FROM 'proposta' AND OLD.etapa_atual = 'proposta' THEN
    NEW.data_entrada_etapa_proposta := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_entrada_proposta ON public.contratos;
CREATE TRIGGER tg_entrada_proposta
BEFORE UPDATE ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.registrar_entrada_proposta();

-- Also handle inserts that start at 'proposta'
CREATE OR REPLACE FUNCTION public.registrar_entrada_proposta_ins()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.etapa_atual = 'proposta' AND NEW.data_entrada_etapa_proposta IS NULL THEN
    NEW.data_entrada_etapa_proposta := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_entrada_proposta_ins ON public.contratos;
CREATE TRIGGER tg_entrada_proposta_ins
BEFORE INSERT ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.registrar_entrada_proposta_ins();
