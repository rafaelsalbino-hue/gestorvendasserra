DROP POLICY IF EXISTS "Authenticated users can insert historico" ON public.contratos_historico;
CREATE POLICY "Insert historico only for editable contratos"
  ON public.contratos_historico
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_contrato(auth.uid(), contrato_id));

DROP POLICY IF EXISTS "Uploader or gestor can update contrato_arquivos" ON public.contrato_arquivos;
CREATE POLICY "Uploader or gestor can update contrato_arquivos"
  ON public.contrato_arquivos
  FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_gestor(auth.uid()))
  WITH CHECK (uploaded_by = auth.uid() OR public.is_gestor(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read contratos-arquivos" ON storage.objects;
CREATE POLICY "Read contratos-arquivos by contract access"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contratos-arquivos'
    AND EXISTS (
      SELECT 1 FROM public.contrato_arquivos a
      WHERE a.storage_path = storage.objects.name
    )
  );