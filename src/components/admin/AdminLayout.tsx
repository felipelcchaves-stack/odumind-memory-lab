import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { toast } from "sonner";

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const { isAdmin, isColaborador, loading: adminLoading } = useAdmin();
  const [isReady, setIsReady] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Marcar como pronto apenas quando TODOS os estados estiverem definidos
  useEffect(() => {
    if (!authLoading && !adminLoading) {
      // Pequeno delay para garantir propagação de estado
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [authLoading, adminLoading]);

  // Verificar acesso apenas quando estiver pronto
  useEffect(() => {
    if (!isReady || hasRedirected) return;

    console.log('[AdminLayout] Checking access:', { 
      user: user?.email, 
      session: !!session,
      isColaborador, 
      isAdmin,
      isReady 
    });

    // Se não há usuário ou sessão, redirecionar para login
    if (!user || !session) {
      console.log('[AdminLayout] No user or session, redirecting to /');
      setHasRedirected(true);
      navigate("/");
      return;
    }

    // Se não é colaborador, acesso negado
    if (!isColaborador) {
      console.log('[AdminLayout] Not colaborador, redirecting to /dashboard');
      toast.error("Acesso negado. Apenas administradores e colaboradores podem acessar esta área.");
      setHasRedirected(true);
      navigate("/dashboard");
    }
  }, [isReady, user, session, isColaborador, hasRedirected, navigate, isAdmin]);

  // Reset hasRedirected quando o usuário mudar
  useEffect(() => {
    setHasRedirected(false);
  }, [user?.id]);

  // Mostrar loading enquanto não estiver pronto
  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se já redirecionou ou não tem acesso, não renderizar nada
  if (hasRedirected || !isColaborador || !user || !session) {
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
