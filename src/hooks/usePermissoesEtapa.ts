import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AcaoPermissao = "pode_criar" | "pode_editar" | "pode_avancar";

export interface PermissaoEtapa {
  id: string;
  etapa: string;
  funcao: string;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_avancar: boolean;
}

export function usePermissoesEtapa() {
  return useQuery({
    queryKey: ["etapa-cargo-permissoes"],
    queryFn: async (): Promise<PermissaoEtapa[]> => {
      const { data, error } = await supabase
        .from("etapa_cargo_permissoes" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as any;
    },
    staleTime: 1000 * 60,
  });
}

export function useTogglePermissaoEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      etapa: string;
      funcao: string;
      acao: AcaoPermissao;
      valor: boolean;
    }) => {
      // Upsert: garante linha mesmo se não existia
      const { error } = await supabase
        .from("etapa_cargo_permissoes" as any)
        .upsert(
          {
            etapa: params.etapa,
            funcao: params.funcao,
            [params.acao]: params.valor,
          } as any,
          { onConflict: "etapa,funcao" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa-cargo-permissoes"] });
    },
  });
}