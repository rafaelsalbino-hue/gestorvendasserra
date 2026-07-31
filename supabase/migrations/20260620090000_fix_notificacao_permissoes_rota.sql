-- Rota fazia parte da chave lógica mas não do índice único, impedindo
-- cadastrar permissões da rota "crm_direto" (CRM → Proposta sem supervisor).
ALTER TABLE public.notificacao_permissoes
  DROP CONSTRAINT IF EXISTS notificacao_permissoes_etapa_funcao_canal_entidade_key;

ALTER TABLE public.notificacao_permissoes
  ADD CONSTRAINT notificacao_permissoes_etapa_funcao_canal_entidade_rota_key
  UNIQUE (etapa, funcao, canal, entidade, rota);

-- Entidade REDE não era aceita na matriz, então contratos REDE não notificavam ninguém.
ALTER TABLE public.notificacao_permissoes
  DROP CONSTRAINT IF EXISTS notificacao_permissoes_entidade_check;

ALTER TABLE public.notificacao_permissoes
  ADD CONSTRAINT notificacao_permissoes_entidade_check
  CHECK (entidade = ANY (ARRAY['SESI Educação'::text, 'SENAI'::text, 'SESI Saúde'::text, 'REDE'::text]));
