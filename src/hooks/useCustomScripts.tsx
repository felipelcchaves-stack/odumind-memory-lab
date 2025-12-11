import { useEffect } from 'react';

const SUPABASE_URL = 'https://wmwuirqdluzjdqtmfzsm.supabase.co';

/**
 * Hook that loads all tracking scripts (custom scripts + pixels)
 * ONLY on the landing page. Scripts are cleaned up when navigating away.
 */
export const useCustomScripts = () => {
  useEffect(() => {
    let scriptsInjected: HTMLElement[] = [];
    let aborted = false;

    const loadScripts = async () => {
      console.log('[Tracking] Iniciando carregamento de scripts de tracking (landing page)...');

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-public-settings`);
        if (!response.ok) throw new Error('Failed to load settings: ' + response.status);

        const settings = await response.json();
        console.log('[Tracking] Settings carregados:', Object.keys(settings));

        if (aborted) return;

        // Check if tracking is enabled
        if (settings.tracking_enabled !== 'true') {
          console.log('[Tracking] Tracking está desabilitado nas configurações');
          return;
        }

        console.log('[Tracking] Tracking habilitado, processando scripts...');

        // 1. Inject custom_head_scripts
        if (settings.custom_head_scripts?.trim()) {
          console.log('[Tracking] Injetando custom_head_scripts...');
          try {
            const elements = injectScripts(settings.custom_head_scripts, 'head');
            scriptsInjected.push(...elements);
            console.log('[Tracking] custom_head_scripts injetados:', elements.length, 'elementos');
          } catch (error) {
            console.error('[Tracking] Erro ao injetar custom_head_scripts:', error);
          }
        }

        // 2. Load Meta Pixel via ID (only if not already loaded)
        if (settings.meta_pixel_id?.trim() && !window.fbq) {
          console.log('[Tracking] Carregando Meta Pixel via ID:', settings.meta_pixel_id);
          loadMetaPixel(settings.meta_pixel_id);
        } else if (window.fbq) {
          console.log('[Tracking] Meta Pixel já carregado via custom scripts');
        }

        // 3. Load Google Analytics
        if (settings.google_analytics_id?.trim() && !window.gtag) {
          console.log('[Tracking] Carregando Google Analytics:', settings.google_analytics_id);
          const gaScript = loadGoogleAnalytics(settings.google_analytics_id);
          if (gaScript) scriptsInjected.push(gaScript);
        }

        // 4. Load TikTok Pixel
        if (settings.tiktok_pixel_id?.trim() && !window.ttq) {
          console.log('[Tracking] Carregando TikTok Pixel:', settings.tiktok_pixel_id);
          loadTikTokPixel(settings.tiktok_pixel_id);
        }

        // 5. Load LinkedIn Insight Tag
        if (settings.linkedin_partner_id?.trim() && !window.lintrk) {
          console.log('[Tracking] Carregando LinkedIn Insight Tag:', settings.linkedin_partner_id);
          loadLinkedInInsight(settings.linkedin_partner_id);
        }

        // 6. Inject custom_body_scripts
        if (settings.custom_body_scripts?.trim()) {
          console.log('[Tracking] Injetando custom_body_scripts...');
          try {
            const elements = injectScripts(settings.custom_body_scripts, 'body');
            scriptsInjected.push(...elements);
            console.log('[Tracking] custom_body_scripts injetados:', elements.length, 'elementos');
          } catch (error) {
            console.error('[Tracking] Erro ao injetar custom_body_scripts:', error);
          }
        }

        console.log('[Tracking] Carregamento de scripts finalizado com sucesso (landing page only)');

      } catch (error) {
        console.error('[Tracking] Erro ao carregar tracking pixels:', error);
      }
    };

    loadScripts();

    // Cleanup: remove injected scripts when navigating away
    return () => {
      aborted = true;
      console.log('[Tracking] Limpando scripts de tracking (saindo da landing page)...');
      scriptsInjected.forEach(el => {
        try {
          el.parentNode?.removeChild(el);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
    };
  }, []);
};

/**
 * Inject HTML content containing scripts into head or body
 */
function injectScripts(html: string, target: 'head' | 'body'): HTMLElement[] {
  const injected: HTMLElement[] = [];
  const container = document.createElement('div');
  container.innerHTML = html;

  const targetElement = target === 'head' ? document.head : document.body;

  // Process scripts
  const scripts = container.querySelectorAll('script');
  scripts.forEach(oldScript => {
    const newScript = document.createElement('script');

    // Copy attributes
    Array.from(oldScript.attributes).forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });

    // Copy inline content
    if (oldScript.textContent) {
      newScript.textContent = oldScript.textContent;
    }

    // External scripts should be async
    if (oldScript.src) {
      newScript.async = true;
    }

    targetElement.appendChild(newScript);
    injected.push(newScript);
  });

  // Add non-script elements (noscript, img for tracking, etc)
  Array.from(container.children).forEach(el => {
    if (el.tagName !== 'SCRIPT') {
      const clone = el.cloneNode(true) as HTMLElement;
      targetElement.appendChild(clone);
      injected.push(clone);
    }
  });

  return injected;
}

/**
 * Load Meta Pixel
 */
function loadMetaPixel(pixelId: string): void {
  (function(f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
  console.log('[Tracking] Meta Pixel carregado via ID');
}

/**
 * Load Google Analytics
 */
function loadGoogleAnalytics(gaId: string): HTMLScriptElement {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;
  gtag('js', new Date());
  gtag('config', gaId);

  console.log('[Tracking] Google Analytics carregado');
  return script;
}

/**
 * Load TikTok Pixel
 */
function loadTikTokPixel(pixelId: string): void {
  (function(w: any, d: Document, t: string) {
    w.TiktokAnalyticsObject = t;
    const ttq: any = w[t] = w[t] || [];
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    ttq.setAndDefer = function(t: any, e: string) {
      t[e] = function() {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i]);
    }
    ttq.instance = function(t: string) {
      const e = ttq._i[t] || [];
      for (let n = 0; n < ttq.methods.length; n++) {
        ttq.setAndDefer(e, ttq.methods[n]);
      }
      return e;
    };
    ttq.load = function(e: string, n?: any) {
      const i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = i;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      const o = d.createElement('script') as HTMLScriptElement;
      o.type = 'text/javascript';
      o.async = true;
      o.src = i + '?sdkid=' + e + '&lib=' + t;
      const a = d.getElementsByTagName('script')[0];
      a.parentNode?.insertBefore(o, a);
    };
    ttq.load(pixelId);
    ttq.page();
  })(window, document, 'ttq');

  console.log('[Tracking] TikTok Pixel carregado');
}

/**
 * Load LinkedIn Insight Tag
 */
function loadLinkedInInsight(partnerId: string): void {
  (window as any)._linkedin_partner_id = partnerId;
  (window as any)._linkedin_data_partner_ids = (window as any)._linkedin_data_partner_ids || [];
  (window as any)._linkedin_data_partner_ids.push(partnerId);

  (function(l: any) {
    if (!l) {
      (window as any).lintrk = function(a: any, b: any) {
        (window as any).lintrk.q.push([a, b]);
      };
      (window as any).lintrk.q = [];
    }
    const s = document.getElementsByTagName('script')[0];
    const b = document.createElement('script');
    b.type = 'text/javascript';
    b.async = true;
    b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    s.parentNode?.insertBefore(b, s);
  })((window as any).lintrk);

  console.log('[Tracking] LinkedIn Insight Tag carregado');
}

// Note: Window interface for fbq, gtag, ttq, lintrk is declared in usePixelTracking.tsx
