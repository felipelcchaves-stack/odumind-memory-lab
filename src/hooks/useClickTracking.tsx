import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClickData {
  session_id: string;
  x_percent: number;
  y_percent: number;
  viewport_width: number;
  viewport_height: number;
  page_url: string;
  element_tag: string | null;
  element_id: string | null;
  element_class: string | null;
  element_text: string | null;
  ab_variant: string | null;
  device_type: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

const getSessionId = (): string => {
  let sessionId = localStorage.getItem('heatmap_session_id');
  if (!sessionId) {
    sessionId = `hm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('heatmap_session_id', sessionId);
  }
  return sessionId;
};

const getDeviceType = (): string => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

const getUtmParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
  };
};

const getAbVariant = (): string | null => {
  try {
    const stored = localStorage.getItem('ab_test_variant_hero_landing');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.variant || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

const truncateText = (text: string | null, maxLength: number = 50): string | null => {
  if (!text) return null;
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > maxLength ? trimmed.substring(0, maxLength) + '...' : trimmed;
};

export const useClickTracking = (enabled: boolean = true) => {
  const clickQueueRef = useRef<ClickData[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flushQueue = useCallback(async () => {
    if (clickQueueRef.current.length === 0) return;

    const clicks = [...clickQueueRef.current];
    clickQueueRef.current = [];

    try {
      const { error } = await supabase
        .from('click_coordinates')
        .insert(clicks);

      if (error) {
        console.error('[Heatmap] Error saving clicks:', error);
        // Re-add to queue on error (limit to prevent memory issues)
        if (clickQueueRef.current.length < 100) {
          clickQueueRef.current = [...clicks, ...clickQueueRef.current];
        }
      }
    } catch (err) {
      console.error('[Heatmap] Failed to flush clicks:', err);
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    flushTimeoutRef.current = setTimeout(() => {
      flushQueue();
    }, 2000); // Batch clicks every 2 seconds
  }, [flushQueue]);

  const handleClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Ignore clicks on interactive elements that would navigate away
    const isNavigating = target.closest('a[href^="http"]') || 
                         target.closest('button[type="submit"]');
    
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    
    // Calculate position relative to the full page
    const absoluteX = event.clientX + scrollX;
    const absoluteY = event.clientY + scrollY;
    
    // Get full page dimensions
    const pageWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth
    );
    const pageHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );

    const xPercent = (absoluteX / pageWidth) * 100;
    const yPercent = (absoluteY / pageHeight) * 100;

    const utmParams = getUtmParams();

    const clickData: ClickData = {
      session_id: getSessionId(),
      x_percent: Math.round(xPercent * 100) / 100,
      y_percent: Math.round(yPercent * 100) / 100,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      page_url: window.location.pathname,
      element_tag: target.tagName.toLowerCase(),
      element_id: target.id || null,
      element_class: target.className && typeof target.className === 'string' 
        ? truncateText(target.className, 100) 
        : null,
      element_text: truncateText(target.textContent, 50),
      ab_variant: getAbVariant(),
      device_type: getDeviceType(),
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
    };

    clickQueueRef.current.push(clickData);
    scheduleFlush();

    // Flush immediately if navigating away
    if (isNavigating) {
      flushQueue();
    }
  }, [scheduleFlush, flushQueue]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('click', handleClick, { passive: true });

    // Flush on page unload
    const handleBeforeUnload = () => {
      flushQueue();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      // Final flush on unmount
      flushQueue();
    };
  }, [enabled, handleClick, flushQueue]);

  return null;
};
