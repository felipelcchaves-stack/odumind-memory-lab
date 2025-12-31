import { useEffect } from 'react';
import { getUtmParams } from '@/lib/utmUtils';

// Domínios de checkout suportados
const DEFAULT_CHECKOUT_DOMAINS = [
  'pay.hotmart.com',
  'hotmart.com',
  'clkdmg.site',
  'pay.guru.com.br',
  'digitalmanager.guru',
];

export const useUTMPassthrough = (domains: string[] = DEFAULT_CHECKOUT_DOMAINS) => {
  useEffect(() => {
    const utmParams = getUtmParams();
    
    // Se não há UTMs, não faz nada
    if (Object.keys(utmParams).length === 0) return;
    
    const addUtmsToLinks = () => {
      // Cria seletor para todos os domínios
      const selector = domains.map(d => `a[href*="${d}"]`).join(', ');
      const checkoutLinks = document.querySelectorAll<HTMLAnchorElement>(selector);
      
      checkoutLinks.forEach((link) => {
        try {
          const url = new URL(link.href);
          
          // Adiciona cada UTM ao link
          Object.entries(utmParams).forEach(([key, value]) => {
            url.searchParams.set(key, value);
          });
          
          // Adiciona sck para rastreamento nativo (Hotmart/Guru)
          if (utmParams['utm_content']) {
            url.searchParams.set('sck', utmParams['utm_content']);
          }
          
          link.href = url.toString();
        } catch (e) {
          console.error('[UTM] Erro ao processar link de checkout:', e);
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
  }, [domains]);
};
