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
  const hasShownErrorRef = useRef(false);

  useEffect(() => {
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const validateSession = async () => {
      // Skip validation if login is in progress (within last 10 seconds)
      const loginInProgress = localStorage.getItem('login_in_progress');
      if (loginInProgress) {
        const loginTime = parseInt(loginInProgress);
        const timeSinceLogin = Date.now() - loginTime;
        if (timeSinceLogin < 10000) {
          console.log('[SESSION-VALIDATION] Login in progress, skipping validation for', Math.round((10000 - timeSinceLogin) / 1000), 'more seconds');
          return;
        }
        // Clean up old flag
        localStorage.removeItem('login_in_progress');
      }
      
      if (isValidatingRef.current) return;
      isValidatingRef.current = true;

      try {
        // Get the current session (this will auto-refresh the token if needed)
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          console.log('[SESSION-VALIDATION] No active session, forcing logout');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          localStorage.removeItem('session_id');
          await signOut();
          navigate('/auth', { replace: true });
          isValidatingRef.current = false;
          return;
        }

        // Get session_id from localStorage (created by enforce-single-session)
        const storedSessionId = localStorage.getItem('session_id');
        
        if (!storedSessionId) {
          console.log('[SESSION-VALIDATION] No session_id in localStorage, forcing logout');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          await signOut();
          navigate('/auth', { replace: true });
          isValidatingRef.current = false;
          return;
        }

        // Extract token expiration for logging
        const accessToken = sessionData.session.access_token;
        const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
        const tokenExp = tokenPayload.exp;

        console.log('[SESSION-VALIDATION] Validating session...');
        console.log('[SESSION-VALIDATION] session_id from localStorage:', storedSessionId);
        console.log('[SESSION-VALIDATION] Token expires at:', new Date(tokenExp * 1000));

        // Call validate-session with the correct session_id from localStorage
        const { data, error } = await supabase.functions.invoke('validate-session', {
          body: { session_id: storedSessionId }
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
          
          // Show toast only once
          if (!hasShownErrorRef.current) {
            toast.error('Sua sessão foi encerrada', {
              description: 'Você foi desconectado porque fez login em outro dispositivo.',
              duration: 5000,
            });
            hasShownErrorRef.current = true;
          }

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

    // Validate after a short delay to allow session_id to be saved
    const initialValidationTimeout = setTimeout(() => {
      validateSession();
    }, 1000);

    // Then validate every 60 seconds (reduced frequency)
    intervalRef.current = setInterval(validateSession, 60000);

    return () => {
      clearTimeout(initialValidationTimeout);
    };

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, signOut, navigate]);
}
