-- Add SESI Saúde to entidade_type enum
ALTER TYPE public.entidade_type ADD VALUE IF NOT EXISTS 'SESI Saúde';

-- Add Coordenador de Mercado and Analista Comercial to funcao_responsavel enum
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Coordenador de Mercado';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Analista Comercial';
