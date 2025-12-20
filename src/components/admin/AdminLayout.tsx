import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AdminLayout() {
  const navigate = useNavigate();
  const { isAdmin, isColaborador, loading: adminLoading } = useAdmin();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Get auth state directly
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
          setAuthLoading(false);
        }
      } catch (error) {
        console.error('[AdminLayout] Error getting session:', error);
        if (mounted) {
          setUser(null);
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Check access when loading is complete
  useEffect(() => {
    // Wait for both loadings to complete
    if (authLoading || adminLoading || hasRedirected) return;

    console.log('[AdminLayout] Checking access:', { 
      user: user?.email, 
      isColaborador, 
      isAdmin,
      authLoading,
      adminLoading
    });

    // If no user, redirect to login
    if (!user) {
      console.log('[AdminLayout] No user, redirecting to /');
      setHasRedirected(true);
      navigate("/");
      return;
    }

    // If not colaborador, access denied
    if (!isColaborador) {
      console.log('[AdminLayout] Not colaborador, redirecting to /dashboard');
      toast.error("Acesso negado. Apenas administradores e colaboradores podem acessar esta área.");
      setHasRedirected(true);
      navigate("/dashboard");
    }
  }, [authLoading, adminLoading, user, isColaborador, hasRedirected, navigate, isAdmin]);

  // Reset hasRedirected when user changes
  useEffect(() => {
    setHasRedirected(false);
  }, [user?.id]);

  // Show loading while checking
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // If redirected or no access, don't render
  if (hasRedirected || !isColaborador || !user) {
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
