import { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadGuruSettings();
  }, []);

  const loadGuruSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('category', 'guru')
        .eq('is_public', true);

      if (error) {
        console.error('Error loading GURU settings:', error);
        return;
      }

      const settings: Record<string, string> = {};
      data?.forEach((s) => {
        settings[s.key] = s.value || '';
      });

      setUrls({
        akapoMonthly: settings.guru_checkout_akapo_monthly || '',
        akapoAnnual: settings.guru_checkout_akapo_annual || '',
        awoMonthly: settings.guru_checkout_awo_monthly || '',
        awoAnnual: settings.guru_checkout_awo_annual || '',
        egbeMonthly: settings.guru_checkout_egbe_monthly || '',
        memberArea: settings.guru_member_area_url || '',
        enabled: settings.guru_enabled === 'true',
      });
    } catch (error) {
      console.error('Error loading GURU settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCheckoutUrl = (planName: string, isAnnual: boolean = false): string | null => {
    if (!urls.enabled) return null;

    const planLower = planName.toLowerCase();
    
    if (planLower.includes('akapo')) {
      return isAnnual ? urls.akapoAnnual : urls.akapoMonthly;
    }
    if (planLower.includes('awo')) {
      return isAnnual ? urls.awoAnnual : urls.awoMonthly;
    }
    if (planLower.includes('egbe') || planLower.includes('familia') || planLower.includes('família')) {
      return urls.egbeMonthly;
    }

    return null;
  };

  const openGuruCheckout = (planName: string, isAnnual: boolean = false): boolean => {
    const url = getCheckoutUrl(planName, isAnnual);
    if (url && url.trim() !== '') {
      window.open(url, '_blank');
      return true;
    }
    return false;
  };

  const openMemberArea = (): boolean => {
    if (urls.memberArea && urls.memberArea.trim() !== '') {
      window.open(urls.memberArea, '_blank');
      return true;
    }
    return false;
  };

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
