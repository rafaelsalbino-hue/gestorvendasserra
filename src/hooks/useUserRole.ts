import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "gestor"
  | "coordenador"
  | "backoffice"
  | "vendedor"
  | "secretaria"
  | "interlocutora"
  | "operador";

/**
 * Lê os papéis do usuário autenticado a partir da tabela segura `user_roles`.
 * Use `isGestor` no frontend para esconder ações de exclusão/admin.
 * IMPORTANTE: a checagem real de permissão é feita pelas RLS no banco.
 */
export function useUserRole() {
  const query = useQuery({
    queryKey: ["user-roles", "v2"],
    queryFn: async (): Promise<{ roles: AppRole[]; funcao: string | null }> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return { roles: [], funcao: null };
      const [{ data, error }, { data: resp }] = await Promise.all([
        supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", session.user.id),
        supabase
        .from("responsaveis")
        .select("funcao")
        .eq("user_id", session.user.id)
        .eq("ativo", true)
        .maybeSingle(),
      ]);
      if (error) {
        console.warn("Erro ao carregar papéis:", error.message);
        return { roles: [], funcao: (resp as any)?.funcao ?? null };
      }
      return {
        roles: (data ?? []).map((r: any) => r.role as AppRole),
        funcao: (resp as any)?.funcao ?? null,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const roles = query.data?.roles ?? [];
  const funcao = query.data?.funcao ?? null;
  const isSupervisor = !!funcao && typeof funcao === "string" && funcao.startsWith("Supervisor");
  return {
    roles,
    funcao,
    isGestor: roles.includes("gestor") || roles.includes("admin"),
    isAdmin: roles.includes("admin") || roles.includes("gestor"),
    isCoordenador: roles.includes("coordenador"),
    isBackoffice: roles.includes("backoffice"),
    isVendedor: roles.includes("vendedor"),
    isSecretaria: roles.includes("secretaria"),
    isInterlocutora: roles.includes("interlocutora"),
    isSupervisor,
    loading: query.isLoading,
  };
}
