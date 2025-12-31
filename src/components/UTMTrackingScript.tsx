import { useEffect, useRef } from 'react';

// Domínios de checkout suportados
const CHECKOUT_DOMAINS = [
  'pay.hotmart.com', 'hotmart.com', 'go.hotmart.com',
  'clkdmg.site', 'clkmg.com',
  'pay.gurudigital.com.br', 'digitalmanager.guru', 'guru.com.br',
  'eduzz.com', 'checkout.eduzz.com',
  'checkout.monetizze.com.br',
  'pay.kiwify.com.br',
  'pay.perfectpay.com.br',
  'pay.greenn.com.br'
];

// Mapeamento de domínio para parâmetro de tracking
const getTrackingParam = (url: string): string => {
  if (url.includes('hotmart.com') || url.includes('clkdmg.site') || url.includes('clkmg.com')) {
    return 'sck';
  }
  if (url.includes('guru') || url.includes('kiwify') || url.includes('perfectpay') || url.includes('greenn')) {
    return 'src';
  }
  if (url.includes('eduzz') || url.includes('monetizze')) {
    return 'utm_content';
  }
  return 'sck'; // default
};

// Gerar cookie _fbc
const generateFbc = (fbclid: string): string => {
  const timestamp = Math.floor(Date.now() / 1000);
  return `fb.1.${timestamp}.${fbclid}`;
};

// Gerar cookie _fbp
const generateFbp = (): string => {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
  return `fb.1.${timestamp}.${random}`;
};

// Obter cookie
const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
};

// Definir cookie
const setCookie = (name: string, value: string, days: number): void => {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
};

export const UTMTrackingScript = () => {
  const isInitialized = useRef(false);
  
  useEffect(() => {
    // Evitar múltiplas inicializações
    if (isInitialized.current) return;
    
    const init = () => {
      // Verificar se document.body existe
      if (typeof document === 'undefined' || !document.body) {
        requestAnimationFrame(init);
        return;
      }
      
      isInitialized.current = true;
      
      // 1. CAPTURA DE UTMs
      const urlParams = new URLSearchParams(window.location.search);
      const utmParams: Record<string, string> = {};
      
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach((param) => {
        const value = urlParams.get(param);
        if (value) utmParams[param] = value;
      });
      
      console.log('[UTMTracking] UTMs capturados:', utmParams);

      // 2. COOKIES DE META
      const fbclid = utmParams['fbclid'];
      
      // Gerar _fbc se tiver fbclid e não existir cookie
      if (fbclid && !getCookie('_fbc')) {
        const fbc = generateFbc(fbclid);
        setCookie('_fbc', fbc, 90);
        console.log('[UTMTracking] Cookie _fbc criado:', fbc);
      }
      
      // Gerar _fbp se não existir
      if (!getCookie('_fbp')) {
        const fbp = generateFbp();
        setCookie('_fbp', fbp, 90);
        console.log('[UTMTracking] Cookie _fbp criado:', fbp);
      }

      // 3. MODIFICAR LINKS DE CHECKOUT
      const modifyCheckoutLinks = () => {
        // Se não há UTMs, não faz nada
        if (Object.keys(utmParams).length === 0) return;
        
        // Criar seletor para todos os domínios
        const selector = CHECKOUT_DOMAINS.map(d => `a[href*="${d}"]`).join(', ');
        const checkoutLinks = document.querySelectorAll<HTMLAnchorElement>(selector);
        
        checkoutLinks.forEach((link) => {
          // Evitar processar o mesmo link duas vezes
          if (link.dataset.utmProcessed === 'true') return;
          
          try {
            const url = new URL(link.href);
            
            // a) Adicionar todos os UTMs como query params
            Object.entries(utmParams).forEach(([key, value]) => {
              url.searchParams.set(key, value);
            });
            
            // b) Adicionar parâmetro de tracking codificado
            const trackingParam = getTrackingParam(link.href);
            const trackingValue = [
              utmParams['utm_source'] || '',
              utmParams['utm_medium'] || '',
              utmParams['utm_campaign'] || '',
              utmParams['utm_content'] || '',
              getCookie('_fbc') || utmParams['fbclid'] || ''
            ].filter(Boolean).join('__');
            
            if (trackingValue) {
              url.searchParams.set(trackingParam, trackingValue);
            }
            
            link.href = url.toString();
            link.dataset.utmProcessed = 'true';
            
            console.log('[UTMTracking] Link modificado:', link.href);
            
            // 4. EVENTO INITIATE CHECKOUT ao clicar
            link.addEventListener('click', () => {
              const fbp = getCookie('_fbp');
              const fbc = getCookie('_fbc');
              
              // Disparar evento fbq
              if (typeof window !== 'undefined' && (window as any).fbq) {
                (window as any).fbq('track', 'InitiateCheckout', {
                  content_name: url.hostname,
                  utm_source: utmParams['utm_source'],
                  utm_campaign: utmParams['utm_campaign']
                });
                console.log('[UTMTracking] fbq InitiateCheckout disparado');
              }
              
              // Enviar beacon para tracking
              const payload = {
                event_name: 'InitiateCheckout',
                page_url: window.location.href,
                fbp,
                fbc,
                utm_source: utmParams['utm_source'] || null,
                utm_medium: utmParams['utm_medium'] || null,
                utm_campaign: utmParams['utm_campaign'] || null,
                utm_content: utmParams['utm_content'] || null
              };
              
              if (navigator.sendBeacon) {
                navigator.sendBeacon(
                  'https://kmvcrnrpdcnjegrkaeci.supabase.co/functions/v1/track-pixel-events',
                  JSON.stringify(payload)
                );
                console.log('[UTMTracking] Beacon enviado:', payload);
              }
            });
          } catch (e) {
            console.error('[UTMTracking] Erro ao processar link:', e);
          }
        });
      };
      
      // Executar imediatamente
      modifyCheckoutLinks();
      
      // 5. MUTATION OBSERVER para links dinâmicos com debounce
      let debounceTimeout: ReturnType<typeof setTimeout>;
      const observer = new MutationObserver(() => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(modifyCheckoutLinks, 100);
      });
      
      try {
        observer.observe(document.body, { 
          childList: true, 
          subtree: true 
        });
        console.log('[UTMTracking] Inicializado com sucesso');
      } catch (e) {
        console.error('[UTMTracking] Erro ao iniciar observer:', e);
      }
      
      return () => {
        clearTimeout(debounceTimeout);
        observer.disconnect();
      };
    };
    
    // Aguardar o DOM estar pronto
    const timeoutId = setTimeout(init, 50);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  return null;
};

export default UTMTrackingScript;
