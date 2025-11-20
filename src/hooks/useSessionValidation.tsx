import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function useSessionValidation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isValidatingRef = useRef(false);

  useEffect(() => {
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      console.warn('[SESSION-VALIDATION] No session_id found, user might have logged in before single-session was implemented');
      return;
    }

    const validateSession = async () => {
      if (isValidatingRef.current) return;
      isValidatingRef.current = true;

      try {
        // First, get the current session (this will auto-refresh the token if needed)
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          console.log('[SESSION-VALIDATION] No active session, forcing logout');
          clearInterval(intervalRef.current!);
          localStorage.removeItem('session_id');
          await signOut();
          navigate('/auth', { replace: true });
          isValidatingRef.current = false;
          return;
        }

        // Now call validate-session with the fresh token
        const { data, error } = await supabase.functions.invoke('validate-session', {
          body: { session_id: sessionId }
        });

        // Se houver erro na chamada da função (500, 401, etc)
        if (error) {
          console.error('[SESSION-VALIDATION] Error calling function:', error);
          
          // Se for erro de autenticação ou token inválido, fazer logout silencioso
          if (error.message?.includes('autenticado') || error.message?.includes('inválido') || error.message?.includes('expirado')) {
            console.log('[SESSION-VALIDATION] Authentication error, forcing silent logout');
            clearInterval(intervalRef.current!);
            localStorage.removeItem('session_id');
            await signOut();
            navigate('/auth', { replace: true });
          }
          
          isValidatingRef.current = false;
          return;
        }

        // Se a resposta indicar que a sessão é inválida
        if (data && !data.valid) {
          console.log('[SESSION-VALIDATION] Session invalid, forcing logout');
          clearInterval(intervalRef.current!);
          localStorage.removeItem('session_id');
          
          toast.error('Sua sessão foi encerrada', {
            description: 'Você foi desconectado porque fez login em outro dispositivo.',
            duration: 5000,
          });

          await signOut();
          navigate('/auth', { replace: true });
        }
      } catch (err) {
        console.error('[SESSION-VALIDATION] Exception:', err);
        // Em caso de exceção, limpar e fazer logout silencioso
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        localStorage.removeItem('session_id');
        
        // Fazer logout silencioso para limpar estado
        try {
          await signOut();
          navigate('/auth', { replace: true });
        } catch (signOutErr) {
          console.error('[SESSION-VALIDATION] Error during signout:', signOutErr);
        }
      } finally {
        isValidatingRef.current = false;
      }
    };

    // Validate immediately
    validateSession();

    // Then validate every 30 seconds
    intervalRef.current = setInterval(validateSession, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, signOut, navigate]);
}
