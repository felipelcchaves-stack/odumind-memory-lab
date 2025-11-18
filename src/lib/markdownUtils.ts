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
 */
export function sanitizeQuillHtml(html: string): string {
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'h1', 'h2', 'h3', 'blockquote'];
  
  // Remove todas as tags não permitidas
  let clean = html;
  
  // Remove estilos inline
  clean = clean.replace(/style="[^"]*"/g, '');
  
  // Remove classes do Google Docs
  clean = clean.replace(/class="[^"]*"/g, '');
  
  // Remove IDs do Google Docs
  clean = clean.replace(/id="docs-internal-guid-[^"]*"/g, '');
  
  // Remove tags span vazias
  clean = clean.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '');
  
  // Normaliza espaços múltiplos
  clean = clean.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  
  return clean;
}
