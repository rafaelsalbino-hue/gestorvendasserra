
-- 1) Notificacoes: restringir INSERT (somente para si mesmo; service_role bypassa RLS)
DROP POLICY IF EXISTS "Authenticated insert notificacoes" ON public.notificacoes;
CREATE POLICY "Users insert own notificacoes"
ON public.notificacoes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2) Contrato_comentarios: autoria por ID (não por nome)
ALTER TABLE public.contrato_comentarios
  ADD COLUMN IF NOT EXISTS autor_id uuid;

-- backfill best-effort: mapear pelo nome do responsável vinculado a user
UPDATE public.contrato_comentarios c
SET autor_id = r.user_id
FROM public.responsaveis r
WHERE c.autor_id IS NULL
  AND r.nome = c.autor_nome
  AND r.user_id IS NOT NULL;

DROP POLICY IF EXISTS "Authenticated users insert comments" ON public.contrato_comentarios;
DROP POLICY IF EXISTS "Authors or gestores update comments" ON public.contrato_comentarios;
DROP POLICY IF EXISTS "Authors or gestores delete comments" ON public.contrato_comentarios;

CREATE POLICY "Authenticated insert comments by self"
ON public.contrato_comentarios
FOR INSERT TO authenticated
WITH CHECK (autor_id = auth.uid());

CREATE POLICY "Authors or gestores update comments"
ON public.contrato_comentarios
FOR UPDATE TO authenticated
USING (is_system = false AND (autor_id = auth.uid() OR public.is_gestor(auth.uid())))
WITH CHECK (is_system = false AND (autor_id = auth.uid() OR public.is_gestor(auth.uid())));

CREATE POLICY "Authors or gestores delete comments"
ON public.contrato_comentarios
FOR DELETE TO authenticated
USING (is_system = false AND (autor_id = auth.uid() OR public.is_gestor(auth.uid())));

-- 3) handle_new_user: nunca conceder admin/gestor por metadado do cliente.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_responsavel_id uuid;
  v_funcao public.funcao_responsavel;
BEGIN
  BEGIN
    v_funcao := (NEW.raw_user_meta_data->>'funcao')::public.funcao_responsavel;
  EXCEPTION WHEN OTHERS THEN
    v_funcao := 'Backoffice Comercial';
  END;

  INSERT INTO public.responsaveis (nome, email, funcao, user_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    v_funcao,
    NEW.id
  )
  RETURNING id INTO new_responsavel_id;

  INSERT INTO public.profiles (id, email, nome, responsavel_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    new_responsavel_id
  )
  ON CONFLICT (id) DO NOTHING;

  -- SEGURANÇA: novos cadastros sempre recebem papel mínimo 'operador'.
  -- Promoção a backoffice/coordenador/admin/gestor é feita manualmente por um gestor.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;

-- 4) Revogar EXECUTE de anon nas funções SECURITY DEFINER expostas via API.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_gestor(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_backoffice(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_coordenador(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_vendedor(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_edit_contrato(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.responsavel_id_of(uuid) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gestor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_backoffice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coordenador(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_vendedor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_contrato(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.responsavel_id_of(uuid) TO authenticated;
