import { FileText, Users, LayoutDashboard, Building2, UserCircle, LogOut, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contratos", url: "/contratos", icon: FileText },
  { title: "Responsáveis", url: "/responsaveis", icon: Users },
  { title: "Editar Conta", url: "/conta", icon: Settings },
];

export function AppSidebar() {
  const collapsed = false;
  const location = useLocation();
  const { currentUser } = useCurrentUser();
  const { user, signOut } = useAuth();

  return (
    <Sidebar collapsible="none">
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
        {!collapsed ? (
          <>
            {currentUser && (
              <div className="flex items-center gap-2 rounded-md border p-2">
                <UserCircle className="h-5 w-5 shrink-0 text-sidebar-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{currentUser.nome}</p>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{currentUser.funcao}</Badge>
                </div>
              </div>
            )}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={signOut}
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sair ({user.email?.split("@")[0]})
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {currentUser && (
              <div
                className="flex h-8 w-8 items-center justify-center"
                title={`${currentUser.nome} (${currentUser.funcao})`}
              >
                <UserCircle className="h-5 w-5 text-sidebar-primary" />
              </div>
            )}
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={signOut}
                title={`Sair (${user.email})`}
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
