-- Add new role enum values for the cargo qualification
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Supervisor SENAI — Lages Cursos Técnicos';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Supervisor SENAI — Lages Cursos de Qualificação';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Supervisor SENAI — Correia Pinto';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Supervisor SENAI — Otacílio Costa';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Supervisor SESI Saúde — SST';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Supervisor SESI Saúde — Promoção de Saúde';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Supervisor SESI Saúde — Saúde Assistencial';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Supervisor SESI Educação — ACE';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Supervisor SESI Educação — Maker';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Coordenador SENAI';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Coordenador SESI Saúde';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Coordenador SESI Expansão';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Coordenador Comercial';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Backoffice';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Secretaria Escolar';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'PCP SESI';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'PCP SENAI';

-- Add new columns to profiles for entity / specialty / whatsapp
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS entidade_atuacao varchar(50),
  ADD COLUMN IF NOT EXISTS especialidade_atuacao varchar(100),
  ADD COLUMN IF NOT EXISTS whatsapp varchar(20);
