DROP POLICY IF EXISTS "Users insert own notificacoes" ON public.notificacoes;
REVOKE INSERT ON public.notificacoes FROM authenticated;