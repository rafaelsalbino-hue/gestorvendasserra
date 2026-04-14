import { FileText, Users, LayoutDashboard, Building2, UserCircle, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contratos", url: "/contratos", icon: FileText },
  { title: "Responsáveis", url: "/responsaveis", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { data: responsaveis = [] } = useResponsaveis();
  const { currentUser, setCurrentUser } = useCurrentUser();
  const { user, signOut } = useAuth();

  const ativos = responsaveis.filter((r) => r.ativo);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground">Gestão de Contratos</span>
              <span className="text-xs text-sidebar-foreground/60">Educação SESI/SENAI</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        {!collapsed && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
                <UserCircle className="h-4 w-4" />
                <span>Acessando como:</span>
              </div>
              <Select
                value={currentUser?.id || "__none__"}
                onValueChange={(v) => {
                  if (v === "__none__") setCurrentUser(null);
                  else {
                    const u = ativos.find((r) => r.id === v);
                    if (u) setCurrentUser(u);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione seu nome..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Selecione —</SelectItem>
                  {ativos.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nome} ({r.funcao})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {user && (
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground" onClick={signOut}>
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sair ({user.email?.split("@")[0]})
              </Button>
            )}
          </>
        )}
        {collapsed && currentUser && (
          <div className="flex justify-center" title={`${currentUser.nome} (${currentUser.funcao})`}>
            <UserCircle className="h-5 w-5 text-sidebar-primary" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
