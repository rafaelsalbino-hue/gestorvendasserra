import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppSession } from "@/contexts/AppSessionContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;
type ContratoInsert = TablesInsert<"contratos">;
type ContratoUpdate = TablesUpdate<"contratos">;
type ContractMutationError = { code?: string; message?: string };

export function useContratos(entidade?: "SESI" | "SENAI" | "SESI Saúde") {
  const qc = useQueryClient();
  const { runGuarded } = useAppSession();

  const query = useQuery({
    queryKey: ["contratos", entidade],
    queryFn: async () => runGuarded(async () => {
      let q = supabase.from("contratos").select("*").is("deleted_at", null).order("created_at", { ascending: false });
      if (entidade) q = q.eq("entidade", entidade);
      const { data, error } = await q;
      if (error) throw error;
      return (data as Contrato[]).filter((c: any) => c.status_proposta_crm !== "Cancelada");
    }, { operation: `contratos.list.${entidade ?? "all"}`, timeoutMs: 15000 }),
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    const channelName = `contratos-realtime-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "contratos" }, () => {
        qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "none" });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

export function useContratosArquivados() {
  const { runGuarded } = useAppSession();
  return useQuery({
    queryKey: ["contratos", "arquivados"],
    queryFn: async () => runGuarded(async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .or("deleted_at.not.is.null,status_proposta_crm.eq.Cancelada")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Contrato[];
    }, { operation: "contratos.arquivados", timeoutMs: 15000 }),
    staleTime: 1000 * 30,
  });
}

export function useSoftDeleteContrato() {
  const qc = useQueryClient();
  const { runGuarded } = useAppSession();
  return useMutation({
    mutationFn: async (id: string) => runGuarded(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("contratos")
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Contrato;
    }, { operation: `contratos.softDelete.${id}`, timeoutMs: 15000 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
    },
  });
}

export function useRestaurarContrato() {
  const qc = useQueryClient();
  const { runGuarded } = useAppSession();
  return useMutation({
    mutationFn: async (id: string) => runGuarded(async () => {
      const { data, error } = await supabase
        .from("contratos")
        .update({ deleted_at: null, deleted_by: null, status_proposta_crm: "" } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Contrato;
    }, { operation: `contratos.restore.${id}`, timeoutMs: 15000 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
    },
  });
}

export function useAddContrato() {
  const qc = useQueryClient();
  const { ensureActiveSession, runGuarded } = useAppSession();

  return useMutation({
    mutationFn: async (c: ContratoInsert) => {
      const id =
        c.id ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const payload: ContratoInsert = { ...c, id } as ContratoInsert;
      const t0 = performance.now();
      const trace = `contrato:${id.slice(0, 8)}`;

      const isTransient = (err: ContractMutationError | null | undefined) => {
        const code = err?.code || "";
        const msg = (err?.message || "").toLowerCase();
        return (
          code === "PGRST301" ||
          code === "401" ||
          msg.includes("jwt") ||
          msg.includes("session") ||
          msg.includes("auth") ||
          msg.includes("network") ||
          msg.includes("fetch") ||
          msg.includes("timeout") ||
          msg.includes("temporarily")
        );
      };

      const verifyPersisted = async (): Promise<Contrato | null> => runGuarded(async () => {
        await ensureActiveSession();
        const { data, error } = await supabase.from("contratos").select("*").eq("id", id).maybeSingle();
        if (error) {
          console.warn(`[${trace}] verify error`, error);
          return null;
        }
        return (data as Contrato) ?? null;
      }, { operation: `contratos.verify.${id}`, timeoutMs: 12000 });

      let lastError: ContractMutationError | Error | null = null;
      const MAX_ATTEMPTS = 3;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const ta = performance.now();

        try {
          const data = await runGuarded(async () => {
            const { data, error } = await supabase.from("contratos").insert(payload).select("*").maybeSingle();

            if (!error && data) {
              return data as Contrato;
            }

            if (error?.code === "23505") {
              const existing = await verifyPersisted();
              if (existing) return existing;
            }

            if (!error && !data) {
              const existing = await verifyPersisted();
              if (existing) return existing;
            }

            throw error ?? new Error("Resposta vazia do servidor");
          }, { operation: `contratos.create.${id}.attempt${attempt}`, timeoutMs: 20000 });

          return data;
        } catch (err: unknown) {
          const normalizedError = err instanceof Error
            ? err
            : new Error(typeof err === "string" ? err : "Erro desconhecido ao salvar contrato");

          lastError = normalizedError;
          console.warn(`[${trace}] attempt ${attempt} failed`, err);

          const existing = await verifyPersisted();
          if (existing) {
            return existing;
          }

          const errorCode = (err as ContractMutationError | null)?.code;
          const errorMessage = `${(err as ContractMutationError | null)?.message || normalizedError.message}`.toLowerCase();
          if (!isTransient({ code: errorCode, message: errorMessage }) || attempt === MAX_ATTEMPTS) {
            break;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(3, attempt - 1)));
      }

      const finalCheck = await verifyPersisted();
      if (finalCheck) {
        return finalCheck;
      }

      console.error(`[${trace}] FAILED`, { totalMs: Math.round(performance.now() - t0), lastError });
      throw new Error(
        lastError?.message
          ? `Falha ao salvar contrato: ${lastError.message}`
          : "Não foi possível salvar o contrato. Verifique sua conexão e tente novamente."
      );
    },
    onSuccess: (novo) => {
      qc.setQueriesData<Contrato[]>({ queryKey: ["contratos"] }, (old) => {
        if (!old) return [novo as Contrato];
        if (old.some((c) => c.id === (novo as Contrato).id)) return old;
        return [novo as Contrato, ...old];
      });
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "none" });
    },
  });
}

export function useUpdateContrato() {
  const qc = useQueryClient();
  const { runGuarded } = useAppSession();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContratoUpdate & { id: string }) => runGuarded(async () => {
      const { data, error } = await supabase.from("contratos").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Contrato;
    }, { operation: `contratos.update.${id}`, timeoutMs: 20000 }),
    onSuccess: (atualizado) => {
      qc.setQueriesData<Contrato[]>({ queryKey: ["contratos"] }, (old) => {
        if (!old) return old;
        return old.map((c) => (c.id === (atualizado as Contrato).id ? (atualizado as Contrato) : c));
      });
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "none" });
    },
  });
}

export function useDeleteContrato() {
  const qc = useQueryClient();
  const { runGuarded } = useAppSession();

  return useMutation({
    mutationFn: async (id: string) => runGuarded(async () => {
      const { error } = await supabase.from("contratos").delete().eq("id", id);
      if (error) throw error;
      return id;
    }, { operation: `contratos.delete.${id}`, timeoutMs: 20000 }),
    onSuccess: (id) => {
      qc.setQueriesData<Contrato[]>({ queryKey: ["contratos"] }, (old) => {
        if (!old) return old;
        return old.filter((c) => c.id !== id);
      });
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "none" });
    },
  });
}