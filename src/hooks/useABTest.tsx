import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ABVariant {
  id: string;
  test_name: string;
  variant: 'A' | 'B' | 'C';
  headline: string;
  subheadline: string;
  cta_text: string;
  description: string;
  traffic_percentage: number;
  is_active: boolean;
}

interface ABTestSession {
  session_id: string;
  test_name: string;
  variant: string;
  page_views: number;
  time_on_page: number;
  scroll_depth: number;
  cta_clicks: number;
}

interface UseABTestReturn {
  variant: ABVariant | null;
  variantLetter: 'A' | 'B' | 'C' | null;
  isLoading: boolean;
  isEnabled: boolean;
  trackCTAClick: () => void;
  trackScrollDepth: (depth: number) => void;
  trackConversion: (type: 'signup' | 'checkout' | 'purchase') => void;
  updateTimeOnPage: (seconds: number) => void;
}

// Generate or get session ID
const getSessionId = (): string => {
  const key = 'ab_session_id';
  let sessionId = localStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `ab_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

// Get stored variant from cookie
const getStoredVariant = (testName: string): string | null => {
  const key = `ab_variant_${testName}`;
  return localStorage.getItem(key);
};

// Store variant in cookie
const storeVariant = (testName: string, variant: string): void => {
  const key = `ab_variant_${testName}`;
  localStorage.setItem(key, variant);
};

// Detect device type
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Randomly select variant based on traffic percentages
const selectVariant = (variants: ABVariant[]): ABVariant | null => {
  if (!variants.length) return null;
  
  const totalPercentage = variants.reduce((sum, v) => sum + v.traffic_percentage, 0);
  const random = Math.random() * totalPercentage;
  
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.traffic_percentage;
    if (random <= cumulative) {
      return variant;
    }
  }
  
  return variants[0];
};

export const useABTest = (testName: string = 'hero_v1'): UseABTestReturn => {
  const [variant, setVariant] = useState<ABVariant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [sessionId] = useState(() => getSessionId());

  // Initialize A/B test
  useEffect(() => {
    const initABTest = async () => {
      try {
        // Check if A/B testing is enabled
        const { data: settingsData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'ab_test_enabled')
          .single();

        const abEnabled = settingsData?.value === 'true';
        setIsEnabled(abEnabled);

        if (!abEnabled) {
          // Check if there's a winner set
          const { data: winnerData } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'ab_current_winner')
            .single();

          if (winnerData?.value) {
            // Fetch the winner variant
            const { data: winnerVariant } = await supabase
              .from('landing_ab_tests')
              .select('*')
              .eq('test_name', testName)
              .eq('variant', winnerData.value)
              .single();

            if (winnerVariant) {
              setVariant(winnerVariant as ABVariant);
            }
          }
          setIsLoading(false);
          return;
        }

        // Fetch active variants for this test
        const { data: variants, error } = await supabase
          .from('landing_ab_tests')
          .select('*')
          .eq('test_name', testName)
          .eq('is_active', true);

        if (error || !variants?.length) {
          console.error('Error fetching A/B variants:', error);
          setIsLoading(false);
          return;
        }

        // Check if user already has an assigned variant
        const storedVariantLetter = getStoredVariant(testName);
        let selectedVariant: ABVariant | null = null;

        if (storedVariantLetter) {
          selectedVariant = (variants as ABVariant[]).find(v => v.variant === storedVariantLetter) || null;
        }

        // If no stored variant or stored variant not active, select new one
        if (!selectedVariant) {
          selectedVariant = selectVariant(variants as ABVariant[]);
          if (selectedVariant) {
            storeVariant(testName, selectedVariant.variant);
          }
        }

        if (selectedVariant) {
          setVariant(selectedVariant);

          // Get UTM params from localStorage
          const utmData = JSON.parse(localStorage.getItem('utm_params') || '{}');

          // Create or update session
          const { error: sessionError } = await supabase
            .from('landing_ab_sessions')
            .upsert({
              session_id: sessionId,
              test_name: testName,
              variant: selectedVariant.variant,
              page_views: 1,
              device_type: getDeviceType(),
              utm_source: utmData.utm_source || null,
              utm_campaign: utmData.utm_campaign || null,
              utm_medium: utmData.utm_medium || null,
            }, {
              onConflict: 'session_id,test_name',
              ignoreDuplicates: false
            });

          if (sessionError) {
            console.error('Error creating A/B session:', sessionError);
          }
        }
      } catch (error) {
        console.error('A/B test initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initABTest();
  }, [testName, sessionId]);

  // Track CTA click
  const trackCTAClick = useCallback(async () => {
    if (!variant) return;

    try {
      await supabase
        .from('landing_ab_sessions')
        .update({ 
          cta_clicks: (await supabase
            .from('landing_ab_sessions')
            .select('cta_clicks')
            .eq('session_id', sessionId)
            .eq('test_name', variant.test_name)
            .single()
          ).data?.cta_clicks + 1 || 1
        })
        .eq('session_id', sessionId)
        .eq('test_name', variant.test_name);
    } catch (error) {
      console.error('Error tracking CTA click:', error);
    }
  }, [variant, sessionId]);

  // Track scroll depth
  const trackScrollDepth = useCallback(async (depth: number) => {
    if (!variant) return;

    try {
      await supabase
        .from('landing_ab_sessions')
        .update({ scroll_depth: depth })
        .eq('session_id', sessionId)
        .eq('test_name', variant.test_name);
    } catch (error) {
      console.error('Error tracking scroll depth:', error);
    }
  }, [variant, sessionId]);

  // Track conversion
  const trackConversion = useCallback(async (type: 'signup' | 'checkout' | 'purchase') => {
    if (!variant) return;

    try {
      await supabase
        .from('landing_ab_sessions')
        .update({ 
          converted: true,
          converted_at: new Date().toISOString(),
          conversion_type: type
        })
        .eq('session_id', sessionId)
        .eq('test_name', variant.test_name);
    } catch (error) {
      console.error('Error tracking conversion:', error);
    }
  }, [variant, sessionId]);

  // Update time on page
  const updateTimeOnPage = useCallback(async (seconds: number) => {
    if (!variant) return;

    try {
      await supabase
        .from('landing_ab_sessions')
        .update({ time_on_page: seconds })
        .eq('session_id', sessionId)
        .eq('test_name', variant.test_name);
    } catch (error) {
      console.error('Error updating time on page:', error);
    }
  }, [variant, sessionId]);

  return {
    variant,
    variantLetter: variant?.variant || null,
    isLoading,
    isEnabled,
    trackCTAClick,
    trackScrollDepth,
    trackConversion,
    updateTimeOnPage,
  };
};
