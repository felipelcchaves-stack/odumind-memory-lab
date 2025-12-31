/**
 * Utilitário para capturar e adicionar UTMs a URLs de checkout
 */

export const getUtmParams = (): Record<string, string> => {
  const urlParams = new URLSearchParams(window.location.search);
  const utmParams: Record<string, string> = {};
  
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((param) => {
    const value = urlParams.get(param);
    if (value) utmParams[param] = value;
  });
  
  // Captura fbclid para correlação com Meta Conversions API
  const fbclid = urlParams.get('fbclid');
  if (fbclid) utmParams['fbclid'] = fbclid;
  
  return utmParams;
};

export const appendUtmToUrl = (baseUrl: string): string => {
  if (!baseUrl) return baseUrl;
  
  const utmParams = getUtmParams();
  
  // Se não há UTMs, retorna URL original
  if (Object.keys(utmParams).length === 0) return baseUrl;
  
  try {
    const url = new URL(baseUrl);
    
    // Adiciona cada UTM ao link
    Object.entries(utmParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    // Adiciona sck para rastreamento nativo (funciona em Hotmart e Guru)
    if (utmParams['utm_content']) {
      url.searchParams.set('sck', utmParams['utm_content']);
    }
    
    console.log('[UTM] URL original:', baseUrl);
    console.log('[UTM] URL com UTMs:', url.toString());
    
    return url.toString();
  } catch (e) {
    console.error('[UTM] Erro ao processar URL:', e);
    return baseUrl;
  }
};
