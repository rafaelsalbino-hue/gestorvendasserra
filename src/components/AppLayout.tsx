import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
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
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
