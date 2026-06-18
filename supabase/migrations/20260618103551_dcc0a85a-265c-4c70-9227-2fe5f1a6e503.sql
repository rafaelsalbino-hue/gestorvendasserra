-- Adiciona os 3 novos cargos segmentados de Backoffice
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Backoffice SESI Saúde';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Backoffice SESI Educação';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Backoffice SENAI';

-- Atualiza a policy de exclusão para incluir a etapa "supervisor" (etapas 1 a 3).
-- O papel app_role 'backoffice' continua sendo o que dá direito; os cargos
-- segmentados são metadados de notificação, não roles de acesso.
DROP POLICY IF EXISTS "Delete contratos by role and stage" ON public.contratos;
CREATE POLICY "Delete contratos by role and stage"
ON public.contratos
FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (
    public.is_backoffice(auth.uid())
    AND (etapa_atual)::text IN ('visita', 'proposta', 'supervisor')
    AND finalized_at IS NULL
  )
);