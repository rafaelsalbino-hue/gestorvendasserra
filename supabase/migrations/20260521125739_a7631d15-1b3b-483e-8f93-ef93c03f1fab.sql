
-- 1. Add 'backoffice' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'backoffice';

-- 2. Add subdivisao column to contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS subdivisao text;

-- 3. Create unit_subdivisions table
CREATE TABLE IF NOT EXISTS public.unit_subdivisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_name text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.unit_subdivisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read unit_subdivisions"
  ON public.unit_subdivisions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Gestores manage unit_subdivisions"
  ON public.unit_subdivisions FOR ALL
  TO authenticated
  USING (public.is_gestor(auth.uid()))
  WITH CHECK (public.is_gestor(auth.uid()));

-- 4. Seed default subdivisions for SESI Saúde
INSERT INTO public.unit_subdivisions (unit_name, name) VALUES
  ('SESI Saúde', 'Promoção de Saúde'),
  ('SESI Saúde', 'Saúde Assistencial'),
  ('SESI Saúde', 'SST'),
  ('SESI Saúde', 'NRs')
ON CONFLICT DO NOTHING;

-- 5. Update handle_new_user to assign 'backoffice' role for Backoffice Comercial
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_responsavel_id uuid;
  v_funcao public.funcao_responsavel;
  v_role public.app_role;
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

  IF v_funcao IN ('Coordenador de Mercado', 'Analista Comercial') THEN
    v_role := 'gestor';
  ELSIF v_funcao = 'Backoffice Comercial' THEN
    v_role := 'backoffice';
  ELSE
    v_role := 'operador';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$function$;
