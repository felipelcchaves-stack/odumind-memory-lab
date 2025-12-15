import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAudioSettings() {
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'audio_pronunciation_enabled')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading audio settings:', error);
        }

        setIsAudioEnabled(data?.value === 'true');
      } catch (error) {
        console.error('Error loading audio settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  return { isAudioEnabled, loading };
}
