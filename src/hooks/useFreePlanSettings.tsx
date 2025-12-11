import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useFreePlanSettings = () => {
  const [isFreePlanEnabled, setIsFreePlanEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'free_plan_enabled')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading free plan settings:', error);
      }

      // Default to true if setting doesn't exist
      setIsFreePlanEnabled(data?.value !== 'false');
    } catch (error) {
      console.error('Error loading free plan settings:', error);
      // Default to true on error
      setIsFreePlanEnabled(true);
    } finally {
      setLoading(false);
    }
  };

  return { isFreePlanEnabled, loading, refetch: loadSettings };
};
