import {
  FileText, Users, LayoutDashboard, Building2, UserCircle, LogOut,
  Settings, Archive, ChevronLeft, ChevronRight,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { cn } from "@/lib/utils";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; end?: boolean };

const PRIMARY_ITEMS: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
  { title: "Visitas / Contratos", url: "/contratos", icon: FileText },
  { title: "Arquivo", url: "/arquivo", icon: Archive },
];

const MANAGEMENT_ITEMS: NavItem[] = [
  { title: "Responsáveis", url: "/responsaveis", icon: Users },
  { title: "Editar Conta", url: "/conta", icon: Settings },
];

function NavItemRow({
  item, collapsed, onNavigate,
}: { item: NavItem; collapsed: boolean; onNavigate: () => void }) {
  const { pathname } = useLocation();
  const active = item.end ? pathname === item.url : pathname.startsWith(item.url);

  const inner = (
    <NavLink
      to={item.url}
      end={item.end}
      onClick={onNavigate}
      aria-label={item.title}
      className={cn(
        "relative flex items-center gap-3 rounded-md text-sm transition-colors",
        "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        collapsed ? "h-9 w-9 justify-center mx-auto" : "h-9 px-3",
        active && "bg-sidebar-accent text-sidebar-foreground font-medium",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r"
          style={{ background: "hsl(var(--sidebar-active-bar))" }}
        />
      )}
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </NavLink>
  );

  if (!collapsed) return inner;
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="right" className="font-medium">{item.title}</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const { currentUser } = useCurrentUser();
  const { user, signOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const isCollapsed = !isMobile && collapsed;

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <TooltipProvider>
      <Sidebar
        collapsible={isMobile ? "offcanvas" : "none"}
        className={cn(
          "transition-[width] duration-200 ease-out",
          !isMobile && (isCollapsed ? "!w-[52px]" : "!w-[220px]"),
        )}
      >
        <SidebarHeader className={cn("p-3", isCollapsed && "p-2")}>
          <div className={cn("flex items-center gap-3", isCollapsed && "justify-center gap-0")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
              <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-sidebar-foreground truncate">Gestão RPC</span>
                <span className="text-[11px] text-sidebar-foreground/60 truncate">Gestão comercial</span>
              </div>
            )}
          </div>
          {!isMobile && (
            <div className={cn("mt-2 flex", isCollapsed ? "justify-center" : "justify-end")}>
              <Tooltip delayDuration={120}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
                    onClick={() => setCollapsed(!collapsed)}
                    className="h-7 w-7 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{isCollapsed ? "Expandir" : "Recolher"}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className={cn("px-2 gap-1", isCollapsed && "px-1.5")}>
          {!isCollapsed && (
            <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Principal
            </p>
          )}
          {isCollapsed && <div className="mx-auto my-2 h-px w-6 bg-sidebar-border/60" aria-hidden />}
          <div className="flex flex-col gap-0.5">
            {PRIMARY_ITEMS.map((item) => (
              <NavItemRow key={item.url} item={item} collapsed={isCollapsed} onNavigate={handleNavClick} />
            ))}
          </div>

          {!isCollapsed && (
            <p className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Gestão
            </p>
          )}
          {isCollapsed && <div className="mx-auto my-2 h-px w-6 bg-sidebar-border/60" aria-hidden />}
          <div className="flex flex-col gap-0.5">
            {MANAGEMENT_ITEMS.map((item) => (
              <NavItemRow key={item.url} item={item} collapsed={isCollapsed} onNavigate={handleNavClick} />
            ))}
          </div>
        </SidebarContent>

        <SidebarFooter className={cn("p-2 space-y-2", isCollapsed && "p-1.5")}>
          {currentUser && !isCollapsed && (
            <div className="flex items-center gap-2 rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 p-2">
              <UserCircle className="h-5 w-5 shrink-0 text-sidebar-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate text-sidebar-foreground">{currentUser.nome}</p>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">{currentUser.funcao}</Badge>
              </div>
            </div>
          )}
          {currentUser && isCollapsed && (
            <Tooltip delayDuration={120}>
              <TooltipTrigger asChild>
                <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-md bg-sidebar-accent/50">
                  <UserCircle className="h-5 w-5 text-sidebar-primary" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="font-medium">{currentUser.nome}</div>
                <div className="text-[11px] text-muted-foreground">{currentUser.funcao}</div>
              </TooltipContent>
            </Tooltip>
          )}

          {user && (
            isCollapsed ? (
              <Tooltip delayDuration={120}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon" aria-label="Sair"
                    className="h-9 w-9 mx-auto text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost" size="sm"
                className="w-full justify-start text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground"
                onClick={signOut}
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sair ({user.email?.split("@")[0]})
              </Button>
            )
          )}

        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
