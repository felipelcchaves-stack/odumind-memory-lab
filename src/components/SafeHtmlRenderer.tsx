interface SafeHtmlRendererProps {
  html: string;
  className?: string;
}

export function SafeHtmlRenderer({ html, className }: SafeHtmlRendererProps) {
  // Proteção contra valores null/undefined
  if (!html) {
    return <div className={className}></div>;
  }

  // Decodifica HTML entities se necessário
  const decoded = html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' '); // Adiciona espaço não-quebrável
  
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: decoded }}
    />
  );
}
