import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Subscription check is now handled by useSubscription hook
        // No need to call check-subscription here
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, nome: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome: nome.trim()
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Set login in progress flag to pause session validation
      localStorage.setItem('login_in_progress', Date.now().toString());
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        localStorage.removeItem('login_in_progress');
        throw error;
      }

      // Call enforce-single-session after successful login
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      };

      try {
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
          'enforce-single-session',
          {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: {
              device_info: deviceInfo,
              ip_address: null,
            },
          }
        );

        if (sessionError) {
          console.error('[AUTH] Erro ao enforçar sessão única:', sessionError);
          
          // Se for erro de autenticação (401), continuar com o login normal
          if (sessionError.message?.includes('401') || sessionError.message?.includes('authorization')) {
            console.log('[AUTH] Erro de autenticação ao enforçar sessão, continuando com login normal');
            // Remove flag after delay to allow session validation to work
            setTimeout(() => localStorage.removeItem('login_in_progress'), 3000);
            return { data, error: null };
          }
          
          localStorage.removeItem('login_in_progress');
          await supabase.auth.signOut();
          throw new Error('Não foi possível criar sessão. Tente novamente.');
        }

        if (!sessionData?.session_id) {
          console.error('[AUTH] session_id não retornado pela função');
          console.warn('[AUTH] Continuando sem enforce de sessão única');
          // Remove flag after delay
          setTimeout(() => localStorage.removeItem('login_in_progress'), 3000);
          return { data, error: null };
        }

        // Only save if everything succeeded
        localStorage.setItem('session_id', sessionData.session_id);
        console.log('[AUTH] Sessão criada com sucesso:', sessionData.session_id);
        
        // Remove login flag after successful session creation
        setTimeout(() => localStorage.removeItem('login_in_progress'), 2000);
      } catch (sessionError) {
        console.error('[AUTH] Exceção ao enforçar sessão:', sessionError);
        console.warn('[AUTH] Continuando sem enforce de sessão única');
        // Remove flag after delay
        setTimeout(() => localStorage.removeItem('login_in_progress'), 3000);
        return { data, error: null };
      }

      return { error: null };
    } catch (error: any) {
      console.error('[AUTH] Sign in error:', error);
      localStorage.removeItem('login_in_progress');
      return { error };
    }
  };

  const signOut = async () => {
    isLoggingOutRef.current = true;
    
    // Limpar todos os flags de sessão
    localStorage.removeItem('session_id');
    localStorage.removeItem('profile_modal_completed_session');
    localStorage.removeItem('onboarding_modal_completed_session');
    localStorage.removeItem('login_in_progress');
    
    await supabase.auth.signOut();
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 1000);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
