import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClickData {
  x_percent: number;
  y_percent: number;
  viewport_width: number;
  viewport_height: number;
  page_url: string;
  element_id: string | null;
  element_class: string | null;
  element_text: string | null;
  element_tag: string | null;
  session_id: string;
  device_type: string;
  ab_variant: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

// Helper functions
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('click_session_id');
  if (!sessionId) {
    sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('click_session_id', sessionId);
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
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
  };
};

const getAbVariant = (): string | null => {
  return localStorage.getItem('ab_variant_hero_v1');
};

const truncateText = (text: string | null, maxLength: number = 50): string | null => {
  if (!text) return null;
  const cleaned = text.trim().replace(/\s+/g, ' ');
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
};

/**
 * Delayed click tracking hook
 * Starts tracking only after specified delay to avoid blocking initial render
 * Uses larger batch intervals for better performance
 */
export function useDelayedClickTracking(enabled: boolean = true, delayMs: number = 3000) {
  const clickQueueRef = useRef<ClickData[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  // Flush queue to database
  const flushQueue = useCallback(async () => {
    if (clickQueueRef.current.length === 0) return;

    const clicks = [...clickQueueRef.current];
    clickQueueRef.current = [];

    try {
      await supabase.from('click_coordinates').insert(clicks);
    } catch (error) {
      // On error, add clicks back to queue (max 50 to prevent memory issues)
      clickQueueRef.current = [...clicks.slice(-25), ...clickQueueRef.current].slice(-50);
      console.error('Error flushing click queue:', error);
    }
  }, []);

  // Schedule flush with larger interval (5 seconds)
  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) return;
    
    flushTimeoutRef.current = setTimeout(() => {
      flushTimeoutRef.current = null;
      flushQueue();
    }, 5000);
  }, [flushQueue]);

  // Handle click
  const handleClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target) return;

    const x = event.clientX;
    const y = event.clientY + window.scrollY;
    const viewportWidth = window.innerWidth;
    const viewportHeight = document.documentElement.scrollHeight;

    const utmParams = getUtmParams();

    const clickData: ClickData = {
      x_percent: Number(((x / viewportWidth) * 100).toFixed(2)),
      y_percent: Number(((y / viewportHeight) * 100).toFixed(4)),
      viewport_width: viewportWidth,
      viewport_height: viewportHeight,
      page_url: window.location.pathname + window.location.search,
      element_id: target.id || null,
      element_class: target.className?.toString().substring(0, 200) || null,
      element_text: truncateText(target.textContent),
      element_tag: target.tagName?.toLowerCase() || null,
      session_id: getSessionId(),
      device_type: getDeviceType(),
      ab_variant: getAbVariant(),
      utm_source: utmParams.source,
      utm_medium: utmParams.medium,
      utm_campaign: utmParams.campaign,
    };

    clickQueueRef.current.push(clickData);
    scheduleFlush();
  }, [scheduleFlush]);

  useEffect(() => {
    if (!enabled) return;

    // Delay initialization
    const initTimeout = setTimeout(() => {
      isActiveRef.current = true;
      
      document.addEventListener('click', handleClick, { passive: true });

      // Flush on page unload
      const handleBeforeUnload = () => {
        if (clickQueueRef.current.length > 0) {
          // Use sendBeacon for reliable delivery
          const data = JSON.stringify(clickQueueRef.current);
          navigator.sendBeacon?.(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/click_coordinates`,
            new Blob([data], { type: 'application/json' })
          );
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      // Store cleanup reference
      (window as any).__clickTrackingCleanup = () => {
        document.removeEventListener('click', handleClick);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (flushTimeoutRef.current) {
          clearTimeout(flushTimeoutRef.current);
        }
        flushQueue();
      };
    }, delayMs);

    return () => {
      clearTimeout(initTimeout);
      (window as any).__clickTrackingCleanup?.();
      delete (window as any).__clickTrackingCleanup;
    };
  }, [enabled, delayMs, handleClick, flushQueue]);

  return null;
}
