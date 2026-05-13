import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppSession } from "@/contexts/AppSessionContext";

export function useAuth() {
  const { user, loading, runGuarded, logoutFailsafe } = useAppSession();

  const signIn = async (email: string, password: string) => {
    const { error } = await runGuarded(
      () => supabase.auth.signInWithPassword({ email, password }),
      { operation: "auth.signIn", requiresAuth: false, timeoutMs: 15000 }
    );
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, nome: string, funcao: string) => {
    const { error } = await runGuarded(
      () => supabase.auth.signUp({
        email,
        password,
        options: { data: { nome, funcao }, emailRedirectTo: window.location.origin },
      }),
      { operation: "auth.signUp", requiresAuth: false, timeoutMs: 15000 }
    );
    if (error) throw error;
  };

  const signOut = useCallback(async () => {
    await logoutFailsafe("Você saiu da aplicação.");
  }, [logoutFailsafe]);

  return { user, loading, signIn, signUp, signOut };
}
