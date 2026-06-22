
-- Helper: can the user read this contrato? Mirrors SELECT policy on public.contratos.
CREATE OR REPLACE FUNCTION public.can_read_contrato(_user_id uuid, _contrato_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contratos c
    WHERE c.id = _contrato_id
      AND (
        (c.deleted_at IS NULL AND (
          public.is_admin(_user_id)
          OR public.is_backoffice(_user_id)
          OR public.is_coordenador(_user_id)
          OR public.has_role(_user_id, 'operador'::public.app_role)
          OR public.has_role(_user_id, 'secretaria'::public.app_role)
          OR public.has_role(_user_id, 'interlocutora'::public.app_role)
          OR (public.is_vendedor(_user_id) AND c.agente_pj_id = public.responsavel_id_of(_user_id))
        ))
        OR (c.deleted_at IS NOT NULL AND (public.is_admin(_user_id) OR public.is_coordenador(_user_id)))
      )
  );
$$;

-- Tighten storage SELECT policies: require access to the parent contrato.
DROP POLICY IF EXISTS "Read contratos-anexos by contract access" ON storage.objects;
CREATE POLICY "Read contratos-anexos by contract access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contratos-anexos'
  AND EXISTS (
    SELECT 1 FROM public.contrato_anexos a
    WHERE a.storage_path = storage.objects.name
      AND public.can_read_contrato(auth.uid(), a.contrato_id)
  )
);

DROP POLICY IF EXISTS "Read contratos-arquivos by contract access" ON storage.objects;
CREATE POLICY "Read contratos-arquivos by contract access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contratos-arquivos'
  AND EXISTS (
    SELECT 1 FROM public.contrato_arquivos a
    WHERE a.storage_path = storage.objects.name
      AND public.can_read_contrato(auth.uid(), a.contrato_id)
  )
);

-- notificacoes_whatsapp: explicit deny for client writes (only service_role writes).
CREATE POLICY "Deny client inserts on notificacoes_whatsapp"
ON public.notificacoes_whatsapp FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny client updates on notificacoes_whatsapp"
ON public.notificacoes_whatsapp FOR UPDATE TO authenticated, anon
USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes on notificacoes_whatsapp"
ON public.notificacoes_whatsapp FOR DELETE TO authenticated, anon
USING (false);
