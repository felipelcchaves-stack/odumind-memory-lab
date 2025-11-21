import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useProfileCompletion() {
  const { user } = useAuth();
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProfileCompletion();
  }, [user]);

  async function checkProfileCompletion() {
    if (!user) {
      setIsProfileComplete(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_completed, pais, estado, data_nascimento, sexo')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const isComplete = data?.profile_completed || false;
      setIsProfileComplete(isComplete);
    } catch (error) {
      console.error('Error checking profile completion:', error);
      setIsProfileComplete(false);
    } finally {
      setLoading(false);
    }
  }

  return { isProfileComplete, loading, refetch: checkProfileCompletion };
}
