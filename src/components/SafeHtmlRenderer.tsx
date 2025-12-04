import DOMPurify from 'dompurify';

interface SafeHtmlRendererProps {
  html: string;
  className?: string;
}

// Configuração do DOMPurify para permitir apenas tags seguras
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'sub', 'sup'
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'class', 'id',
  'colspan', 'rowspan', 'style'
];

// Configurar DOMPurify
DOMPurify.setConfig({
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'], // Permitir target em links
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
});

// Hook para adicionar rel="noopener noreferrer" em links externos
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    const href = node.getAttribute('href');
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  }
});

export function SafeHtmlRenderer({ html, className }: SafeHtmlRendererProps) {
  // Proteção contra valores null/undefined
  if (!html) {
    return <div className={className}></div>;
  }

  // Decodifica múltiplas vezes para casos de escape duplo/triplo/quádruplo
  let decoded = html;
  let previousDecoded = '';
  
  // Continua decodificando até não haver mais mudanças (protege contra escape infinito)
  let iterations = 0;
  const maxIterations = 10; // Limite de segurança
  
  while (decoded !== previousDecoded && iterations < maxIterations) {
    previousDecoded = decoded;
    decoded = decoded
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&apos;/g, "'");
    iterations++;
  }
  
  // Detectar se o conteúdo é texto puro (sem tags HTML)
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(decoded);
  
  // Se for texto puro, converter quebras de linha para <br>
  if (!hasHtmlTags) {
    decoded = decoded
      .replace(/\n\n/g, '<br><br>')  // Quebras duplas primeiro
      .replace(/\n/g, '<br>');        // Depois quebras simples
  }
  
  // Sanitizar o HTML para prevenir XSS
  const sanitizedHtml = DOMPurify.sanitize(decoded, {
    USE_PROFILES: { html: true }
  });
  
  return (
    <div
      className={`break-words ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
