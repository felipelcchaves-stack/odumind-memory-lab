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
  const isRecoveringRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    // Reset flags and clear timers when user changes to null
    if (!user) {
      isLoggingOutRef.current = false;
      hasShownErrorRef.current = false;
      isRecoveringRef.current = false;
      retryCountRef.current = 0;
      
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

    // Try to refresh the session before giving up
    const tryRefreshSession = async (): Promise<boolean> => {
      if (isRecoveringRef.current) {
        console.log('[SESSION-VALIDATION] Recovery already in progress, skipping');
        return false;
      }
      
      isRecoveringRef.current = true;
      console.log('[SESSION-VALIDATION] Attempting to refresh session...');
      
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[SESSION-VALIDATION] Refresh failed:', refreshError.message);
          isRecoveringRef.current = false;
          return false;
        }
        
        if (refreshData.session) {
          console.log('[SESSION-VALIDATION] Session refreshed successfully');
          retryCountRef.current = 0; // Reset retry count on success
          isRecoveringRef.current = false;
          return true;
        }
        
        isRecoveringRef.current = false;
        return false;
      } catch (err) {
        console.error('[SESSION-VALIDATION] Refresh exception:', err);
        isRecoveringRef.current = false;
        return false;
      }
    };

    // Wait for any ongoing token refresh to complete
    const waitForTokenRefresh = async (): Promise<void> => {
      // Give Supabase auto-refresh time to complete (if it's running)
      await new Promise(resolve => setTimeout(resolve, 500));
    };

    const validateSession = async () => {
      // Skip if already logging out or recovering
      if (isLoggingOutRef.current || isRecoveringRef.current) {
        console.log('[SESSION-VALIDATION] Logout/recovery in progress, skipping validation');
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
        // Wait for any ongoing token refresh
        await waitForTokenRefresh();
        
        // Get the current session (this will auto-refresh the token if needed)
        let { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          console.log('[SESSION-VALIDATION] No active session, attempting refresh...');
          
          // Try to refresh before giving up
          const refreshed = await tryRefreshSession();
          if (refreshed) {
            // Get the new session after refresh
            const { data: newSessionData } = await supabase.auth.getSession();
            if (newSessionData.session) {
              console.log('[SESSION-VALIDATION] Session recovered after refresh');
              isValidatingRef.current = false;
              return;
            }
          }
          
          // Check retry count with exponential backoff
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            const backoffDelay = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s
            console.log(`[SESSION-VALIDATION] Retry ${retryCountRef.current}/${maxRetries}, waiting ${backoffDelay}ms`);
            
            isValidatingRef.current = false;
            
            // Schedule retry with backoff
            setTimeout(() => {
              validateSession();
            }, backoffDelay);
            return;
          }
          
          console.log('[SESSION-VALIDATION] Max retries reached, clearing and navigating');
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

        // Reset retry count on successful session check
        retryCountRef.current = 0;

        // Get session_id from localStorage (created by enforce-single-session)
        const storedSessionId = localStorage.getItem('session_id');
        
        // Check if password was just changed (within last 60 seconds)
        const passwordJustChanged = localStorage.getItem('password_just_changed');
        if (passwordJustChanged) {
          const changeTime = parseInt(passwordJustChanged);
          const timeSinceChange = Date.now() - changeTime;
          if (timeSinceChange < 60000) {
            console.log('[SESSION-VALIDATION] Password just changed, skipping validation for', Math.round((60000 - timeSinceChange) / 1000), 'more seconds');
            isValidatingRef.current = false;
            return;
          }
          // Clean up old flag
          localStorage.removeItem('password_just_changed');
        }
        
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
          
          // If it's an auth error, try to refresh first
          if (error.message?.includes('autenticado') || error.message?.includes('inválido') || error.message?.includes('expirado')) {
            console.log('[SESSION-VALIDATION] Authentication error, attempting refresh...');
            
            const refreshed = await tryRefreshSession();
            if (refreshed) {
              console.log('[SESSION-VALIDATION] Session refreshed after auth error, will retry on next interval');
              isValidatingRef.current = false;
              return;
            }
            
            console.log('[SESSION-VALIDATION] Refresh failed, forcing logout');
            isValidatingRef.current = false;
            await performLogout();
            return;
          }
          
          isValidatingRef.current = false;
          return;
        }

        // If the response suggests retrying (token was expired but might be refreshable)
        if (data && data.retry_suggested) {
          console.log('[SESSION-VALIDATION] Server suggests retry, attempting refresh...');
          const refreshed = await tryRefreshSession();
          if (refreshed) {
            console.log('[SESSION-VALIDATION] Session refreshed, will validate on next interval');
            isValidatingRef.current = false;
            return;
          }
        }

        // If the response indicates the session is invalid
        if (data && !data.valid) {
          console.log('[SESSION-VALIDATION] Session invalid, reason:', data.reason);
          
          // If it's a token expiration issue, try refresh first
          if (data.reason === 'token_expired') {
            const refreshed = await tryRefreshSession();
            if (refreshed) {
              console.log('[SESSION-VALIDATION] Session refreshed after token_expired');
              isValidatingRef.current = false;
              return;
            }
          }
          
          isValidatingRef.current = false;
          await performLogout(data.reason === 'session_mismatch'); // Show toast only for session mismatch
          return;
        }
      } catch (err) {
        console.error('[SESSION-VALIDATION] Exception:', err);
        isValidatingRef.current = false;
        
        // On exception, try refresh before logout
        const refreshed = await tryRefreshSession();
        if (refreshed) {
          console.log('[SESSION-VALIDATION] Session refreshed after exception');
          return;
        }
        
        await performLogout();
        return;
      }
      
      isValidatingRef.current = false;
    };

    // Validate after a longer delay (5 seconds) to allow session_id to be saved and token refresh to complete
    timeoutRef.current = setTimeout(() => {
      validateSession();
    }, 5000);

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
