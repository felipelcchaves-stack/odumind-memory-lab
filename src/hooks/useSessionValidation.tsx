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
        const { data, error } = await supabase.functions.invoke('validate-session', {
          body: { session_id: sessionId }
        });

        if (error) {
          console.error('[SESSION-VALIDATION] Error:', error);
          isValidatingRef.current = false;
          return;
        }

        if (!data.valid) {
          console.log('[SESSION-VALIDATION] Session invalid, forcing logout');
          clearInterval(intervalRef.current!);
          localStorage.removeItem('session_id');
          
          toast.error('Sua sessão foi encerrada', {
            description: 'Você foi desconectado porque fez login em outro dispositivo.',
            duration: 5000,
          });

          await signOut();
          navigate('/auth');
        }
      } catch (err) {
        console.error('[SESSION-VALIDATION] Exception:', err);
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
