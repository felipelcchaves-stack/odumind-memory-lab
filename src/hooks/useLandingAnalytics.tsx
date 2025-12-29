import { useEffect, useRef, useCallback } from 'react';

interface TrackedSection {
  id: string;
  name: string;
  triggered: boolean;
}

interface ScrollMilestone {
  depth: number;
  triggered: boolean;
}

interface TimeMilestone {
  seconds: number;
  triggered: boolean;
}

interface UseLandingAnalyticsOptions {
  sections?: { id: string; name: string }[];
  enabled?: boolean;
  delayStart?: number; // Delay before starting tracking (ms)
}

/**
 * Consolidated hook for all landing page analytics
 * Combines scroll tracking, time tracking, and section tracking
 * Uses throttling and passive listeners for performance
 */
export function useLandingAnalytics(options: UseLandingAnalyticsOptions = {}) {
  const { 
    sections = [], 
    enabled = true,
    delayStart = 1000 // Start tracking after 1 second
  } = options;

  // Refs to avoid re-renders
  const scrollMilestonesRef = useRef<ScrollMilestone[]>([
    { depth: 25, triggered: false },
    { depth: 50, triggered: false },
    { depth: 75, triggered: false },
    { depth: 100, triggered: false },
  ]);

  const timeMilestonesRef = useRef<TimeMilestone[]>([
    { seconds: 30, triggered: false },
    { seconds: 60, triggered: false },
    { seconds: 120, triggered: false },
    { seconds: 300, triggered: false },
  ]);

  const sectionMilestonesRef = useRef<TrackedSection[]>(
    sections.map(s => ({ ...s, triggered: false }))
  );

  const startTimeRef = useRef<number>(Date.now());
  const lastScrollTrackRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  // Track scroll depth
  const trackScrollDepth = useCallback((depth: number) => {
    if (typeof window === 'undefined') return;

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'ScrollDepth', {
        scroll_depth: depth,
        page_url: window.location.pathname,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'scroll_depth', {
        scroll_depth: depth,
        page_location: window.location.href,
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('ScrollDepth', { scroll_depth: depth });
    }
  }, []);

  // Track time spent
  const trackTimeSpent = useCallback((seconds: number) => {
    if (typeof window === 'undefined') return;

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
      window.ttq.track('TimeOnPage', { time_spent_seconds: seconds });
    }
  }, []);

  // Track section view
  const trackSectionView = useCallback((sectionName: string, sectionId: string) => {
    if (typeof window === 'undefined') return;

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'SectionView', {
        section_name: sectionName,
        section_id: sectionId,
        page_url: window.location.pathname,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'section_view', {
        section_name: sectionName,
        section_id: sectionId,
        page_location: window.location.href,
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('SectionView', { section_name: sectionName });
    }
  }, []);

  // Initialize tracking with delay
  useEffect(() => {
    if (!enabled || isInitializedRef.current) return;

    const initTimeout = setTimeout(() => {
      isInitializedRef.current = true;
      startTimeRef.current = Date.now();

      // Throttled scroll handler (max once per 200ms)
      const handleScroll = () => {
        const now = Date.now();
        if (now - lastScrollTrackRef.current < 200) return;
        lastScrollTrackRef.current = now;

        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);

        scrollMilestonesRef.current.forEach((milestone) => {
          if (!milestone.triggered && scrollPercent >= milestone.depth) {
            milestone.triggered = true;
            trackScrollDepth(milestone.depth);
          }
        });
      };

      // Time tracking interval (every 5 seconds instead of 1)
      const timeInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

        timeMilestonesRef.current.forEach((milestone) => {
          if (!milestone.triggered && elapsed >= milestone.seconds) {
            milestone.triggered = true;
            trackTimeSpent(milestone.seconds);
          }
        });
      }, 5000);

      // Section observer
      let sectionObserver: IntersectionObserver | null = null;
      if (sections.length > 0) {
        sectionObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                const section = sectionMilestonesRef.current.find(s => s.id === sectionId);
                
                if (section && !section.triggered) {
                  section.triggered = true;
                  trackSectionView(section.name, section.id);
                }
              }
            });
          },
          { threshold: 0.5 }
        );

        sectionMilestonesRef.current.forEach((section) => {
          const element = document.getElementById(section.id);
          if (element) {
            sectionObserver!.observe(element);
          }
        });
      }

      // Add scroll listener with passive flag for performance
      window.addEventListener('scroll', handleScroll, { passive: true });

      // Cleanup function stored in ref for later use
      const cleanup = () => {
        window.removeEventListener('scroll', handleScroll);
        clearInterval(timeInterval);
        sectionObserver?.disconnect();
      };

      // Store cleanup for component unmount
      (window as any).__landingAnalyticsCleanup = cleanup;
    }, delayStart);

    return () => {
      clearTimeout(initTimeout);
      (window as any).__landingAnalyticsCleanup?.();
      delete (window as any).__landingAnalyticsCleanup;
    };
  }, [enabled, delayStart, sections, trackScrollDepth, trackTimeSpent, trackSectionView]);

  // Reset all milestones
  const resetTracking = useCallback(() => {
    scrollMilestonesRef.current.forEach(m => m.triggered = false);
    timeMilestonesRef.current.forEach(m => m.triggered = false);
    sectionMilestonesRef.current.forEach(m => m.triggered = false);
    startTimeRef.current = Date.now();
  }, []);

  // Get current time spent
  const getTimeSpent = useCallback(() => {
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }, []);

  return {
    resetTracking,
    getTimeSpent,
  };
}
