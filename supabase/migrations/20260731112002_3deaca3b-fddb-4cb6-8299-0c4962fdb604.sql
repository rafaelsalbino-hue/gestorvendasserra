CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('processar-fila-whatsapp');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'processar-fila-whatsapp',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cdhrcapdjuwxjbcvjmcy.supabase.co/functions/v1/processar-fila-whatsapp',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaHJjYXBkanV3eGpiY3ZqbWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4Mzc4NDQsImV4cCI6MjA5MTQxMzg0NH0.PgFGGdvqsKDq_odlhXLCzcATmPTBwVSb5Ir9vlAc86s"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);