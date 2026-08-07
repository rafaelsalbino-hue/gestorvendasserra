CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_responsavel_id uuid;
  v_funcao public.funcao_responsavel;
  v_domain text;
  v_whatsapp text;
  v_allowed text[] := ARRAY[
    'sc.senai.br','edu.sc.senai.br','fiesc.com.br',
    'sesisc.org.br','edu.sesisc.org.br'
  ];
BEGIN
  v_domain := lower(split_part(COALESCE(NEW.email, ''), '@', 2));
  IF v_domain = '' OR NOT (v_domain = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Domínio de e-mail não autorizado: %', v_domain
      USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_funcao := (NEW.raw_user_meta_data->>'funcao')::public.funcao_responsavel;
  EXCEPTION WHEN OTHERS THEN
    v_funcao := 'Backoffice SESI Educação'::public.funcao_responsavel;
  END;

  v_whatsapp := NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'whatsapp',''), '\D', '', 'g'), '');

  INSERT INTO public.responsaveis (nome, email, funcao, user_id, whatsapp)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    v_funcao,
    NEW.id,
    v_whatsapp
  )
  RETURNING id INTO new_responsavel_id;

  INSERT INTO public.profiles (id, email, nome, responsavel_id, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    new_responsavel_id,
    v_whatsapp
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;