import { useEffect, useCallback, useRef } from 'react';

interface TimeMilestone {
  seconds: number;
  triggered: boolean;
}

export const useTimeTracking = () => {
  const milestonesRef = useRef<TimeMilestone[]>([
    { seconds: 30, triggered: false },
    { seconds: 60, triggered: false },
    { seconds: 120, triggered: false },
    { seconds: 300, triggered: false },
  ]);
  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const trackTimeSpent = useCallback((seconds: number) => {
    console.log(`Tracking time spent: ${seconds}s`);

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'TimeOnPage', {
        time_spent_seconds: seconds,
        page_url: window.location.pathname,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'time_on_page', {
        time_spent_seconds: seconds,
        page_location: window.location.href,
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('TimeOnPage', {
        time_spent_seconds: seconds,
      });
    }
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

      milestonesRef.current.forEach((milestone) => {
        if (!milestone.triggered && elapsed >= milestone.seconds) {
          milestone.triggered = true;
          trackTimeSpent(milestone.seconds);
        }
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [trackTimeSpent]);

  // Reset milestones and timer (useful for SPA navigation)
  const resetTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    milestonesRef.current.forEach((milestone) => {
      milestone.triggered = false;
    });
  }, []);

  // Get current time spent
  const getTimeSpent = useCallback(() => {
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }, []);

  return { resetTimer, getTimeSpent };
};
