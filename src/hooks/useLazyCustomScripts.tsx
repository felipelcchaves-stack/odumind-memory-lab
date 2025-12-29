import { useEffect, useRef, useCallback } from 'react';

interface CustomScriptsConfig {
  enabled?: boolean;
  delayMs?: number;
}

/**
 * Lazy loading custom scripts hook
 * Loads tracking scripts AFTER first paint to avoid blocking rendering
 * Uses requestIdleCallback for non-critical scripts
 */
export function useLazyCustomScripts(config: CustomScriptsConfig = {}) {
  const { enabled = true, delayMs = 2000 } = config;
  const isLoadedRef = useRef(false);
  const cleanupRef = useRef<(() => void)[]>([]);

  const loadMetaPixel = useCallback((pixelId: string) => {
    if (!pixelId || typeof window === 'undefined') return;

    // Check if already loaded
    if (typeof window.fbq === 'function') return;

    const script = document.createElement('script');
    script.id = 'meta-pixel-script';
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    cleanupRef.current.push(() => {
      const el = document.getElementById('meta-pixel-script');
      el?.remove();
    });
  }, []);

  const loadGoogleAnalytics = useCallback((gaId: string) => {
    if (!gaId || typeof window === 'undefined') return;

    // Check if already loaded
    if (typeof window.gtag === 'function') return;

    const script = document.createElement('script');
    script.id = 'ga-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    const inlineScript = document.createElement('script');
    inlineScript.id = 'ga-inline-script';
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(inlineScript);

    cleanupRef.current.push(() => {
      document.getElementById('ga-script')?.remove();
      document.getElementById('ga-inline-script')?.remove();
    });
  }, []);

  const loadTikTokPixel = useCallback((pixelId: string) => {
    if (!pixelId || typeof window === 'undefined') return;

    // Check if already loaded
    if (window.ttq) return;

    const script = document.createElement('script');
    script.id = 'tiktok-pixel-script';
    script.innerHTML = `
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
        ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
        ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
        for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
        ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
        ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
        ttq._o=ttq._o||{};ttq._o[e]=n||{};
        var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
        var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${pixelId}');
        ttq.page();
      }(window, document, 'ttq');
    `;
    document.head.appendChild(script);

    cleanupRef.current.push(() => {
      document.getElementById('tiktok-pixel-script')?.remove();
    });
  }, []);

  const loadLinkedInInsight = useCallback((partnerId: string) => {
    if (!partnerId || typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.id = 'linkedin-insight-script';
    script.innerHTML = `
      _linkedin_partner_id = "${partnerId}";
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(_linkedin_partner_id);
      (function(l) {
        if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
        window.lintrk.q=[]}
        var s = document.getElementsByTagName("script")[0];
        var b = document.createElement("script");
        b.type = "text/javascript";b.async = true;
        b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
        s.parentNode.insertBefore(b, s);})(window.lintrk);
    `;
    document.head.appendChild(script);

    cleanupRef.current.push(() => {
      document.getElementById('linkedin-insight-script')?.remove();
    });
  }, []);

  const injectCustomScripts = useCallback((htmlContent: string, target: 'head' | 'body') => {
    if (!htmlContent || typeof window === 'undefined') return;

    const container = document.createElement('div');
    container.innerHTML = htmlContent;

    const targetElement = target === 'head' ? document.head : document.body;
    const fragment = document.createDocumentFragment();
    const addedElements: HTMLElement[] = [];

    // Process script tags
    const scripts = container.querySelectorAll('script');
    scripts.forEach((script, index) => {
      const newScript = document.createElement('script');
      newScript.id = `custom-script-${target}-${index}`;
      
      // Copy attributes
      Array.from(script.attributes).forEach(attr => {
        if (attr.name !== 'id') {
          newScript.setAttribute(attr.name, attr.value);
        }
      });
      
      if (script.innerHTML) {
        newScript.innerHTML = script.innerHTML;
      }
      
      fragment.appendChild(newScript);
      addedElements.push(newScript);
    });

    // Process other elements
    const otherElements = container.querySelectorAll(':not(script)');
    otherElements.forEach((el, index) => {
      const clone = el.cloneNode(true) as HTMLElement;
      clone.id = `custom-element-${target}-${index}`;
      fragment.appendChild(clone);
      addedElements.push(clone);
    });

    targetElement.appendChild(fragment);

    cleanupRef.current.push(() => {
      addedElements.forEach(el => el.remove());
    });
  }, []);

  useEffect(() => {
    if (!enabled || isLoadedRef.current) return;

    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleLoad = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(callback, { timeout: delayMs + 1000 });
      } else {
        setTimeout(callback, delayMs);
      }
    };

    const loadTimeout = setTimeout(() => {
      isLoadedRef.current = true;

      scheduleLoad(async () => {
        try {
          // Fetch settings from edge function
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-settings`,
            {
              headers: {
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              }
            }
          );

          if (!response.ok) return;

          const settings = await response.json();

          // Load pixels with staggered timing
          if (settings.meta_pixel_id) {
            loadMetaPixel(settings.meta_pixel_id);
          }

          if (settings.google_analytics_id) {
            setTimeout(() => loadGoogleAnalytics(settings.google_analytics_id), 100);
          }

          if (settings.tiktok_pixel_id) {
            setTimeout(() => loadTikTokPixel(settings.tiktok_pixel_id), 200);
          }

          if (settings.linkedin_partner_id) {
            setTimeout(() => loadLinkedInInsight(settings.linkedin_partner_id), 300);
          }

          // Load custom scripts
          if (settings.custom_head_scripts) {
            setTimeout(() => injectCustomScripts(settings.custom_head_scripts, 'head'), 500);
          }

          if (settings.custom_body_scripts) {
            setTimeout(() => injectCustomScripts(settings.custom_body_scripts, 'body'), 600);
          }
        } catch (error) {
          console.error('Error loading tracking scripts:', error);
        }
      });
    }, delayMs);

    return () => {
      clearTimeout(loadTimeout);
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
      isLoadedRef.current = false;
    };
  }, [
    enabled,
    delayMs,
    loadMetaPixel,
    loadGoogleAnalytics,
    loadTikTokPixel,
    loadLinkedInInsight,
    injectCustomScripts,
  ]);

  return null;
}
