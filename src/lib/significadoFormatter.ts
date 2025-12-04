/**
 * Formata o campo significado adicionando quebras de linha antes de "Ifá diz"
 * Funciona tanto com texto puro quanto com HTML
 * 
 * Variações suportadas:
 * - "Ifá diz"
 * - "Ifa diz" 
 * - "IFÁ diz"
 * - "IFA diz"
 */
export function formatSignificado(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  
  const trimmed = text.trim();
  if (!trimmed) return null;
  
  // Detecta se é HTML ou texto puro
  const isHtml = /<[^>]+>/.test(trimmed);
  
  // Regex para detectar variações de "Ifá diz" (case insensitive)
  // Captura "Ifá diz", "Ifa diz", "IFÁ diz", "IFA diz"
  const ifaDizPattern = /(Ifá\s+diz|Ifa\s+diz|IFÁ\s+diz|IFA\s+diz)/gi;
  
  let result = trimmed;
  
  if (isHtml) {
    // Para HTML: adiciona <br><br> antes de "Ifá diz" se não houver já
    // Não adiciona se já tiver <br>, <p>, </p> antes
    const htmlBreakPattern = /(?<!<br\s*\/?\>\s*)(?<!<br\s*\/?\>\s*<br\s*\/?\>\s*)(?<!<\/p>\s*)(?<!<p>\s*)(Ifá\s+diz|Ifa\s+diz|IFÁ\s+diz|IFA\s+diz)/gi;
    result = result.replace(htmlBreakPattern, '<br><br>$1');
  } else {
    // Para texto puro: adiciona \n\n antes de "Ifá diz" se não houver já
    // Não adiciona se já tiver quebra de linha antes
    const textBreakPattern = /(?<!\n\n)(?<!\n)(Ifá\s+diz|Ifa\s+diz|IFÁ\s+diz|IFA\s+diz)/gi;
    result = result.replace(textBreakPattern, '\n\n$1');
  }
  
  // Remove quebras duplicadas no início do texto
  result = result.replace(/^(<br\s*\/?\>\s*)+/i, '');
  result = result.replace(/^\n+/, '');
  
  return result.trim();
}

/**
 * Verifica se o texto contém "Ifá diz" sem quebra de linha antes
 * Útil para identificar registros que precisam de formatação
 */
export function needsSignificadoFormatting(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  // Verifica se contém "Ifá diz" sem quebra adequada antes
  const isHtml = /<[^>]+>/.test(trimmed);
  
  if (isHtml) {
    // Para HTML: verifica se há "Ifá diz" sem <br><br> ou </p> antes
    const needsBreak = /(?<!<br\s*\/?\>\s*<br\s*\/?\>\s*)(?<!<\/p>\s*)(Ifá\s+diz|Ifa\s+diz|IFÁ\s+diz|IFA\s+diz)/gi;
    return needsBreak.test(trimmed);
  } else {
    // Para texto puro: verifica se há "Ifá diz" sem \n\n antes
    const needsBreak = /(?<!\n\n)(Ifá\s+diz|Ifa\s+diz|IFÁ\s+diz|IFA\s+diz)/gi;
    return needsBreak.test(trimmed);
  }
}
