/**
 * Utilitário para garantir URLs consistentes em ambiente de produção.
 * Sempre usa o domínio customizado para links externos (emails, convites, indicações)
 * independente do domínio atual (preview lovable.app ou localhost).
 */

export const PRODUCTION_URL = 'https://isesemind.ileaseifatokun.com.br';

/**
 * Retorna a URL base do site.
 * - Em localhost: retorna localhost para facilitar desenvolvimento
 * - Em qualquer outro ambiente: retorna o domínio de produção
 * 
 * Isso garante que emails de confirmação, links de convite e indicação
 * sempre apontem para o domínio correto, mesmo quando testando no preview.
 */
export function getSiteUrl(): string {
  // Se estiver em desenvolvimento local, usar localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return window.location.origin;
  }
  
  // Em qualquer outro caso (produção ou preview), usar domínio de produção
  return PRODUCTION_URL;
}

/**
 * Retorna a URL de produção sempre, sem considerar o ambiente atual.
 * Use para links que SEMPRE devem apontar para produção (ex: emails marketing).
 */
export function getProductionUrl(): string {
  return PRODUCTION_URL;
}
