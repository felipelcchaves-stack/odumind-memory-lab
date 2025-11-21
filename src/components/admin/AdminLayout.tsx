import { ReactNode, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { toast } from "sonner";

export function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isColaborador, loading: adminLoading } = useAdmin();

  useEffect(() => {
    if (!adminLoading && !user) {
      navigate("/");
      return;
    }

    if (!adminLoading && !isColaborador) {
      toast.error("Acesso negado. Apenas administradores e colaboradores podem acessar esta área.");
      navigate("/dashboard");
    }
  }, [user, isColaborador, adminLoading, navigate]);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isColaborador) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar isAdmin={isAdmin} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
