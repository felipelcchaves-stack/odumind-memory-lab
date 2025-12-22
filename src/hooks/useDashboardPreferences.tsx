import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardPreferences {
  show_daily_guide: boolean;
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  show_daily_guide: true,
};

export function useDashboardPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('dashboard_preferences')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data?.dashboard_preferences && typeof data.dashboard_preferences === 'object') {
        const prefs = data.dashboard_preferences as Record<string, unknown>;
        setPreferences({
          show_daily_guide: typeof prefs.show_daily_guide === 'boolean' ? prefs.show_daily_guide : true,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreference = async <K extends keyof DashboardPreferences>(
    key: K,
    value: DashboardPreferences[K]
  ) => {
    if (!user) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ dashboard_preferences: newPreferences })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating dashboard preference:', error);
      // Revert on error
      setPreferences(preferences);
    }
  };

  return {
    preferences,
    loading,
    updatePreference,
  };
}
