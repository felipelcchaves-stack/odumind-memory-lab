import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useProfileCompletion() {
  const { user } = useAuth();
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const lastCheckRef = useRef<number>(0);

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
      return;
    }
    lastCheckRef.current = now;

    try {
      console.log('[ProfileCompletion] Checking profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_completed, onboarding_completed, pais, estado, data_nascimento, sexo')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const isComplete = data?.profile_completed || false;
      const isOnboarded = data?.onboarding_completed || false;
      
      console.log('[ProfileCompletion] Results:', { isComplete, isOnboarded });
      
      setIsProfileComplete(isComplete);
      setIsOnboardingComplete(isOnboarded);
    } catch (error) {
      console.error('[ProfileCompletion] Error checking profile:', error);
      setIsProfileComplete(false);
      setIsOnboardingComplete(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkProfileCompletion();
  }, [checkProfileCompletion]);

  return { 
    isProfileComplete, 
    isOnboardingComplete,
    loading, 
    refetch: checkProfileCompletion 
  };
}
