
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all access to contratos" ON public.contratos;
DROP POLICY IF EXISTS "Allow all access to responsaveis" ON public.responsaveis;
DROP POLICY IF EXISTS "Allow all access to contratos_historico" ON public.contratos_historico;

-- Contratos: authenticated users only
CREATE POLICY "Authenticated users can read contratos"
  ON public.contratos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contratos"
  ON public.contratos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update contratos"
  ON public.contratos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contratos"
  ON public.contratos FOR DELETE
  TO authenticated
  USING (true);

-- Responsaveis: authenticated users only
CREATE POLICY "Authenticated users can read responsaveis"
  ON public.responsaveis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert responsaveis"
  ON public.responsaveis FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update responsaveis"
  ON public.responsaveis FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete responsaveis"
  ON public.responsaveis FOR DELETE
  TO authenticated
  USING (true);

-- Contratos historico: authenticated users read + insert
CREATE POLICY "Authenticated users can read historico"
  ON public.contratos_historico FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert historico"
  ON public.contratos_historico FOR INSERT
  TO authenticated
  WITH CHECK (true);
