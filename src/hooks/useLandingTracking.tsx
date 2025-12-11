import { useCallback } from 'react';

/**
 * Hook for tracking landing page specific events
 * Provides standardized tracking for all CTAs and interactions
 */
export const useLandingTracking = () => {
  
  // Track CTA clicks with source and plan info
  const trackCTAClick = useCallback((
    ctaName: string, 
    source: string, 
    planName?: string, 
    planValue?: number
  ) => {
    console.log(`Tracking CTA click: ${ctaName} from ${source}`);

    const eventData = {
      cta_name: ctaName,
      source: source,
      plan_name: planName,
      plan_value: planValue,
      page_url: window.location.pathname,
    };

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'CTAClick', eventData);
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'cta_click', eventData);
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('ClickButton', eventData);
    }
  }, []);

  // Track video interactions
  const trackVideoInteraction = useCallback((action: 'play' | 'pause' | 'complete' | 'click') => {
    console.log(`Tracking video: ${action}`);

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'VideoInteraction', {
        action: action,
        video_name: 'demo_video',
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'video_interaction', {
        action: action,
        video_name: 'demo_video',
      });
    }
  }, []);

  // Track popup/modal views
  const trackPopupView = useCallback((popupName: string) => {
    console.log(`Tracking popup view: ${popupName}`);

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'PopupView', {
        popup_name: popupName,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'popup_view', {
        popup_name: popupName,
      });
    }
  }, []);

  // Track popup close without action
  const trackPopupClose = useCallback((popupName: string, hadAction: boolean) => {
    console.log(`Tracking popup close: ${popupName}, action: ${hadAction}`);

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'PopupClose', {
        popup_name: popupName,
        had_action: hadAction,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'popup_close', {
        popup_name: popupName,
        had_action: hadAction,
      });
    }
  }, []);

  // Track lead capture (email submission)
  const trackLeadCapture = useCallback((source: string, hasDiscount: boolean = false) => {
    console.log(`Tracking lead capture from: ${source}`);

    // Meta Pixel - Standard Lead event
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', {
        content_name: source,
        has_discount: hasDiscount,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'generate_lead', {
        source: source,
        has_discount: hasDiscount,
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('SubmitForm', {
        content_name: source,
      });
    }

    // LinkedIn
    if (typeof window.lintrk === 'function') {
      window.lintrk('track', { conversion_id: 'lead' });
    }
  }, []);

  // Track InitiateCheckout (when user clicks to buy)
  const trackInitiateCheckout = useCallback((planName: string, value: number, source: string) => {
    console.log(`Tracking checkout initiation: ${planName} from ${source}`);

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'InitiateCheckout', {
        content_name: planName,
        value: value,
        currency: 'BRL',
        content_category: 'subscription',
        source: source,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'begin_checkout', {
        value: value,
        currency: 'BRL',
        items: [{
          item_name: planName,
          price: value,
        }],
        source: source,
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('InitiateCheckout', {
        content_name: planName,
        value: value,
        currency: 'BRL',
      });
    }

    // LinkedIn
    if (typeof window.lintrk === 'function') {
      window.lintrk('track', { conversion_id: 'checkout' });
    }
  }, []);

  // Track AddToCart (interest in plan)
  const trackAddToCart = useCallback((planName: string, value: number) => {
    console.log(`Tracking add to cart: ${planName}`);

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'AddToCart', {
        content_name: planName,
        value: value,
        currency: 'BRL',
        content_type: 'subscription',
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'add_to_cart', {
        value: value,
        currency: 'BRL',
        items: [{
          item_name: planName,
          price: value,
        }],
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('AddToCart', {
        content_name: planName,
        value: value,
        currency: 'BRL',
      });
    }
  }, []);

  return {
    trackCTAClick,
    trackVideoInteraction,
    trackPopupView,
    trackPopupClose,
    trackLeadCapture,
    trackInitiateCheckout,
    trackAddToCart,
  };
};
