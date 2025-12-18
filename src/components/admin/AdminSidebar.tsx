import { LayoutDashboard, FileText, Scroll, Users, BarChart3, Settings, Wrench, History, Megaphone, TrendingUp, CreditCard, ToggleRight, Bell, Ticket } from "lucide-react";
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
        { title: "Rituais", url: "/admin/rituais", icon: Scroll, permission: "rituais" as const },
        { title: "Novidades", url: "/admin/changelog", icon: Megaphone, permission: "changelog" as const },
      ],
    },
    {
      label: "Gestão",
      items: [
        { title: "Usuários", url: "/admin/users", icon: Users, adminOnly: true },
        { title: "Analytics", url: "/admin/analytics", icon: BarChart3, adminOnly: true },
        { title: "Analytics Avançadas", url: "/admin/advanced-analytics", icon: TrendingUp, adminOnly: true },
      ],
    },
    {
      label: "Sistema",
      items: [
        { title: "Funcionalidades", url: "/admin/features", icon: ToggleRight, adminOnly: true },
        { title: "Anúncios", url: "/admin/announcements", icon: Bell, adminOnly: true },
        { title: "Cupons", url: "/admin/coupons", icon: Ticket, adminOnly: true },
        { title: "Configurações", url: "/admin/settings", icon: Settings, adminOnly: true },
        { title: "GURU Checkout", url: "/admin/guru", icon: CreditCard, adminOnly: true },
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
