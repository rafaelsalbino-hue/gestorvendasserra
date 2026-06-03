ALTER TABLE public.contrato_arquivos DROP CONSTRAINT IF EXISTS contrato_arquivos_categoria_check;
ALTER TABLE public.contrato_arquivos ADD CONSTRAINT contrato_arquivos_categoria_check
  CHECK (categoria = ANY (ARRAY['chamado_faturamento'::text, 'planilha_alunos'::text, 'turmas_adicionais'::text]));