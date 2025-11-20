import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AppSetting {
  id: string;
  key: string;
  value: string | null;
  category: string;
  description: string | null;
  is_public: boolean;
  is_sensitive: boolean;
  updated_at: string;
}

export const useAppSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (error) throw error;

      setSettings(data || []);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          value,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (error) throw error;

      toast.success('Configuração atualizada com sucesso');
      await loadSettings();
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Erro ao atualizar configuração');
      throw error;
    }
  };

  const getSettingsByCategory = (category: string) => {
    return settings.filter(s => s.category === category);
  };

  const getSetting = (key: string) => {
    return settings.find(s => s.key === key);
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  return {
    settings,
    loading,
    loadSettings,
    updateSetting,
    getSettingsByCategory,
    getSetting,
  };
};
