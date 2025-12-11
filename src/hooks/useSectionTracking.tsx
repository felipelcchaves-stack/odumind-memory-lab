import { useEffect, useCallback, useRef } from 'react';

interface TrackedSection {
  id: string;
  name: string;
  triggered: boolean;
}

export const useSectionTracking = (sections: { id: string; name: string }[]) => {
  const trackedSectionsRef = useRef<TrackedSection[]>(
    sections.map(s => ({ ...s, triggered: false }))
  );

  const trackSectionView = useCallback((sectionName: string, sectionId: string) => {
    console.log(`Tracking section view: ${sectionName}`);

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
      window.ttq.track('SectionView', {
        section_name: sectionName,
      });
    }
  }, []);

  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          const section = trackedSectionsRef.current.find(s => s.id === sectionId);
          
          if (section && !section.triggered) {
            section.triggered = true;
            trackSectionView(section.name, section.id);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.5, // Trigger when 50% of section is visible
    });

    // Observe all sections
    trackedSectionsRef.current.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [trackSectionView]);

  // Reset triggered sections (useful for SPA navigation)
  const resetSections = useCallback(() => {
    trackedSectionsRef.current.forEach((section) => {
      section.triggered = false;
    });
  }, []);

  return { resetSections };
};
