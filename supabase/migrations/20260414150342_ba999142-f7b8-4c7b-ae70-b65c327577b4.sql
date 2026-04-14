
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_responsavel_id uuid;
BEGIN
  -- Create responsavel record
  INSERT INTO public.responsaveis (nome, email, funcao, user_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NEW.email,
    (NEW.raw_user_meta_data->>'funcao')::funcao_responsavel,
    NEW.id
  )
  RETURNING id INTO new_responsavel_id;

  -- Create profile linked to responsavel
  INSERT INTO public.profiles (id, email, nome, responsavel_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', ''), new_responsavel_id);

  RETURN NEW;
END;
$function$;
