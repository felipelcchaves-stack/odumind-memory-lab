import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useAdmin() {
  // IMPORTANTE: Usar o user do AuthContext como fonte única de verdade
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isColaborador, setIsColaborador] = useState(false);
  const [rolesChecked, setRolesChecked] = useState(false);

  useEffect(() => {
    // Só verificar roles quando o auth terminar de carregar
    if (authLoading) {
      setRolesChecked(false);
      return;
    }

    checkRoles();
  }, [user, authLoading]);

  async function checkRoles() {
    if (!user) {
      setIsAdmin(false);
      setIsColaborador(false);
      setRolesChecked(true);
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
      setRolesChecked(true);
    }
  }

  // loading é true se auth ainda está carregando OU se roles ainda não foram verificadas
  const loading = authLoading || !rolesChecked;

  return { isAdmin, isColaborador, loading };
}
