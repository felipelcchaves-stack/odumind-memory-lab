import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function useSessionValidation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isValidatingRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  const hasShownErrorRef = useRef(false);

  useEffect(() => {
    // Reset flags and clear timers when user changes to null
    if (!user) {
      isLoggingOutRef.current = false;
      hasShownErrorRef.current = false;
      
      // Clear all timers
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const performLogout = async (showToast: boolean = false) => {
      // Prevent multiple logout attempts
      if (isLoggingOutRef.current) {
        console.log('[SESSION-VALIDATION] Logout already in progress, skipping');
        return;
      }
      
      isLoggingOutRef.current = true;
      
      // Clear all timers FIRST to prevent re-execution
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Clear local storage
      localStorage.removeItem('session_id');
      
      // Show toast only once if requested
      if (showToast && !hasShownErrorRef.current) {
        toast.error('Sua sessão foi encerrada', {
          description: 'Você foi desconectado porque fez login em outro dispositivo.',
          duration: 5000,
        });
        hasShownErrorRef.current = true;
      }
      
      // Only call signOut if there's an active session
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await signOut();
        }
      } catch (err) {
        console.error('[SESSION-VALIDATION] Error during signout:', err);
      }
      
      // Navigate to landing page
      navigate('/', { replace: true });
    };

    const validateSession = async () => {
      // Skip if already logging out
      if (isLoggingOutRef.current) {
        console.log('[SESSION-VALIDATION] Logout in progress, skipping validation');
        return;
      }
      
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
      
      // Skip validation if password update is in progress (within last 30 seconds)
      const passwordUpdateInProgress = localStorage.getItem('password_update_in_progress');
      if (passwordUpdateInProgress) {
        const updateTime = parseInt(passwordUpdateInProgress);
        const timeSinceUpdate = Date.now() - updateTime;
        if (timeSinceUpdate < 30000) {
          console.log('[SESSION-VALIDATION] Password update in progress, skipping validation');
          return;
        }
        // Clean up old flag
        localStorage.removeItem('password_update_in_progress');
      }
      
      if (isValidatingRef.current) return;
      isValidatingRef.current = true;

      try {
        // Get the current session (this will auto-refresh the token if needed)
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          console.log('[SESSION-VALIDATION] No active session, clearing and navigating');
          isValidatingRef.current = false;
          
          // Clear timers and local storage, navigate without calling signOut
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          localStorage.removeItem('session_id');
          navigate('/', { replace: true });
          return;
        }

        // Get session_id from localStorage (created by enforce-single-session)
        const storedSessionId = localStorage.getItem('session_id');
        
        if (!storedSessionId) {
          console.log('[SESSION-VALIDATION] No session_id in localStorage, forcing logout');
          isValidatingRef.current = false;
          await performLogout();
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

        // If there's an error calling the function (500, 401, etc)
        if (error) {
          console.error('[SESSION-VALIDATION] Error calling function:', error);
          
          // If it's an auth error or invalid token, perform logout
          if (error.message?.includes('autenticado') || error.message?.includes('inválido') || error.message?.includes('expirado')) {
            console.log('[SESSION-VALIDATION] Authentication error, forcing logout');
            isValidatingRef.current = false;
            await performLogout();
            return;
          }
          
          isValidatingRef.current = false;
          return;
        }

        // If the response indicates the session is invalid
        if (data && !data.valid) {
          console.log('[SESSION-VALIDATION] Session invalid, forcing logout');
          isValidatingRef.current = false;
          await performLogout(true); // Show toast for this case
          return;
        }
      } catch (err) {
        console.error('[SESSION-VALIDATION] Exception:', err);
        isValidatingRef.current = false;
        
        // On exception, perform logout silently
        await performLogout();
        return;
      }
      
      isValidatingRef.current = false;
    };

    // Validate after a short delay to allow session_id to be saved
    timeoutRef.current = setTimeout(() => {
      validateSession();
    }, 1000);

    // Then validate every 60 seconds (reduced frequency)
    intervalRef.current = setInterval(validateSession, 60000);

    // Unified cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, signOut, navigate]);
}
