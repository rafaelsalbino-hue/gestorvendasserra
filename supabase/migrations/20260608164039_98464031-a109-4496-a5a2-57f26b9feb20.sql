
-- Restrict overwrites in contratos-anexos to file owner or gestor
DROP POLICY IF EXISTS "contratos-anexos update owner or gestor" ON storage.objects;
CREATE POLICY "contratos-anexos update owner or gestor"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contratos-anexos'
  AND (auth.uid() = owner OR public.is_gestor(auth.uid()))
)
WITH CHECK (
  bucket_id = 'contratos-anexos'
  AND (auth.uid() = owner OR public.is_gestor(auth.uid()))
);

-- Restrict overwrites in contratos-arquivos to file owner or gestor
DROP POLICY IF EXISTS "contratos-arquivos update owner or gestor" ON storage.objects;
CREATE POLICY "contratos-arquivos update owner or gestor"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contratos-arquivos'
  AND (auth.uid() = owner OR public.is_gestor(auth.uid()))
)
WITH CHECK (
  bucket_id = 'contratos-arquivos'
  AND (auth.uid() = owner OR public.is_gestor(auth.uid()))
);
