
-- 1) Novos campos em contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS instrutor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dias_execucao text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS horario_inicio time NULL,
  ADD COLUMN IF NOT EXISTS horario_fim time NULL;

-- 2) Bucket privado para arquivos categorizados (chamado, planilhas, etc)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-arquivos', 'contratos-arquivos', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Tabela de arquivos categorizados
CREATE TABLE IF NOT EXISTS public.contrato_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('chamado_faturamento','planilha_alunos')),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT '',
  uploaded_by uuid NULL,
  uploader_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contrato_arquivos_contrato ON public.contrato_arquivos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_arquivos_categoria ON public.contrato_arquivos(contrato_id, categoria);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_arquivos TO authenticated;
GRANT ALL ON public.contrato_arquivos TO service_role;

ALTER TABLE public.contrato_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read contrato_arquivos"
  ON public.contrato_arquivos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert contrato_arquivos"
  ON public.contrato_arquivos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploader or gestor delete contrato_arquivos"
  ON public.contrato_arquivos FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_gestor(auth.uid()));

-- 4) Storage policies para o bucket
CREATE POLICY "Authenticated read contratos-arquivos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contratos-arquivos');

CREATE POLICY "Authenticated upload contratos-arquivos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contratos-arquivos' AND auth.uid() = owner);

CREATE POLICY "Owner or gestor delete contratos-arquivos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contratos-arquivos' AND (auth.uid() = owner OR public.is_gestor(auth.uid())));

-- 5) Trigger de histórico: registra inserção/remoção de arquivos
CREATE OR REPLACE FUNCTION public.log_contrato_arquivo_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.contratos_historico(contrato_id, campo, valor_anterior, valor_novo, usuario_nome, usuario_funcao)
    VALUES (NEW.contrato_id, 'arquivo:' || NEW.categoria, NULL, NEW.file_name, NEW.uploader_nome, 'upload');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.contratos_historico(contrato_id, campo, valor_anterior, valor_novo, usuario_nome, usuario_funcao)
    VALUES (OLD.contrato_id, 'arquivo:' || OLD.categoria, OLD.file_name, NULL, OLD.uploader_nome, 'delete');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_contrato_arquivo_change ON public.contrato_arquivos;
CREATE TRIGGER trg_log_contrato_arquivo_change
  AFTER INSERT OR DELETE ON public.contrato_arquivos
  FOR EACH ROW EXECUTE FUNCTION public.log_contrato_arquivo_change();
