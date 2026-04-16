-- Add agente_pj_id to contratos
ALTER TABLE public.contratos 
ADD COLUMN agente_pj_id uuid REFERENCES public.responsaveis(id) ON DELETE SET NULL;

-- Add etapa_updated_at for SLA tracking
ALTER TABLE public.contratos 
ADD COLUMN etapa_updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Create trigger to auto-update etapa_updated_at when etapa changes
CREATE OR REPLACE FUNCTION public.update_etapa_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.etapa_atual IS DISTINCT FROM NEW.etapa_atual THEN
    NEW.etapa_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_contratos_etapa_timestamp
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_etapa_timestamp();

-- Create comments table
CREATE TABLE public.contrato_comentarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  texto text NOT NULL,
  autor_nome text NOT NULL DEFAULT '',
  autor_funcao text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contrato_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comments"
  ON public.contrato_comentarios FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert comments"
  ON public.contrato_comentarios FOR INSERT
  TO authenticated WITH CHECK (true);