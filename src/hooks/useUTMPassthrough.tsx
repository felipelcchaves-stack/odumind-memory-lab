import { useEffect } from 'react';

export const useUTMPassthrough = (hotmartDomain = 'pay.hotmart.com') => {
  useEffect(() => {
    // Captura UTMs da URL atual
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: Record<string, string> = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((param) => {
      const value = urlParams.get(param);
      if (value) utmParams[param] = value;
    });
    
    // Captura fbclid para CAPI
    const fbclid = urlParams.get('fbclid');
    if (fbclid) utmParams['fbclid'] = fbclid;
    
    // Se não há UTMs, não faz nada
    if (Object.keys(utmParams).length === 0) return;
    
    const addUtmsToLinks = () => {
      const hotmartLinks = document.querySelectorAll<HTMLAnchorElement>(
        `a[href*="${hotmartDomain}"], a[href*="hotmart.com"]`
      );
      
      hotmartLinks.forEach((link) => {
        try {
          const url = new URL(link.href);
          
          // Adiciona cada UTM ao link
          Object.entries(utmParams).forEach(([key, value]) => {
            url.searchParams.set(key, value);
          });
          
          // Adiciona sck para rastreamento nativo Hotmart
          if (utmParams['utm_content']) {
            url.searchParams.set('sck', utmParams['utm_content']);
          }
          
          link.href = url.toString();
        } catch (e) {
          console.error('Erro ao processar link Hotmart:', e);
        }
      });
    };
    
    // Executa imediatamente
    addUtmsToLinks();
    
    // Observa mudanças no DOM para conteúdo dinâmico
    const observer = new MutationObserver(addUtmsToLinks);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    return () => observer.disconnect();
  }, [hotmartDomain]);
};
