import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificacoesBell } from "@/components/NotificacoesBell";
import { Badge } from "@/components/ui/badge";
import { useAppSession } from "@/contexts/AppSessionContext";
import { Loader2, ShieldAlert, WifiOff } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isOnline, isRecovering, sessionMessage, stalledOperation } = useAppSession();

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-3 sm:px-4 shrink-0 gap-2 sticky top-0 z-30">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <SidebarTrigger className="md:hidden shrink-0" aria-label="Abrir menu" />
              <div className="min-w-0 flex-1 max-w-md">
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
