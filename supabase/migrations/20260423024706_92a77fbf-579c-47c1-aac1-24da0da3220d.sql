-- 1. Criar bucket privado para anexos de contratos
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-anexos', 'contratos-anexos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabela de metadados dos anexos
CREATE TABLE IF NOT EXISTS public.contrato_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploader_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contrato_anexos_contrato_id 
  ON public.contrato_anexos(contrato_id);

ALTER TABLE public.contrato_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read anexos"
  ON public.contrato_anexos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated insert anexos"
  ON public.contrato_anexos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploader or gestor delete anexos"
  ON public.contrato_anexos FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_gestor(auth.uid()));

-- 3. RLS no bucket de storage
CREATE POLICY "Authenticated read contratos-anexos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'contratos-anexos');

CREATE POLICY "Authenticated upload contratos-anexos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contratos-anexos');

CREATE POLICY "Authenticated delete contratos-anexos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'contratos-anexos');