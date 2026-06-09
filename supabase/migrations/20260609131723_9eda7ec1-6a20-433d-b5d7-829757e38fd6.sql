DROP POLICY IF EXISTS "Gestores can delete contratos" ON public.contratos;

CREATE POLICY "Delete contratos by role and stage" ON public.contratos
  FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (
      public.is_backoffice(auth.uid())
      AND etapa_atual::text IN ('visita', 'proposta')
      AND finalized_at IS NULL
    )
  );