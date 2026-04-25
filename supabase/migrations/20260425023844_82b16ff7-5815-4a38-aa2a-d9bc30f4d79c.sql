
-- 1. Trigger: criar profile/responsavel/role automaticamente em novo signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Trigger: atualizar etapa_updated_at quando etapa muda
DROP TRIGGER IF EXISTS trg_update_etapa_timestamp ON public.contratos;
CREATE TRIGGER trg_update_etapa_timestamp
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_etapa_timestamp();

-- 3. Trigger: atualizar updated_at em contratos
DROP TRIGGER IF EXISTS trg_contratos_updated_at ON public.contratos;
CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Trigger: atualizar updated_at em responsaveis
DROP TRIGGER IF EXISTS trg_responsaveis_updated_at ON public.responsaveis;
CREATE TRIGGER trg_responsaveis_updated_at
  BEFORE UPDATE ON public.responsaveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Trigger: atualizar updated_at em profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. BACKFILL: criar responsaveis para usuários auth.users que não têm
INSERT INTO public.responsaveis (nome, email, funcao, user_id)
SELECT
  COALESCE(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)) AS nome,
  COALESCE(u.email, '') AS email,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'funcao','')::public.funcao_responsavel,
    'Backoffice Comercial'::public.funcao_responsavel
  ) AS funcao,
  u.id AS user_id
FROM auth.users u
LEFT JOIN public.responsaveis r ON r.user_id = u.id
WHERE r.id IS NULL
  AND u.email IS NOT NULL;

-- 7. BACKFILL: profiles
INSERT INTO public.profiles (id, email, nome, responsavel_id)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
  r.id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.responsaveis r ON r.user_id = u.id
WHERE p.id IS NULL;

-- 8. BACKFILL: user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT
  u.id,
  CASE
    WHEN COALESCE(u.raw_user_meta_data->>'funcao','') IN ('Coordenador de Mercado','Analista Comercial')
      THEN 'gestor'::public.app_role
    ELSE 'operador'::public.app_role
  END
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
