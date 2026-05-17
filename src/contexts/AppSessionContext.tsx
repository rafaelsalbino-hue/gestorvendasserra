import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type SessionStatus = "loading" | "authenticated" | "recovering" | "expired" | "signed_out";

interface GuardedOperationOptions {
  operation: string;
  timeoutMs?: number;
  requiresAuth?: boolean;
}

interface AppSessionContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sessionStatus: SessionStatus;
  isOnline: boolean;
  isRecovering: boolean;
  stalledOperation: string | null;
  sessionMessage: string | null;
  ensureActiveSession: (forceRefresh?: boolean) => Promise<Session>;
  runGuarded: <T>(task: () => Promise<T>, options: GuardedOperationOptions) => Promise<T>;
  logoutFailsafe: (reason?: string) => Promise<void>;
}

const AppSessionContext = createContext<AppSessionContextValue | undefined>(undefined);

const AUTH_TIMEOUT_MS = 12_000;
const DEFAULT_OPERATION_TIMEOUT_MS = 20_000;
const REFRESH_BUFFER_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function isAuthFailure(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code ?? "") : "";
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  return (
    code === "401" ||
    code === "403" ||
    code === "PGRST301" ||
    message.includes("jwt") ||
    message.includes("session") ||
    message.includes("token") ||
    message.includes("auth") ||
    message.includes("refresh") ||
    message.includes("not authenticated")
  );
}

function isTransientFailure(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout") ||
    message.includes("offline") ||
    message.includes("abort") ||
    message.includes("temporar")
  );
}

function clearQueryCaches(queryClient: QueryClient) {
  queryClient.cancelQueries();
  queryClient.clear();
}

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("loading");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [stalledOperation, setStalledOperation] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const refreshPromiseRef = useRef<Promise<Session> | null>(null);
  const healthCheckTimerRef = useRef<number | null>(null);

  const applySession = useCallback((nextSession: Session | null, event: AuthChangeEvent | "MANUAL") => {

    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    setLoading(false);

    if (nextSession?.user) {
      setSessionStatus("authenticated");
      setSessionMessage(null);
      setStalledOperation(null);
      return;
    }

    setSessionStatus(event === "INITIAL_SESSION" ? "signed_out" : "expired");
    setSessionMessage(event === "SIGNED_OUT" ? "Sua sessão foi encerrada." : "Sua sessão expirou. Faça login novamente.");
  }, []);

  const logoutFailsafe = useCallback(async (reason = "Sessão encerrada por segurança.") => {
    console.warn("[session] logout failsafe", { reason });
    setSessionStatus("expired");
    setSessionMessage(reason);

    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    if (signOutError) {
      console.warn("[session] local signOut returned error", signOutError);
    }

    clearQueryCaches(queryClient);
    applySession(null, "MANUAL");
    navigate("/auth", { replace: true });
  }, [applySession, navigate, queryClient]);

  const ensureActiveSession = useCallback(async (forceRefresh = false) => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const run = async () => {
      const { data: sessionData, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        "A verificação da sessão excedeu o tempo esperado."
      );

      if (sessionError) {
        throw sessionError;
      }

      const currentSession = sessionData.session;
      if (!currentSession) {
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      const expiresAtMs = (currentSession.expires_at ?? 0) * 1000;
      const shouldRefresh =
        forceRefresh || !expiresAtMs || expiresAtMs - Date.now() < REFRESH_BUFFER_MS;

      if (!shouldRefresh) {
        applySession(currentSession, "MANUAL");
        return currentSession;
      }

      setSessionStatus("recovering");
      setSessionMessage("Reconectando sua sessão...");

      const { data: refreshedData, error: refreshError } = await withTimeout(
        supabase.auth.refreshSession(),
        AUTH_TIMEOUT_MS,
        "A renovação da sessão excedeu o tempo esperado."
      );

      if (refreshError || !refreshedData.session) {
        throw refreshError ?? new Error("Não foi possível renovar sua sessão.");
      }

      applySession(refreshedData.session, "MANUAL");
      return refreshedData.session;
    };

    refreshPromiseRef.current = run()
      .catch(async (error) => {
        console.error("[session] ensureActiveSession failed", error);
        if (isAuthFailure(error)) {
          await logoutFailsafe("Sua sessão expirou ou ficou inconsistente. Entre novamente para continuar.");
        }
        throw error;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    return refreshPromiseRef.current;
  }, [applySession, logoutFailsafe]);

  const runGuarded = useCallback(async <T,>(task: () => Promise<T>, options: GuardedOperationOptions) => {
    const { operation, timeoutMs = DEFAULT_OPERATION_TIMEOUT_MS, requiresAuth = true } = options;
    const startedAt = performance.now();
    let timeoutHandle: number | null = null;


    try {
      if (requiresAuth) {
        await ensureActiveSession();
      }

      timeoutHandle = window.setTimeout(() => {
        console.warn("[guarded] stalled", { operation, timeoutMs });
        setStalledOperation(operation);
        setSessionMessage("A operação está demorando mais do que o normal. Tentando recuperar...");
      }, timeoutMs);

      const result = await task();
      const durationMs = Math.round(performance.now() - startedAt);
      setStalledOperation((current) => (current === operation ? null : current));
      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      console.error("[guarded] error", { operation, durationMs, error });

      if (isAuthFailure(error)) {
        try {
          await ensureActiveSession(true);
          const retried = await task();
          setStalledOperation((current) => (current === operation ? null : current));
          return retried;
        } catch (retryError) {
          console.error("[guarded] retry after auth refresh failed", { operation, retryError });
          throw retryError;
        }
      }

      if (isTransientFailure(error)) {
        setSessionMessage("Sua conexão ficou instável. Tente novamente em instantes.");
      }

      throw error;
    } finally {
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    }
  }, [ensureActiveSession]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      window.setTimeout(() => {
        applySession(nextSession, event);
        if (event === "SIGNED_OUT") {
          clearQueryCaches(queryClient);
          navigate("/auth", { replace: true });
        }
      }, 0);
    });

    window.setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
        if (error) {
          console.error("[session] initial getSession failed", error);
          setLoading(false);
          setSessionStatus("expired");
          setSessionMessage("Não foi possível restaurar sua sessão.");
          return;
        }

        applySession(initialSession, "INITIAL_SESSION");
      });
    }, 0);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        ensureActiveSession().catch((error) => {
          console.warn("[session] visible revalidation failed", error);
        });
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setSessionMessage(null);
      ensureActiveSession().catch((error) => {
        console.warn("[session] online recovery failed", error);
      });
    };

    const handleOffline = () => {
      console.warn("[session] network offline");
      setIsOnline(false);
      setSessionMessage("Você está offline. Algumas ações podem falhar até a conexão voltar.");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    healthCheckTimerRef.current = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      ensureActiveSession().catch((error) => {
        console.warn("[session] periodic health check failed", error);
      });
    }, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (healthCheckTimerRef.current !== null) {
        window.clearInterval(healthCheckTimerRef.current);
      }
    };
  }, [applySession, ensureActiveSession, navigate, queryClient]);

  const value = useMemo<AppSessionContextValue>(() => ({
    user,
    session,
    loading,
    sessionStatus,
    isOnline,
    isRecovering: sessionStatus === "recovering",
    stalledOperation,
    sessionMessage,
    ensureActiveSession,
    runGuarded,
    logoutFailsafe,
  }), [ensureActiveSession, isOnline, loading, logoutFailsafe, runGuarded, session, sessionMessage, sessionStatus, stalledOperation, user]);

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const context = useContext(AppSessionContext);
  if (!context) {
    throw new Error("useAppSession must be used within AppSessionProvider");
  }
  return context;
}