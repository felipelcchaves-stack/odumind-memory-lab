import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FinancialSettings {
  commissionPercent: number;
  mrrTarget: number;
  arrTarget: number;
}

const DEFAULT_SETTINGS: FinancialSettings = {
  commissionPercent: 0.10,
  mrrTarget: 10000,
  arrTarget: 120000,
};

export function useFinancialSettings() {
  const [settings, setSettings] = useState<FinancialSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['gateway_commission_percent', 'mrr_target', 'arr_target']);

      if (error) throw error;

      const newSettings = { ...DEFAULT_SETTINGS };
      data?.forEach((item) => {
        if (item.key === 'gateway_commission_percent' && item.value) {
          newSettings.commissionPercent = parseFloat(item.value);
        } else if (item.key === 'mrr_target' && item.value) {
          newSettings.mrrTarget = parseFloat(item.value);
        } else if (item.key === 'arr_target' && item.value) {
          newSettings.arrTarget = parseFloat(item.value);
        }
      });

      setSettings(newSettings);
    } catch (error) {
      console.error('Error loading financial settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (newSettings: Partial<FinancialSettings>) => {
    setSaving(true);
    try {
      const updates: { key: string; value: string }[] = [];

      if (newSettings.commissionPercent !== undefined) {
        updates.push({
          key: 'gateway_commission_percent',
          value: newSettings.commissionPercent.toString(),
        });
      }
      if (newSettings.mrrTarget !== undefined) {
        updates.push({
          key: 'mrr_target',
          value: newSettings.mrrTarget.toString(),
        });
      }
      if (newSettings.arrTarget !== undefined) {
        updates.push({
          key: 'arr_target',
          value: newSettings.arrTarget.toString(),
        });
      }

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq('key', update.key);

        if (error) throw error;
      }

      setSettings((prev) => ({ ...prev, ...newSettings }));
      toast.success('Configurações financeiras salvas!');
    } catch (error) {
      console.error('Error updating financial settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    updateSettings,
    refetch: loadSettings,
  };
}
