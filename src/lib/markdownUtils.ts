import TurndownService from 'turndown';

// Configuração do conversor HTML → Markdown
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// Remove tags desnecessárias do Google Docs
turndownService.remove(['script', 'style', 'meta', 'link']);

// Preserva quebras de linha
turndownService.addRule('lineBreak', {
  filter: 'br',
  replacement: () => '\n',
});

/**
 * Converte HTML para Markdown
 * Remove estilos inline e classes do Google Docs
 */
export function htmlToMarkdown(html: string): string {
  // Remove estilos inline e atributos do Google Docs
  const cleanHtml = html
    .replace(/style="[^"]*"/g, '') // Remove style attributes
    .replace(/class="[^"]*"/g, '') // Remove class attributes
    .replace(/id="docs-internal-guid-[^"]*"/g, '') // Remove Google Docs IDs
    .replace(/<span[^>]*>/g, '') // Remove span tags
    .replace(/<\/span>/g, '')
    .replace(/&nbsp;/g, ' '); // Normaliza espaços

  return turndownService.turndown(cleanHtml);
}

/**
 * Extrai texto do clipboard e converte para Markdown se necessário
 */
export function extractClipboardContent(event: ClipboardEvent): string {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return '';

  // Tenta pegar HTML primeiro (preserva formatação)
  const html = clipboardData.getData('text/html');
  if (html) {
    return htmlToMarkdown(html);
  }

  // Se não tiver HTML, pega texto plano
  return clipboardData.getData('text/plain');
}

/**
 * Sanitiza HTML do ReactQuill removendo estilos inline e tags não permitidas
 * Especialmente otimizado para limpar HTML do Google Docs
 */
export function sanitizeQuillHtml(html: string): string {
  if (!html || html === '<p><br></p>') return html;
  
  // 1. PRIMEIRO: Decodificar caracteres HTML escapados (pode estar duplo/triplo)
  let clean = html;
  let previousClean = '';
  
  // Loop para decodificar múltiplas vezes até não haver mais mudanças
  while (clean !== previousClean) {
    previousClean = clean;
    clean = clean
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
  
  // 1. Remove IDs do Google Docs (deve vir primeiro)
  clean = clean.replace(/id="docs-internal-guid-[^"]*"/g, '');
  
  // 2. Remove TODOS os atributos style (Google Docs adiciona muitos)
  clean = clean.replace(/\s*style="[^"]*"/gi, '');
  
  // 3. Remove TODAS as classes (incluindo do Google Docs)
  clean = clean.replace(/\s*class="[^"]*"/gi, '');
  
  // 4. Remove outros atributos indesejados
  clean = clean.replace(/\s*dir="[^"]*"/gi, ''); // Direção de texto
  clean = clean.replace(/\s*lang="[^"]*"/gi, ''); // Idioma
  
  // 5. Remove tags <span> (Google Docs usa muito)
  clean = clean.replace(/<span[^>]*>/gi, '').replace(/<\/span>/gi, '');
  
  // 6. Remove tags <font> (se houver)
  clean = clean.replace(/<font[^>]*>/gi, '').replace(/<\/font>/gi, '');
  
  // 7. Normaliza espaços não-quebráveis e múltiplos
  clean = clean.replace(/&nbsp;/g, ' ');
  clean = clean.replace(/\s{2,}/g, ' '); // Múltiplos espaços → 1 espaço
  
  // 8. Remove espaços extras nas tags
  clean = clean.replace(/>\s+</g, '><'); // Remove espaços entre tags
  
  // 9. Limpa parágrafos vazios ou só com espaços
  clean = clean.replace(/<p>\s*<\/p>/gi, '<p><br></p>');
  
  // 10. Remove atributos de tags permitidas, mantendo apenas href em <a>
  clean = clean.replace(/<(p|strong|em|u|ol|ul|li|h1|h2|h3|blockquote|br)([^>]*)>/gi, '<$1>');
  clean = clean.replace(/<a\s+([^>]*?)>/gi, (match, attrs) => {
    const hrefMatch = attrs.match(/href="([^"]*)"/i);
    return hrefMatch ? `<a href="${hrefMatch[1]}">` : '<a>';
  });
  
  return clean.trim();
}
