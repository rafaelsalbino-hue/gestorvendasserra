
-- Garante REPLICA IDENTITY FULL para o realtime entregar dados completos
ALTER TABLE public.contratos REPLICA IDENTITY FULL;

-- Adiciona contratos à publicação realtime (ignora erro se já estiver)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contratos;
  EXCEPTION WHEN duplicate_object THEN
    -- já estava
    NULL;
  END;
END $$;
