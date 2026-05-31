
-- 1. Tighten storage policies for contratos-anexos bucket
DROP POLICY IF EXISTS "Authenticated upload contratos-anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete contratos-anexos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read contratos-anexos" ON storage.objects;

CREATE POLICY "Read contratos-anexos by contract access"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contratos-anexos'
  AND EXISTS (
    SELECT 1 FROM public.contrato_anexos a
    WHERE a.storage_path = storage.objects.name
  )
);

CREATE POLICY "Owner upload contratos-anexos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contratos-anexos' AND auth.uid() = owner);

CREATE POLICY "Owner or gestor delete contratos-anexos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contratos-anexos' AND (auth.uid() = owner OR public.is_gestor(auth.uid())));

-- 2. Remove client-side INSERT on audit_log (triggers use SECURITY DEFINER and bypass RLS)
DROP POLICY IF EXISTS "Authenticated insert audit_log" ON public.audit_log;
REVOKE INSERT ON public.audit_log FROM authenticated, anon;

-- 3. Add RLS on realtime.messages restricting channel subscriptions to authenticated users.
--    Row-level data is still filtered by RLS on the underlying tables (contratos, etc).
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated can use realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (true);
