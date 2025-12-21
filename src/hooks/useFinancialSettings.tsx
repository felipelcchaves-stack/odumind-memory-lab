import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FinancialSettings {
  // Taxas do Gateway
  gatewayFeePercent: number;      // Ex: 3.99%
  gatewayFeeFixed: number;        // Ex: R$ 0,39 por transação
  
  // Outras taxas (impostos, operacional)
  operationalTaxPercent: number;  // Ex: 10%
  
  // Metas
  mrrTarget: number;
  arrTarget: number;
  expectedChurnRate: number;
  
  // Deprecated: substituído por gatewayFeePercent + operationalTaxPercent
  commissionPercent: number;
}

const DEFAULT_SETTINGS: FinancialSettings = {
  gatewayFeePercent: 0.0399,    // 3.99%
  gatewayFeeFixed: 0.39,        // R$ 0,39
  operationalTaxPercent: 0,     // 0%
  mrrTarget: 10000,
  arrTarget: 120000,
  expectedChurnRate: 0.05,
  commissionPercent: 0.10,      // Legacy, será calculado automaticamente
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
        .in('key', [
          'gateway_commission_percent',
          'gateway_fee_percent',
          'gateway_fee_fixed',
          'operational_tax_percent',
          'mrr_target',
          'arr_target',
          'expected_churn_rate'
        ]);

      if (error) throw error;

      const newSettings = { ...DEFAULT_SETTINGS };
      data?.forEach((item) => {
        if (item.key === 'gateway_fee_percent' && item.value) {
          newSettings.gatewayFeePercent = parseFloat(item.value) / 100;
        } else if (item.key === 'gateway_fee_fixed' && item.value) {
          newSettings.gatewayFeeFixed = parseFloat(item.value);
        } else if (item.key === 'operational_tax_percent' && item.value) {
          newSettings.operationalTaxPercent = parseFloat(item.value) / 100;
        } else if (item.key === 'gateway_commission_percent' && item.value) {
          // Legacy: ainda usado para compatibilidade
          newSettings.commissionPercent = parseFloat(item.value);
        } else if (item.key === 'mrr_target' && item.value) {
          newSettings.mrrTarget = parseFloat(item.value);
        } else if (item.key === 'arr_target' && item.value) {
          newSettings.arrTarget = parseFloat(item.value);
        } else if (item.key === 'expected_churn_rate' && item.value) {
          newSettings.expectedChurnRate = parseFloat(item.value) / 100;
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

      if (newSettings.gatewayFeePercent !== undefined) {
        updates.push({
          key: 'gateway_fee_percent',
          value: (newSettings.gatewayFeePercent * 100).toString(),
        });
      }
      if (newSettings.gatewayFeeFixed !== undefined) {
        updates.push({
          key: 'gateway_fee_fixed',
          value: newSettings.gatewayFeeFixed.toString(),
        });
      }
      if (newSettings.operationalTaxPercent !== undefined) {
        updates.push({
          key: 'operational_tax_percent',
          value: (newSettings.operationalTaxPercent * 100).toString(),
        });
      }
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
      if (newSettings.expectedChurnRate !== undefined) {
        updates.push({
          key: 'expected_churn_rate',
          value: (newSettings.expectedChurnRate * 100).toString(),
        });
      }

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert({ 
            key: update.key, 
            value: update.value, 
            updated_at: new Date().toISOString(),
            category: 'financial'
          }, { onConflict: 'key' });

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
