-- 1) Add 'visita' as first value in etapa_contrato enum
ALTER TYPE public.etapa_contrato ADD VALUE IF NOT EXISTS 'visita' BEFORE 'proposta';

-- 2) Add new columns to contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS data_visita date,
  ADD COLUMN IF NOT EXISTS observacoes_visita text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_contratos_deleted_at ON public.contratos(deleted_at);

-- 3) Allow all authenticated users to soft-delete (via UPDATE) — keep gestor hard-delete policy
-- Existing UPDATE policy already allows all authenticated; no change needed.

-- 4) Add is_system flag on comments to make auto-comments immutable
ALTER TABLE public.contrato_comentarios
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- Replace update/delete policies to block edits on system comments
DROP POLICY IF EXISTS "Authors or gestores update comments" ON public.contrato_comentarios;
DROP POLICY IF EXISTS "Authors or gestores delete comments" ON public.contrato_comentarios;

CREATE POLICY "Authors or gestores update comments"
ON public.contrato_comentarios
FOR UPDATE
TO authenticated
USING (
  is_system = false AND (
    is_gestor(auth.uid())
    OR autor_nome = (SELECT nome FROM responsaveis WHERE user_id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY "Authors or gestores delete comments"
ON public.contrato_comentarios
FOR DELETE
TO authenticated
USING (
  is_system = false AND (
    is_gestor(auth.uid())
    OR autor_nome = (SELECT nome FROM responsaveis WHERE user_id = auth.uid() LIMIT 1)
  )
);