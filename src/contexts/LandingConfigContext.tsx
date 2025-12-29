import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types for all landing page configurations
interface ABVariant {
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

interface ContentFeature {
  id: string;
  slug: string;
  nome: string;
  icon: string;
  ativo: boolean;
}

interface PublicSettings {
  ab_test_enabled?: string;
  ab_current_winner?: string;
  promo_banner_enabled?: string;
  promo_banner_text?: string;
  promo_banner_link?: string;
  promo_banner_bg_color?: string;
  oluwo_explanation_enabled?: string;
  oluwo_explanation_video_url?: string;
  urgency_enabled?: string;
  urgency_deadline?: string;
  urgency_spots_remaining?: string;
  urgency_total_spots?: string;
  technique_screenshots_enabled?: string;
  exit_popup_enabled?: string;
  exit_popup_delay_seconds?: string;
  exit_popup_discount_percent?: string;
  referral_enabled?: string;
  referral_reward_days?: string;
  reviews_enabled?: string;
  guru_checkout_enabled?: string;
  [key: string]: string | undefined;
}

interface LandingConfig {
  // Settings
  settings: PublicSettings;
  settingsLoaded: boolean;
  
  // A/B Test
  abVariant: ABVariant | null;
  abVariantLetter: 'A' | 'B' | 'C' | null;
  abTestEnabled: boolean;
  abTestLoading: boolean;
  
  // Content Features
  contentFeatures: ContentFeature[];
  
  // Utility functions
  getSetting: (key: string, defaultValue?: string) => string;
  isSettingEnabled: (key: string) => boolean;
  isFeatureEnabled: (slug: string) => boolean;
  
  // A/B Test tracking
  trackCTAClick: () => void;
  trackScrollDepth: (depth: number) => void;
  trackConversion: (type: 'signup' | 'checkout' | 'purchase') => void;
}

const LandingConfigContext = createContext<LandingConfig | null>(null);

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

// Get stored variant from localStorage
const getStoredVariant = (testName: string): string | null => {
  return localStorage.getItem(`ab_variant_${testName}`);
};

// Store variant in localStorage
const storeVariant = (testName: string, variant: string): void => {
  localStorage.setItem(`ab_variant_${testName}`, variant);
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

// Cache configuration
const CACHE_KEY = 'landing_config_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  settings: PublicSettings;
  contentFeatures: ContentFeature[];
  timestamp: number;
}

const getCachedData = (): CachedData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CachedData;
    if (Date.now() - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
};

const setCachedData = (settings: PublicSettings, contentFeatures: ContentFeature[]): void => {
  try {
    const data: CachedData = {
      settings,
      contentFeatures,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

interface LandingConfigProviderProps {
  children: ReactNode;
  testName?: string;
}

export function LandingConfigProvider({ children, testName = 'hero_v1' }: LandingConfigProviderProps) {
  const [settings, setSettings] = useState<PublicSettings>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [contentFeatures, setContentFeatures] = useState<ContentFeature[]>([]);
  const [abVariant, setAbVariant] = useState<ABVariant | null>(null);
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [abTestLoading, setAbTestLoading] = useState(true);
  const [sessionId] = useState(() => getSessionId());
  const [sessionRegistered, setSessionRegistered] = useState(false);

  // Load all configurations in a single batch
  useEffect(() => {
    let mounted = true;
    
    const loadAllConfigs = async () => {
      // Check cache first
      const cached = getCachedData();
      if (cached) {
        setSettings(cached.settings);
        setContentFeatures(cached.contentFeatures);
        setSettingsLoaded(true);
        
        // Still need to handle A/B test separately
        await initABTest(cached.settings);
        return;
      }

      try {
        // Fetch settings and content types in parallel
        const [settingsResult, contentTypesResult] = await Promise.all([
          supabase
            .from('app_settings')
            .select('key, value')
            .eq('is_public', true),
          supabase
            .from('content_types')
            .select('id, slug, nome, icon, ativo')
            .order('ordem'),
        ]);

        if (!mounted) return;

        // Process settings
        const settingsMap: PublicSettings = {};
        settingsResult.data?.forEach((s) => {
          settingsMap[s.key] = s.value || undefined;
        });
        setSettings(settingsMap);
        setSettingsLoaded(true);

        // Process content features
        const features = (contentTypesResult.data || []) as ContentFeature[];
        setContentFeatures(features);

        // Cache the results
        setCachedData(settingsMap, features);

        // Initialize A/B test
        await initABTest(settingsMap);
      } catch (error) {
        console.error('Error loading landing config:', error);
        setSettingsLoaded(true);
        setAbTestLoading(false);
      }
    };

    const initABTest = async (loadedSettings: PublicSettings) => {
      try {
        const abEnabled = loadedSettings.ab_test_enabled === 'true';
        setAbTestEnabled(abEnabled);

        if (!abEnabled) {
          // Check if there's a winner set
          const winnerVariant = loadedSettings.ab_current_winner;
          if (winnerVariant) {
            const { data: winnerData } = await supabase
              .from('landing_ab_tests')
              .select('*')
              .eq('test_name', testName)
              .eq('variant', winnerVariant)
              .single();

            if (mounted && winnerData) {
              setAbVariant(winnerData as ABVariant);
            }
          }
          setAbTestLoading(false);
          return;
        }

        // Fetch active variants
        const { data: variants } = await supabase
          .from('landing_ab_tests')
          .select('*')
          .eq('test_name', testName)
          .eq('is_active', true);

        if (!mounted || !variants?.length) {
          setAbTestLoading(false);
          return;
        }

        // Check for stored variant
        const storedVariantLetter = getStoredVariant(testName);
        let selectedVariant: ABVariant | null = null;

        if (storedVariantLetter) {
          selectedVariant = (variants as ABVariant[]).find(v => v.variant === storedVariantLetter) || null;
        }

        if (!selectedVariant) {
          selectedVariant = selectVariant(variants as ABVariant[]);
          if (selectedVariant) {
            storeVariant(testName, selectedVariant.variant);
          }
        }

        if (mounted && selectedVariant) {
          setAbVariant(selectedVariant);
        }
      } catch (error) {
        console.error('A/B test initialization error:', error);
      } finally {
        if (mounted) {
          setAbTestLoading(false);
        }
      }
    };

    loadAllConfigs();

    return () => {
      mounted = false;
    };
  }, [testName]);

  // Register session after page load (delayed to not block rendering)
  useEffect(() => {
    if (!abVariant || sessionRegistered || abTestLoading) return;

    // Delay session registration to not block initial render
    const timeout = setTimeout(async () => {
      try {
        const utmData = JSON.parse(localStorage.getItem('utm_params') || '{}');

        await supabase
          .from('landing_ab_sessions')
          .upsert({
            session_id: sessionId,
            test_name: abVariant.test_name,
            variant: abVariant.variant,
            page_views: 1,
            device_type: getDeviceType(),
            utm_source: utmData.utm_source || null,
            utm_campaign: utmData.utm_campaign || null,
            utm_medium: utmData.utm_medium || null,
          }, {
            onConflict: 'session_id,test_name',
            ignoreDuplicates: false
          });

        setSessionRegistered(true);
      } catch (error) {
        console.error('Error registering A/B session:', error);
      }
    }, 2000); // 2 second delay

    return () => clearTimeout(timeout);
  }, [abVariant, sessionId, sessionRegistered, abTestLoading]);

  // Utility functions
  const getSetting = useCallback((key: string, defaultValue: string = ''): string => {
    return settings[key] ?? defaultValue;
  }, [settings]);

  const isSettingEnabled = useCallback((key: string): boolean => {
    return settings[key] === 'true';
  }, [settings]);

  const isFeatureEnabled = useCallback((slug: string): boolean => {
    if (slug === 'odu') return true;
    const feature = contentFeatures.find(f => f.slug === slug);
    return feature?.ativo ?? false;
  }, [contentFeatures]);

  // A/B Test tracking functions (batched/debounced)
  const trackCTAClick = useCallback(async () => {
    if (!abVariant) return;

    try {
      // Use increment approach to avoid race conditions
      const { data: currentData } = await supabase
        .from('landing_ab_sessions')
        .select('cta_clicks')
        .eq('session_id', sessionId)
        .eq('test_name', abVariant.test_name)
        .single();

      await supabase
        .from('landing_ab_sessions')
        .update({ cta_clicks: (currentData?.cta_clicks || 0) + 1 })
        .eq('session_id', sessionId)
        .eq('test_name', abVariant.test_name);
    } catch (error) {
      console.error('Error tracking CTA click:', error);
    }
  }, [abVariant, sessionId]);

  const trackScrollDepth = useCallback(async (depth: number) => {
    if (!abVariant) return;

    try {
      await supabase
        .from('landing_ab_sessions')
        .update({ scroll_depth: depth })
        .eq('session_id', sessionId)
        .eq('test_name', abVariant.test_name);
    } catch (error) {
      console.error('Error tracking scroll depth:', error);
    }
  }, [abVariant, sessionId]);

  const trackConversion = useCallback(async (type: 'signup' | 'checkout' | 'purchase') => {
    if (!abVariant) return;

    try {
      await supabase
        .from('landing_ab_sessions')
        .update({
          converted: true,
          converted_at: new Date().toISOString(),
          conversion_type: type
        })
        .eq('session_id', sessionId)
        .eq('test_name', abVariant.test_name);
    } catch (error) {
      console.error('Error tracking conversion:', error);
    }
  }, [abVariant, sessionId]);

  const value = useMemo<LandingConfig>(() => ({
    settings,
    settingsLoaded,
    abVariant,
    abVariantLetter: abVariant?.variant || null,
    abTestEnabled,
    abTestLoading,
    contentFeatures,
    getSetting,
    isSettingEnabled,
    isFeatureEnabled,
    trackCTAClick,
    trackScrollDepth,
    trackConversion,
  }), [
    settings,
    settingsLoaded,
    abVariant,
    abTestEnabled,
    abTestLoading,
    contentFeatures,
    getSetting,
    isSettingEnabled,
    isFeatureEnabled,
    trackCTAClick,
    trackScrollDepth,
    trackConversion,
  ]);

  return (
    <LandingConfigContext.Provider value={value}>
      {children}
    </LandingConfigContext.Provider>
  );
}

export function useLandingConfig(): LandingConfig {
  const context = useContext(LandingConfigContext);
  if (!context) {
    throw new Error('useLandingConfig must be used within LandingConfigProvider');
  }
  return context;
}

// For backward compatibility with existing hooks
export function useLandingSettings() {
  const config = useLandingConfig();
  return {
    settings: config.settings,
    loading: !config.settingsLoaded,
    getSetting: config.getSetting,
    isEnabled: config.isSettingEnabled,
  };
}
