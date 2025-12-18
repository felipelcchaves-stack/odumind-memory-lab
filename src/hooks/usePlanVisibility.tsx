import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PLANS, Plan, PLAN_IDS } from '@/config/plans';

interface PlanVisibilitySettings {
  [key: string]: boolean;
}

export const usePlanVisibility = () => {
  const [visibility, setVisibility] = useState<PlanVisibilitySettings>({
    [PLAN_IDS.GRATUITO]: true,
    [PLAN_IDS.AWO]: true,
    [PLAN_IDS.EGBE]: true,
  });
  const [loading, setLoading] = useState(true);

  const loadVisibility = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('category', 'plans')
        .in('key', ['plan_gratuito_visible', 'plan_awo_visible', 'plan_egbe_visible']);

      if (error) {
        console.error('Error loading plan visibility settings:', error);
        return;
      }

      const newVisibility: PlanVisibilitySettings = {
        [PLAN_IDS.GRATUITO]: true,
        [PLAN_IDS.AWO]: true,
        [PLAN_IDS.EGBE]: true,
      };

      data?.forEach(setting => {
        const planId = setting.key.replace('plan_', '').replace('_visible', '');
        newVisibility[planId] = setting.value !== 'false';
      });

      setVisibility(newVisibility);
    } catch (error) {
      console.error('Error loading plan visibility:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisibility();
  }, [loadVisibility]);

  // Retorna apenas os planos visíveis
  const visiblePlans: Plan[] = PLANS.filter(plan => visibility[plan.id]);

  // Verifica se um plano específico está visível
  const isPlanVisible = (planId: string): boolean => {
    return visibility[planId] ?? true;
  };

  return {
    visiblePlans,
    isPlanVisible,
    visibility,
    loading,
    refetch: loadVisibility,
  };
};

// Hook para o admin gerenciar visibilidade
export const usePlanVisibilityAdmin = () => {
  const [visibility, setVisibility] = useState<PlanVisibilitySettings>({
    [PLAN_IDS.GRATUITO]: true,
    [PLAN_IDS.AWO]: true,
    [PLAN_IDS.EGBE]: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadVisibility = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('category', 'plans')
        .in('key', ['plan_gratuito_visible', 'plan_awo_visible', 'plan_egbe_visible']);

      if (error) {
        console.error('Error loading plan visibility settings:', error);
        return;
      }

      const newVisibility: PlanVisibilitySettings = {
        [PLAN_IDS.GRATUITO]: true,
        [PLAN_IDS.AWO]: true,
        [PLAN_IDS.EGBE]: true,
      };

      data?.forEach(setting => {
        const planId = setting.key.replace('plan_', '').replace('_visible', '');
        newVisibility[planId] = setting.value !== 'false';
      });

      setVisibility(newVisibility);
    } catch (error) {
      console.error('Error loading plan visibility:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisibility();
  }, [loadVisibility]);

  const updateVisibility = async (planId: string, isVisible: boolean) => {
    setSaving(true);
    try {
      const key = `plan_${planId}_visible`;
      
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          value: isVisible ? 'true' : 'false',
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (error) {
        console.error('Error updating plan visibility:', error);
        return false;
      }

      setVisibility(prev => ({
        ...prev,
        [planId]: isVisible
      }));

      return true;
    } catch (error) {
      console.error('Error updating plan visibility:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    visibility,
    loading,
    saving,
    updateVisibility,
    refetch: loadVisibility,
  };
};
