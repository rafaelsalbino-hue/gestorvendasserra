
-- Passo 1: limpar dados que apontam para enums obsoletos
UPDATE public.responsaveis SET ativo = false
WHERE funcao::text IN (
  'Supervisor SENAI','Supervisor SESI','Coordenador Comercial',
  'Coordenador SESI/SENAI','Backoffice','Backoffice Comercial',
  'Secretaria','PCP'
);

DELETE FROM public.etapa_cargo_permissoes
WHERE funcao::text IN (
  'Supervisor SENAI','Supervisor SESI','Coordenador Comercial',
  'Coordenador SESI/SENAI','Backoffice','Backoffice Comercial',
  'Secretaria','PCP'
);

-- Passo 2: atualizar handle_new_user para não usar default obsoleto
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Passo 3: recriar enum sem valores obsoletos
ALTER TYPE public.funcao_responsavel RENAME TO funcao_responsavel_old;

CREATE TYPE public.funcao_responsavel AS ENUM (
  'Agente de Mercado PJ',
  'Analista Financeiro',
  'Coordenador de Mercado',
  'Analista Comercial',
  'Gerente Regional',
  'Interlocutora de Faturamento',
  'Supervisor SENAI — Lages Cursos Técnicos',
  'Supervisor SENAI — Lages Cursos de Qualificação',
  'Supervisor SENAI — Correia Pinto',
  'Supervisor SENAI — Otacílio Costa',
  'Supervisor SESI Saúde — SST',
  'Supervisor SESI Saúde — Promoção de Saúde',
  'Supervisor SESI Saúde — Saúde Assistencial',
  'Supervisor SESI Educação — ACE',
  'Supervisor SESI Educação — Maker',
  'Coordenador SENAI',
  'Coordenador SESI Saúde',
  'Coordenador SESI Expansão',
  'Coordenador Comercial SENAI',
  'Secretaria Escolar',
  'PCP SESI',
  'PCP SENAI',
  'Backoffice SESI Saúde',
  'Backoffice SESI Educação',
  'Backoffice SENAI'
);

-- Cast colunas. Linhas com valores obsoletos foram apenas desativadas / deletadas acima,
-- então precisamos limpá-las antes do cast (responsaveis ainda tem o valor antigo).
-- Estratégia: remapear os obsoletos para 'Agente de Mercado PJ' (placeholder); admin
-- ajustará. Esses responsáveis já estão ativo=false.
ALTER TABLE public.responsaveis
  ALTER COLUMN funcao TYPE public.funcao_responsavel
  USING (
    CASE
      WHEN funcao::text IN (
        'Supervisor SENAI','Supervisor SESI','Coordenador Comercial',
        'Coordenador SESI/SENAI','Backoffice','Backoffice Comercial',
        'Secretaria','PCP'
      ) THEN 'Agente de Mercado PJ'::public.funcao_responsavel
      ELSE funcao::text::public.funcao_responsavel
    END
  );

ALTER TABLE public.etapa_cargo_permissoes
  ALTER COLUMN funcao TYPE public.funcao_responsavel
  USING funcao::text::public.funcao_responsavel;

DROP TYPE public.funcao_responsavel_old;
