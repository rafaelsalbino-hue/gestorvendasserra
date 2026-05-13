import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAppSession } from "@/contexts/AppSessionContext";

type Responsavel = Tables<"responsaveis">;

interface CurrentUserContextType {
  currentUser: Responsavel | null;
  loading: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextType>({
  currentUser: null,
  loading: true,
});

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { user } = useAppSession();
  const [currentUser, setCurrentUser] = useState<Responsavel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCurrentUser = async (userId?: string | null) => {
      if (!userId) {
        if (!mounted) return;
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("responsaveis")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.warn("Erro ao carregar responsável atual:", error.message);
        setCurrentUser(null);
      } else {
        setCurrentUser(data);
      }
      setLoading(false);
    };

    setLoading(true);
    loadCurrentUser(user?.id ?? null);

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <CurrentUserContext.Provider value={{ currentUser, loading }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
