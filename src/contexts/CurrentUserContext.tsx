import { createContext, useContext, useState, ReactNode } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Responsavel = Tables<"responsaveis">;

interface CurrentUserContextType {
  currentUser: Responsavel | null;
  setCurrentUser: (user: Responsavel | null) => void;
}

const CurrentUserContext = createContext<CurrentUserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
});

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Responsavel | null>(null);
  return (
    <CurrentUserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
