import { useEffect, useState, useContext, createContext, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isColaborador, setIsColaborador] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);

  // Use direct auth state to be safe when used outside AuthProvider
  useEffect(() => {
    let mounted = true;

    // Only replaces the `user` object reference when the underlying user
    // actually changed - Supabase re-fires SIGNED_IN with an unchanged
    // session every time the tab regains visibility, and without this guard
    // that re-triggers checkRoles()'s admin/colaborador RPC calls below on
    // every alt-tab-back.
    const applyUser = (newUser: User | null) => {
      if (!mounted) return;
      const newUserId = newUser?.id ?? null;
      if (newUserId !== currentUserIdRef.current) {
        currentUserIdRef.current = newUserId;
        setUser(newUser);
      }
      setInitialized(true);
    };

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        applyUser(session?.user ?? null);
      } catch (error) {
        console.error('[useAdmin] Error getting session:', error);
        applyUser(null);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Wait for initialization before checking roles
    if (!initialized) {
      return;
    }

    checkRoles();
  }, [user, initialized]);

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
