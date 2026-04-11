
-- Create enum for entidade
CREATE TYPE public.entidade_type AS ENUM ('SESI', 'SENAI');

-- Create enum for funcao
CREATE TYPE public.funcao_responsavel AS ENUM (
  'Agente de Mercado PJ',
  'Supervisor SESI',
  'Supervisor SENAI',
  'Backoffice Comercial',
  'Secretaria',
  'PCP',
  'Analista Financeiro'
);

-- Create enum for etapa
CREATE TYPE public.etapa_contrato AS ENUM (
  'proposta',
  'rpc',
  'execucao',
  'matricula',
  'ensalamento',
  'faturamento'
);

-- Create responsaveis table
CREATE TABLE public.responsaveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  funcao public.funcao_responsavel NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contratos table
CREATE TABLE public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entidade public.entidade_type NOT NULL,
  cliente TEXT NOT NULL,
  cnpj TEXT NOT NULL DEFAULT '',
  dados_proposta TEXT NOT NULL DEFAULT '',
  crm TEXT NOT NULL DEFAULT '',
  servico_produto TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  planilha_info_gerais TEXT NOT NULL DEFAULT '',
  status_proposta_crm TEXT NOT NULL DEFAULT '',
  numero_rpc TEXT NOT NULL DEFAULT '',
  info_execucao TEXT NOT NULL DEFAULT '',
  status_rpc TEXT NOT NULL DEFAULT '',
  observacao_terceiro TEXT NOT NULL DEFAULT '',
  dados_estudantes TEXT NOT NULL DEFAULT '',
  cadastro_estudantes TEXT NOT NULL DEFAULT '',
  ensalamento_pcp TEXT NOT NULL DEFAULT '',
  abertura_chamado TEXT NOT NULL DEFAULT '',
  numero_chamado TEXT NOT NULL DEFAULT '',
  execucao_faturamento TEXT NOT NULL DEFAULT '',
  etapa_atual public.etapa_contrato NOT NULL DEFAULT 'proposta',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth yet)
CREATE POLICY "Allow all access to responsaveis" ON public.responsaveis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contratos" ON public.contratos FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
CREATE TRIGGER update_responsaveis_updated_at
  BEFORE UPDATE ON public.responsaveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
