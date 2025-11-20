import { useEffect } from 'react';

// Extend window interface for tracking scripts
declare global {
  interface Window {
    fbq?: (action: string, event: string, data?: any) => void;
    gtag?: (...args: any[]) => void;
    ttq?: {
      track: (event: string, data?: any) => void;
      page: () => void;
    };
    lintrk?: (action: string, data?: any) => void;
  }
}

export const usePixelTracking = () => {
  // Track page views on mount
  useEffect(() => {
    trackPageView();
  }, []);

  const trackPageView = () => {
    // Meta Pixel (Facebook/Instagram)
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view');
    }

    // TikTok Pixel
    if (window.ttq?.page) {
      window.ttq.page();
    }
  };

  const trackSignUp = (method: string = 'email') => {
    console.log('Tracking signup:', method);

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'CompleteRegistration', {
        content_name: 'User Signup',
        method: method,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'sign_up', {
        method: method,
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('CompleteRegistration', {
        content_name: 'User Signup',
      });
    }

    // LinkedIn
    if (typeof window.lintrk === 'function') {
      window.lintrk('track', { conversion_id: 'signup' });
    }
  };

  const trackPurchase = (value: number, currency: string = 'BRL', planName: string) => {
    console.log('Tracking purchase:', { value, currency, planName });

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Purchase', {
        value: value,
        currency: currency,
        content_name: planName,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'purchase', {
        value: value,
        currency: currency,
        transaction_id: `${Date.now()}_${planName}`,
        items: [{
          item_name: planName,
          price: value,
        }],
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('PlaceAnOrder', {
        content_name: planName,
        value: value,
        currency: currency,
      });
    }

    // LinkedIn
    if (typeof window.lintrk === 'function') {
      window.lintrk('track', { conversion_id: 'purchase' });
    }
  };

  const trackInitiateCheckout = (planName: string, value: number) => {
    console.log('Tracking checkout initiation:', { planName, value });

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'InitiateCheckout', {
        content_name: planName,
        value: value,
        currency: 'BRL',
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'begin_checkout', {
        value: value,
        currency: 'BRL',
        items: [{
          item_name: planName,
        }],
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('InitiateCheckout', {
        content_name: planName,
      });
    }
  };

  const trackAddToCart = (planName: string, value: number) => {
    console.log('Tracking add to cart:', { planName, value });

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'AddToCart', {
        content_name: planName,
        value: value,
        currency: 'BRL',
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'add_to_cart', {
        value: value,
        currency: 'BRL',
        items: [{
          item_name: planName,
        }],
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('AddToCart', {
        content_name: planName,
      });
    }
  };

  const trackViewContent = (contentName: string, contentType: string = 'product') => {
    console.log('Tracking view content:', { contentName, contentType });

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent', {
        content_name: contentName,
        content_type: contentType,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'view_item', {
        items: [{
          item_name: contentName,
        }],
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('ViewContent', {
        content_name: contentName,
      });
    }
  };

  return {
    trackPageView,
    trackSignUp,
    trackPurchase,
    trackInitiateCheckout,
    trackAddToCart,
    trackViewContent,
  };
};
