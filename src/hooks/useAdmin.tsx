import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdmin() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isColaborador, setIsColaborador] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use direct auth state to avoid hot reload issues with context
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    checkRoles();
  }, [user]);

  async function checkRoles() {
    if (!user) {
      setIsAdmin(false);
      setIsColaborador(false);
      setLoading(false);
      return;
    }

    try {
      // Check admin role
      const { data: adminData, error: adminError } = await supabase
        .rpc('has_admin_role', { _user_id: user.id });

      if (adminError) {
        console.error('Error checking admin status:', adminError);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!adminData);
      }

      // Check colaborador role (admin or colaborador)
      const { data: colaboradorData, error: colaboradorError } = await supabase
        .rpc('has_colaborador_role', { _user_id: user.id });

      if (colaboradorError) {
        console.error('Error checking colaborador status:', colaboradorError);
        setIsColaborador(false);
      } else {
        setIsColaborador(!!colaboradorData);
      }

      console.log('User roles:', user.email, '- Admin:', !!adminData, '- Colaborador:', !!colaboradorData);
    } catch (error) {
      console.error('Exception checking roles:', error);
      setIsAdmin(false);
      setIsColaborador(false);
    } finally {
      setLoading(false);
    }
  }

  return { isAdmin, isColaborador, loading };
}
