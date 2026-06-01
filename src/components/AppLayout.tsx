import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificacoesBell } from "@/components/NotificacoesBell";
import { Badge } from "@/components/ui/badge";
import { useAppSession } from "@/contexts/AppSessionContext";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { Loader2, ShieldAlert, WifiOff, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const ROUTE_LABEL: Record<string, string> = {
  "/": "Dashboard",
  "/contratos": "Visitas / Contratos",
  "/responsaveis": "Responsáveis",
  "/arquivo": "Arquivo",
  "/conta": "Editar Conta",
};

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isOnline, isRecovering, sessionMessage, stalledOperation } = useAppSession();
  const { currentUser } = useCurrentUser();
  const { pathname } = useLocation();
  const currentLabel = ROUTE_LABEL[pathname] || pathname;
  const isRoot = pathname === "/";

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-3 sm:px-4 shrink-0 gap-2 sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <SidebarTrigger className="md:hidden shrink-0" aria-label="Abrir menu" />
              <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
                {!isRoot && (
                  <>
                    <ChevronRight className="h-3 w-3" aria-hidden />
                    <span className="font-medium text-foreground truncate max-w-[200px]">{currentLabel}</span>
                  </>
                )}
              </nav>
              <div className="min-w-0 flex-1 max-w-md ml-auto md:ml-2">
                <GlobalSearch />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <Badge variant="outline" className="gap-1.5">
                  <WifiOff className="h-3 w-3" /> Offline
                </Badge>
              )}
              {isRecovering && (
                <Badge variant="outline" className="gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Reconectando
                </Badge>
              )}
              {currentUser?.funcao && (
                <Badge variant="secondary" className="hidden lg:inline-flex text-[10px] px-2 py-0.5">
                  {currentUser.funcao}
                </Badge>
              )}
              <NotificacoesBell />
              <ThemeToggle />
            </div>
          </header>
          {(sessionMessage || stalledOperation) && (
            <div className="border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:px-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>{sessionMessage || `Recuperando a operação: ${stalledOperation}`}</span>
              </div>
            </div>
          )}
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
