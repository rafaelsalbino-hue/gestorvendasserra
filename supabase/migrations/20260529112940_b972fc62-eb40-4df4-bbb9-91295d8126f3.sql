
-- Rodada 5: RBAC ampliado + SESI Educação + Finalização + Auditoria

-- 1) Novos valores de enum
ALTER TYPE public.entidade_type ADD VALUE IF NOT EXISTS 'SESI Educação';
ALTER TYPE public.etapa_contrato ADD VALUE IF NOT EXISTS 'finalizado';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'secretaria';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'interlocutora';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador';
