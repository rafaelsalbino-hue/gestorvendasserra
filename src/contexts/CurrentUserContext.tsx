import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
  const [currentUser, setCurrentUser] = useState<Responsavel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("responsaveis")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();
        setCurrentUser(data);
      }
      setLoading(false);
    };

    loadCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from("responsaveis")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();
        setCurrentUser(data);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <CurrentUserContext.Provider value={{ currentUser, loading }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
