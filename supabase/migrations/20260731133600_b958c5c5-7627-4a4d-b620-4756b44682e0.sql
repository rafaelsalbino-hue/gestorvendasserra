ALTER TABLE public.notificacao_permissoes
  DROP CONSTRAINT IF EXISTS notificacao_permissoes_etapa_funcao_canal_entidade_key;

ALTER TABLE public.notificacao_permissoes
  ADD CONSTRAINT notificacao_permissoes_etapa_funcao_canal_entidade_rota_key
  UNIQUE (etapa, funcao, canal, entidade, rota);

ALTER TABLE public.notificacao_permissoes
  DROP CONSTRAINT IF EXISTS notificacao_permissoes_entidade_check;

ALTER TABLE public.notificacao_permissoes
  ADD CONSTRAINT notificacao_permissoes_entidade_check
  CHECK (entidade = ANY (ARRAY['SESI Educação'::text, 'SENAI'::text, 'SESI Saúde'::text, 'REDE'::text]));