import { LayoutDashboard, FileText, Scroll, Users, BarChart3, Settings, Wrench, History, Megaphone, TrendingUp, CreditCard, ToggleRight, Bell, Ticket, Route, Star, Users2, Home } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions, PermissionType } from "@/hooks/usePermissions";
import { LucideIcon } from "lucide-react";

interface AdminSidebarProps {
  isAdmin: boolean;
}

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  permission?: PermissionType;
}

export function AdminSidebar({ isAdmin }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { hasPermission } = usePermissions();

  const sections: Array<{ label: string; items: MenuItem[] }> = [
    {
      label: "Principal",
      items: [
        { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Conteúdo",
      items: [
        { title: "Odu", url: "/admin/odu", icon: FileText, permission: "odu" as const },
        { title: "Caminhos", url: "/admin/caminhos", icon: Route, permission: "caminhos" as const },
        { title: "Rituais", url: "/admin/rituais", icon: Scroll, permission: "rituais" as const },
        { title: "Novidades", url: "/admin/changelog", icon: Megaphone, permission: "changelog" as const },
      ],
    },
    {
      label: "Gestão",
      items: [
        { title: "Usuários", url: "/admin/users", icon: Users, permission: "users" as const },
        { title: "Grupos Familiares", url: "/admin/family-groups", icon: Users2, permission: "grupos_familiares" as const },
        { title: "Página Família", url: "/familia", icon: Home, adminOnly: true },
        { title: "Analytics", url: "/admin/analytics", icon: BarChart3, permission: "analytics" as const },
        { title: "Analytics Avançadas", url: "/admin/advanced-analytics", icon: TrendingUp, permission: "analytics_avancadas" as const },
      ],
    },
    {
      label: "Sistema",
      items: [
        { title: "Planos", url: "/admin/planos", icon: CreditCard, adminOnly: true },
        { title: "Funcionalidades", url: "/admin/features", icon: ToggleRight, adminOnly: true },
        { title: "Anúncios", url: "/admin/announcements", icon: Bell, permission: "anuncios" as const },
        { title: "Cupons", url: "/admin/coupons", icon: Ticket, adminOnly: true },
        { title: "Avaliações", url: "/admin/reviews", icon: Star, permission: "avaliacoes" as const },
        { title: "Configurações", url: "/admin/settings", icon: Settings, adminOnly: true },
        { title: "Ferramentas", url: "/admin/tools", icon: Wrench, permission: "tools" as const },
        { title: "Restaurar", url: "/admin/restore", icon: History, adminOnly: true },
      ],
    },
  ];

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <h2 className="text-lg font-semibold">Painel Admin</h2>
        )}
        <SidebarTrigger className="ml-auto" />
      </div>

      <SidebarContent>
        {sections.map((section) => {
          const visibleItems = section.items.filter(item => {
            // Admin-only items
            if (item.adminOnly) return isAdmin;
            // Items with specific permissions
            if (item.permission) return hasPermission(item.permission);
            // Default items (like Dashboard)
            return true;
          });
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={section.label}>
              {!collapsed && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className="hover:bg-accent/50"
                          activeClassName="bg-accent text-accent-foreground font-medium"
                        >
                          <item.icon className={collapsed ? "h-5 w-5" : "h-4 w-4 mr-3"} />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
