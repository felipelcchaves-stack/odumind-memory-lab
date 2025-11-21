import { LayoutDashboard, FileText, Scroll, Users, BarChart3, Settings, Wrench, History, Megaphone } from "lucide-react";
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

interface AdminSidebarProps {
  isAdmin: boolean;
}

export function AdminSidebar({ isAdmin }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const sections = [
    {
      label: "Principal",
      items: [
        { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Conteúdo",
      items: [
        { title: "Odu", url: "/admin/odu", icon: FileText },
        { title: "Rituais", url: "/admin/rituais", icon: Scroll },
        { title: "Novidades", url: "/admin/changelog", icon: Megaphone },
      ],
    },
    {
      label: "Gestão",
      items: [
        { title: "Usuários", url: "/admin/users", icon: Users, adminOnly: true },
        { title: "Analytics", url: "/admin/analytics", icon: BarChart3, adminOnly: true },
      ],
    },
    {
      label: "Sistema",
      items: [
        { title: "Configurações", url: "/admin/settings", icon: Settings, adminOnly: true },
        { title: "Ferramentas", url: "/admin/tools", icon: Wrench },
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
          const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin);
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
