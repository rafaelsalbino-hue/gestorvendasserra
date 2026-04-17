import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "gestor" | "operador";

/**
 * Lê os papéis do usuário autenticado a partir da tabela segura `user_roles`.
 * Use `isGestor` no frontend para esconder ações de exclusão/admin.
 * IMPORTANTE: a checagem real de permissão é feita pelas RLS no banco.
 */
export function useUserRole() {
  const query = useQuery({
    queryKey: ["user-roles"],
    queryFn: async (): Promise<AppRole[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return [];
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", session.user.id);
      if (error) {
        console.warn("Erro ao carregar papéis:", error.message);
        return [];
      }
      return (data ?? []).map((r: any) => r.role as AppRole);
    },
    staleTime: 1000 * 60 * 5,
  });

  const roles = query.data ?? [];
  return {
    roles,
    isGestor: roles.includes("gestor"),
    loading: query.isLoading,
  };
}
