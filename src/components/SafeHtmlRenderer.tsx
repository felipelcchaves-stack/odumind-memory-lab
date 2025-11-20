interface SafeHtmlRendererProps {
  html: string;
  className?: string;
}

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
  
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: decoded }}
    />
  );
}
