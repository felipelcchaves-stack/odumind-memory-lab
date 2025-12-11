import { useEffect, useCallback, useRef } from 'react';

interface ScrollMilestone {
  depth: number;
  triggered: boolean;
}

export const useScrollTracking = () => {
  const milestonesRef = useRef<ScrollMilestone[]>([
    { depth: 25, triggered: false },
    { depth: 50, triggered: false },
    { depth: 75, triggered: false },
    { depth: 100, triggered: false },
  ]);

  const trackScrollDepth = useCallback((depth: number) => {
    console.log(`Tracking scroll depth: ${depth}%`);

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
      window.ttq.track('ScrollDepth', {
        scroll_depth: depth,
      });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      milestonesRef.current.forEach((milestone) => {
        if (!milestone.triggered && scrollPercent >= milestone.depth) {
          milestone.triggered = true;
          trackScrollDepth(milestone.depth);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [trackScrollDepth]);

  // Reset milestones (useful for SPA navigation)
  const resetMilestones = useCallback(() => {
    milestonesRef.current.forEach((milestone) => {
      milestone.triggered = false;
    });
  }, []);

  return { resetMilestones };
};
