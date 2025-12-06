import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useReferralSettings = () => {
  const [isReferralEnabled, setIsReferralEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'referral_system_enabled')
        .single();

      if (error) {
        console.error('Error loading referral settings:', error);
        return;
      }

      setIsReferralEnabled(data?.value === 'true');
    } catch (error) {
      console.error('Error loading referral settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return { isReferralEnabled, loading, refetch: loadSettings };
};
