import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UtmParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer: string | null;
  landing_page: string;
  timestamp: string;
}

const UTM_STORAGE_KEY = 'isesemind_utm_params';

export const useUtmTracking = () => {
  // Capture UTM parameters on page load
  useEffect(() => {
    captureUtmParams();
  }, []);

  const captureUtmParams = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    const utmSource = urlParams.get('utm_source');
    const utmMedium = urlParams.get('utm_medium');
    const utmCampaign = urlParams.get('utm_campaign');
    const utmTerm = urlParams.get('utm_term');
    const utmContent = urlParams.get('utm_content');

    // Only store if at least one UTM parameter exists
    if (utmSource || utmMedium || utmCampaign || utmTerm || utmContent) {
      const utmData: UtmParams = {
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_term: utmTerm,
        utm_content: utmContent,
        referrer: document.referrer || null,
        landing_page: window.location.pathname,
        timestamp: new Date().toISOString(),
      };

      // Store in localStorage for persistence
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));

      // Track UTM view event
      trackUtmEvent('utm_captured', utmData);

      console.log('UTM Parameters captured:', utmData);
    }
  }, []);

  const trackUtmEvent = useCallback((eventName: string, data: Partial<UtmParams>) => {
    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, data);
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        ...data,
        event_category: 'utm_tracking',
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track(eventName, data);
    }
  }, []);

  const getStoredUtmParams = useCallback((): UtmParams | null => {
    const stored = localStorage.getItem(UTM_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const clearUtmParams = useCallback(() => {
    localStorage.removeItem(UTM_STORAGE_KEY);
  }, []);

  // Save UTM data to database when user signs up or converts
  const saveUtmToDatabase = useCallback(async (userId: string) => {
    const utmParams = getStoredUtmParams();
    if (!utmParams || !userId) return;

    try {
      const { error } = await supabase
        .from('utm_tracking')
        .insert({
          user_id: userId,
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
          utm_term: utmParams.utm_term,
          utm_content: utmParams.utm_content,
          referrer: utmParams.referrer,
          landing_page: utmParams.landing_page,
        });

      if (error) {
        console.error('Error saving UTM to database:', error);
      } else {
        console.log('UTM data saved to database');
        // Clear after saving to prevent duplicates
        clearUtmParams();
      }
    } catch (err) {
      console.error('Error saving UTM:', err);
    }
  }, [getStoredUtmParams, clearUtmParams]);

  return {
    captureUtmParams,
    getStoredUtmParams,
    saveUtmToDatabase,
    clearUtmParams,
    trackUtmEvent,
  };
};
