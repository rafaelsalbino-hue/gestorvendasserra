DROP POLICY IF EXISTS "Insert contratos" ON public.contratos;

CREATE POLICY "Insert contratos"
ON public.contratos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);