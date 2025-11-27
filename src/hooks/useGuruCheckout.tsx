import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GuruCheckoutUrls {
  akapoMonthly: string;
  akapoAnnual: string;
  awoMonthly: string;
  awoAnnual: string;
  egbeMonthly: string;
  memberArea: string;
  enabled: boolean;
}

export const useGuruCheckout = () => {
  const [urls, setUrls] = useState<GuruCheckoutUrls>({
    akapoMonthly: '',
    akapoAnnual: '',
    awoMonthly: '',
    awoAnnual: '',
    egbeMonthly: '',
    memberArea: '',
    enabled: false,
  });
  const [loading, setLoading] = useState(true);

  const loadGuruSettings = useCallback(async () => {
    console.log('[GURU] Iniciando carregamento das configurações...');
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('category', 'guru')
        .eq('is_public', true);

      if (error) {
        console.error('[GURU] Erro ao carregar configurações:', error);
        setLoading(false);
        return;
      }

      console.log('[GURU] Dados recebidos do banco:', data);

      const settings: Record<string, string> = {};
      data?.forEach((s) => {
        settings[s.key] = s.value || '';
      });

      const newUrls = {
        akapoMonthly: settings.guru_checkout_akapo_monthly || '',
        akapoAnnual: settings.guru_checkout_akapo_annual || '',
        awoMonthly: settings.guru_checkout_awo_monthly || '',
        awoAnnual: settings.guru_checkout_awo_annual || '',
        egbeMonthly: settings.guru_checkout_egbe_monthly || '',
        memberArea: settings.guru_member_area_url || '',
        enabled: settings.guru_enabled === 'true',
      };

      console.log('[GURU] Estado final das URLs:', newUrls);
      setUrls(newUrls);
    } catch (error) {
      console.error('[GURU] Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
      console.log('[GURU] Carregamento finalizado');
    }
  }, []);

  useEffect(() => {
    loadGuruSettings();
  }, [loadGuruSettings]);

  const getCheckoutUrl = useCallback((planName: string, isAnnual: boolean = false): string | null => {
    console.log('[GURU] getCheckoutUrl chamado:', { planName, isAnnual, enabled: urls.enabled, loading });
    
    if (!urls.enabled) {
      console.log('[GURU] GURU não está habilitado, retornando null');
      return null;
    }

    const planLower = planName.toLowerCase();
    let url: string | null = null;
    
    if (planLower.includes('akapo')) {
      url = isAnnual ? urls.akapoAnnual : urls.akapoMonthly;
      console.log('[GURU] Plano Akapo detectado, URL:', url);
    } else if (planLower.includes('awo')) {
      url = isAnnual ? urls.awoAnnual : urls.awoMonthly;
      console.log('[GURU] Plano Awo detectado, URL:', url);
    } else if (planLower.includes('egbe') || planLower.includes('familia') || planLower.includes('família')) {
      url = urls.egbeMonthly;
      console.log('[GURU] Plano Egbe/Família detectado, URL:', url);
    } else {
      console.log('[GURU] Plano não reconhecido:', planName);
    }

    return url && url.trim() !== '' ? url : null;
  }, [urls, loading]);

  const openGuruCheckout = useCallback((planName: string, isAnnual: boolean = false): boolean => {
    console.log('[GURU] openGuruCheckout chamado:', { planName, isAnnual, loading, enabled: urls.enabled });
    
    if (loading) {
      console.log('[GURU] Ainda carregando, não pode abrir checkout');
      return false;
    }
    
    if (!urls.enabled) {
      console.log('[GURU] GURU desabilitado, não abrindo checkout');
      return false;
    }
    
    const url = getCheckoutUrl(planName, isAnnual);
    console.log('[GURU] URL obtida para checkout:', url);
    
    if (url && url.trim() !== '') {
      console.log('[GURU] Abrindo URL em nova aba:', url);
      window.open(url, '_blank');
      return true;
    }
    
    console.log('[GURU] URL inválida ou vazia, não abrindo checkout');
    return false;
  }, [urls.enabled, loading, getCheckoutUrl]);

  const openMemberArea = useCallback((): boolean => {
    if (urls.memberArea && urls.memberArea.trim() !== '') {
      console.log('[GURU] Abrindo área do membro:', urls.memberArea);
      window.open(urls.memberArea, '_blank');
      return true;
    }
    console.log('[GURU] URL da área do membro não configurada');
    return false;
  }, [urls.memberArea]);

  return {
    urls,
    loading,
    isGuruEnabled: urls.enabled,
    getCheckoutUrl,
    openGuruCheckout,
    openMemberArea,
    refresh: loadGuruSettings,
  };
};
