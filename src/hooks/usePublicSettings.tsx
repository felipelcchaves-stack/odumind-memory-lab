import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PublicSetting {
  key: string;
  value: string | null;
}

export const usePublicSettings = (keys: string[]) => {
  const [settings, setSettings] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .eq('is_public', true)
          .in('key', keys);

        if (error) throw error;

        const settingsMap: Record<string, string | null> = {};
        data?.forEach(setting => {
          settingsMap[setting.key] = setting.value;
        });
        setSettings(settingsMap);
      } catch (error) {
        console.error('Error loading public settings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (keys.length > 0) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [keys.join(',')]);

  const getSetting = (key: string, defaultValue: string = ''): string => {
    return settings[key] ?? defaultValue;
  };

  return { settings, loading, getSetting };
};
