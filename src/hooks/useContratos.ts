import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;
type ContratoInsert = TablesInsert<"contratos">;
type ContratoUpdate = TablesUpdate<"contratos">;
type ContractMutationError = { code?: string; message?: string };

export function useContratos(entidade?: "SESI" | "SENAI" | "SESI Saúde") {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["contratos", entidade],
    queryFn: async () => {
      let q = supabase.from("contratos").select("*").order("created_at", { ascending: false });
      if (entidade) q = q.eq("entidade", entidade);
      const { data, error } = await q;
      if (error) throw error;
      return data as Contrato[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // REALTIME: invalida o cache quando outro usuário cria/edita/exclui contratos
  // Usa um nome de canal único para evitar conflitos quando o hook é montado em múltiplas páginas
  useEffect(() => {
    const channelName = `contratos-realtime-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contratos" },
        () => {
          // Marca como stale, mas só refetcha quando a query for usada novamente
          qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "none" });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

export function useAddContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: ContratoInsert) => {
      const ensureActiveSession = async (forceRefresh = false) => {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const currentSession = sessionData.session;
        if (!currentSession) {
          throw new Error("Sua sessão expirou. Entre novamente para salvar o contrato.");
        }

        const expiresAtMs = (currentSession.expires_at ?? 0) * 1000;
        const shouldRefresh =
          forceRefresh ||
          !expiresAtMs ||
          expiresAtMs - Date.now() < 60_000;

        if (!shouldRefresh) {
          return currentSession;
        }

        const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedData.session) {
          throw new Error("Sua sessão expirou. Entre novamente para salvar o contrato.");
        }

        return refreshedData.session;
      };

      // FLUXO RESILIENTE DE PERSISTÊNCIA
      // 1) Gera o id do contrato no cliente -> garante IDEMPOTÊNCIA em retries.
      //    Se a primeira chamada chegar ao servidor mas a resposta se perder
      //    (rede instável), o retry com o mesmo id resulta em conflito de PK,
      //    que tratamos como "já persistido" e buscamos a linha existente.
      // 2) Retry com backoff exponencial apenas para erros transitórios.
      // 3) Verificação final por SELECT para confirmar persistência real
      //    antes de qualquer atualização de UI.
      const id =
        c.id ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const payload: ContratoInsert = { ...c, id } as ContratoInsert;
      const t0 = performance.now();
      const trace = `contrato:${id.slice(0, 8)}`;
      console.info(`[${trace}] submit started`, { entidade: payload.entidade, cliente: payload.cliente });

      const isTransient = (err: ContractMutationError | null | undefined) => {
        const code = err?.code || "";
        const msg = (err?.message || "").toLowerCase();
        return (
          code === "PGRST301" || // JWT expired (será resolvido com refresh)
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

      const verifyPersisted = async (): Promise<Contrato | null> => {
        await ensureActiveSession();
        const { data, error } = await supabase
          .from("contratos")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) {
          console.warn(`[${trace}] verify error`, error);
          return null;
        }
        return (data as Contrato) ?? null;
      };

      let lastError: ContractMutationError | Error | null = null;
      const MAX_ATTEMPTS = 3;
      await ensureActiveSession();

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const ta = performance.now();
        try {
          const { data, error } = await supabase
            .from("contratos")
            .insert(payload)
            .select("*")
            .maybeSingle();
          const dt = Math.round(performance.now() - ta);

          if (!error && data) {
            console.info(`[${trace}] persisted (attempt ${attempt}, ${dt}ms)`);
            return data as Contrato;
          }

          // Conflito de chave primária = registro já existe (retry duplicado)
          if (error?.code === "23505") {
            console.info(`[${trace}] duplicate id, fetching existing row`);
            const existing = await verifyPersisted();
            if (existing) return existing;
          }

          // Resposta vazia sem erro: pode ter persistido — confirma via SELECT
          if (!error && !data) {
            const existing = await verifyPersisted();
            if (existing) {
              console.info(`[${trace}] confirmed via select`);
              return existing;
            }
          }

          lastError = error ?? new Error("Resposta vazia do servidor");
          console.warn(`[${trace}] attempt ${attempt} failed (${dt}ms)`, lastError);

          if (error?.code === "PGRST301" || error?.code === "401") {
            console.warn(`[${trace}] refreshing expired session before retry`);
            await ensureActiveSession(true);
          }

          if (!isTransient(lastError) || attempt === MAX_ATTEMPTS) break;
        } catch (err: unknown) {
          const normalizedError = err instanceof Error
            ? err
            : new Error(typeof err === "string" ? err : "Erro desconhecido ao salvar contrato");

          lastError = err;
          console.warn(`[${trace}] attempt ${attempt} threw`, err);

          const errorCode = (err as ContractMutationError | null)?.code;
          const errorMessage = `${(err as ContractMutationError | null)?.message || normalizedError.message}`.toLowerCase();

          if (errorCode === "PGRST301" || errorCode === "401" || errorMessage.includes("session")) {
            console.warn(`[${trace}] refreshing expired session after thrown error`);
            try {
              await ensureActiveSession(true);
            } catch (refreshError) {
              lastError = refreshError;
            }
          }

          // Antes de desistir, verifica se já foi persistido
          const existing = await verifyPersisted();
          if (existing) {
            console.info(`[${trace}] persisted despite throw`);
            return existing;
          }
          if (!isTransient({ code: errorCode, message: errorMessage }) || attempt === MAX_ATTEMPTS) break;
        }
        // Backoff exponencial: 400ms, 1200ms
        await new Promise((r) => setTimeout(r, 400 * Math.pow(3, attempt - 1)));
      }

      // Última verificação antes de reportar falha — evita falso negativo
      const finalCheck = await verifyPersisted();
      if (finalCheck) {
        console.info(`[${trace}] recovered via final check`);
        return finalCheck;
      }

      const totalMs = Math.round(performance.now() - t0);
      console.error(`[${trace}] FAILED after ${MAX_ATTEMPTS} attempts (${totalMs}ms)`, lastError);
      throw new Error(
        lastError?.message
          ? `Falha ao salvar contrato: ${lastError.message}`
          : "Não foi possível salvar o contrato. Verifique sua conexão e tente novamente."
      );
    },
    onSuccess: (novo) => {
      // Atualização otimista: insere o novo contrato no cache sem refetch
      qc.setQueriesData<Contrato[]>({ queryKey: ["contratos"] }, (old) => {
        if (!old) return [novo as Contrato];
        // Evita duplicar se realtime já inseriu
        if (old.some((c) => c.id === (novo as Contrato).id)) return old;
        return [novo as Contrato, ...old];
      });
      // Invalida em background (não bloqueia o isPending do botão)
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "none" });
    },
  });
}

export function useUpdateContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ContratoUpdate & { id: string }) => {
      const { data, error } = await supabase.from("contratos").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
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
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contratos").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.setQueriesData<Contrato[]>({ queryKey: ["contratos"] }, (old) => {
        if (!old) return old;
        return old.filter((c) => c.id !== id);
      });
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "none" });
    },
  });
}
