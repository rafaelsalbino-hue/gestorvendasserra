
-- 1) ENUM de papéis do app (separado das funções de negócio)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('gestor', 'operador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Tabela de papéis (NUNCA armazenar role no profiles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Funções SECURITY DEFINER para evitar recursão em RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'gestor')
$$;

-- 4) Policies para user_roles
DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_gestor(auth.uid()));

DROP POLICY IF EXISTS "Gestores manage roles" ON public.user_roles;
CREATE POLICY "Gestores manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_gestor(auth.uid()))
  WITH CHECK (public.is_gestor(auth.uid()));

-- 5) Reforçar handle_new_user (nunca quebrar cadastro)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_responsavel_id uuid;
  v_funcao public.funcao_responsavel;
  v_role public.app_role;
BEGIN
  -- Tentar parsear função; se inválido, usar fallback seguro
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

  -- Atribuir papel com base na função
  IF v_funcao IN ('Coordenador de Mercado', 'Analista Comercial') THEN
    v_role := 'gestor';
  ELSE
    v_role := 'operador';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW; -- Nunca bloquear o cadastro
END;
$$;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6) Backfill: dar papel a usuários existentes
INSERT INTO public.user_roles (user_id, role)
SELECT r.user_id,
  CASE WHEN r.funcao IN ('Coordenador de Mercado', 'Analista Comercial')
       THEN 'gestor'::public.app_role
       ELSE 'operador'::public.app_role END
FROM public.responsaveis r
WHERE r.user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 7) Reforçar policies em CONTRATOS (apenas gestor pode deletar)
DROP POLICY IF EXISTS "Authenticated users can delete contratos" ON public.contratos;
CREATE POLICY "Gestores can delete contratos" ON public.contratos
  FOR DELETE TO authenticated USING (public.is_gestor(auth.uid()));

-- 8) RESPONSAVEIS: somente gestores podem alterar
DROP POLICY IF EXISTS "Authenticated users can insert responsaveis" ON public.responsaveis;
DROP POLICY IF EXISTS "Authenticated users can update responsaveis" ON public.responsaveis;
DROP POLICY IF EXISTS "Authenticated users can delete responsaveis" ON public.responsaveis;

CREATE POLICY "Gestores insert responsaveis" ON public.responsaveis
  FOR INSERT TO authenticated WITH CHECK (public.is_gestor(auth.uid()));
CREATE POLICY "Gestores update responsaveis" ON public.responsaveis
  FOR UPDATE TO authenticated
  USING (public.is_gestor(auth.uid()) OR user_id = auth.uid())
  WITH CHECK (public.is_gestor(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Gestores delete responsaveis" ON public.responsaveis
  FOR DELETE TO authenticated USING (public.is_gestor(auth.uid()));

-- 9) COMENTARIOS: autor ou gestor pode editar/deletar
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.contrato_comentarios;
CREATE POLICY "Authenticated users insert comments" ON public.contrato_comentarios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authors or gestores update comments" ON public.contrato_comentarios
  FOR UPDATE TO authenticated
  USING (
    public.is_gestor(auth.uid())
    OR autor_nome = (SELECT nome FROM public.responsaveis WHERE user_id = auth.uid() LIMIT 1)
  );
CREATE POLICY "Authors or gestores delete comments" ON public.contrato_comentarios
  FOR DELETE TO authenticated
  USING (
    public.is_gestor(auth.uid())
    OR autor_nome = (SELECT nome FROM public.responsaveis WHERE user_id = auth.uid() LIMIT 1)
  );

-- 10) Índices para performance
CREATE INDEX IF NOT EXISTS idx_contratos_etapa ON public.contratos(etapa_atual);
CREATE INDEX IF NOT EXISTS idx_contratos_entidade ON public.contratos(entidade);
CREATE INDEX IF NOT EXISTS idx_contratos_agente_pj ON public.contratos(agente_pj_id);
CREATE INDEX IF NOT EXISTS idx_contratos_created ON public.contratos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_contrato ON public.contrato_comentarios(contrato_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_historico_contrato ON public.contratos_historico(contrato_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responsaveis_user ON public.responsaveis(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
