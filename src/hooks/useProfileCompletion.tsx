import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useProfileCompletion() {
  const { user } = useAuth();
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const lastCheckRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  const checkProfileCompletion = useCallback(async () => {
    if (!user) {
      setIsProfileComplete(null);
      setIsOnboardingComplete(null);
      setLoading(false);
      return;
    }

    // Debounce: evitar múltiplas chamadas em sequência rápida
    const now = Date.now();
    if (now - lastCheckRef.current < 1000) {
      console.log('[ProfileCompletion] Debounced check, skipping');
      // IMPORTANTE: Resetar loading mesmo em debounce para evitar estado travado
      setLoading(false);
      return;
    }
    lastCheckRef.current = now;

    try {
      console.log('[ProfileCompletion] Checking profile for user:', user.id);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_completed, onboarding_completed, pais, estado, data_nascimento, sexo')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Verificar se o componente ainda está montado
      if (!isMountedRef.current) return;

      const isComplete = data?.profile_completed || false;
      const isOnboarded = data?.onboarding_completed || false;
      
      console.log('[ProfileCompletion] Results:', { 
        isComplete, 
        isOnboarded,
        rawData: {
          profile_completed: data?.profile_completed,
          onboarding_completed: data?.onboarding_completed
        }
      });
      
      setIsProfileComplete(isComplete);
      setIsOnboardingComplete(isOnboarded);
    } catch (error) {
      console.error('[ProfileCompletion] Error checking profile:', error);
      if (isMountedRef.current) {
        setIsProfileComplete(false);
        setIsOnboardingComplete(false);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    isMountedRef.current = true;
    checkProfileCompletion();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [checkProfileCompletion]);

  // Função de refetch com delay opcional para garantir sincronização do DB
  const refetch = useCallback(async () => {
    // Reset debounce para permitir refetch imediato
    lastCheckRef.current = 0;
    await checkProfileCompletion();
  }, [checkProfileCompletion]);

  return { 
    isProfileComplete, 
    isOnboardingComplete,
    loading, 
    refetch 
  };
}
