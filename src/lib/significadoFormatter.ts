/**
 * Formata o campo significado adicionando quebras de linha antes de "Ifá diz"
 * Funciona tanto com texto puro quanto com HTML
 * 
 * Variações suportadas:
 * - "Ifá diz"
 * - "Ifa diz" 
 * - "IFÁ diz"
 * - "IFA diz"
 * 
 * Garante que sempre haja DUAS quebras de linha antes de "Ifá diz":
 * - Se não houver quebra: adiciona \n\n
 * - Se houver apenas uma quebra (\n): converte para \n\n
 * - Se já houver duas quebras (\n\n): mantém como está
 */
export function formatSignificado(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  
  const trimmed = text.trim();
  if (!trimmed) return null;
  
  // Detecta se é HTML ou texto puro
  const isHtml = /<[^>]+>/.test(trimmed);
  
  // Padrão para detectar variações de "Ifá diz" (case insensitive)
  const ifaDizVariants = '(Ifá\\s+diz|Ifa\\s+diz|IFÁ\\s+diz|IFA\\s+diz)';
  
  let result = trimmed;
  
  if (isHtml) {
    // Para HTML: garantir <br><br> antes de "Ifá diz"
    
    // ETAPA 1: Normalizar - converter qualquer combinação de <br> antes de "Ifá diz" para marcador
    // Isso captura: <br>Ifá, <br><br>Ifá, <br/><br/>Ifá, etc.
    result = result.replace(
      new RegExp(`(<br\\s*\\/?>\\s*)+${ifaDizVariants}`, 'gi'),
      '{{BREAK_MARKER}}$1'
    );
    
    // ETAPA 2: Adicionar marcador onde não há nenhuma quebra antes de "Ifá diz"
    result = result.replace(
      new RegExp(`(?<!>)(?<!{{BREAK_MARKER}})${ifaDizVariants}`, 'gi'),
      '{{BREAK_MARKER}}$1'
    );
    
    // ETAPA 3: Substituir todos os marcadores por <br><br>
    result = result.replace(/{{BREAK_MARKER}}/g, '<br><br>');
    
  } else {
    // Para texto puro: garantir \n\n antes de "Ifá diz"
    
    // ETAPA 1: Normalizar - converter qualquer quantidade de \n antes de "Ifá diz" para marcador
    // Isso captura: \nIfá, \n\nIfá, \n\n\nIfá, etc.
    result = result.replace(
      new RegExp(`\\n+${ifaDizVariants}`, 'gi'),
      '{{BREAK_MARKER}}$1'
    );
    
    // ETAPA 2: Adicionar marcador onde não há nenhuma quebra antes de "Ifá diz"
    // (exceto no início do texto ou após marcador já colocado)
    result = result.replace(
      new RegExp(`(?<!\\n)(?<!{{BREAK_MARKER}})${ifaDizVariants}`, 'gi'),
      '{{BREAK_MARKER}}$1'
    );
    
    // ETAPA 3: Substituir todos os marcadores por \n\n
    result = result.replace(/{{BREAK_MARKER}}/g, '\n\n');
  }
  
  // Limpar quebras duplicadas no início do texto
  result = result.replace(/^(<br\s*\/?\>\s*)+/i, '');
  result = result.replace(/^\n+/, '');
  
  return result.trim();
}

/**
 * Verifica se o texto contém "Ifá diz" sem quebra de linha dupla antes
 * Útil para identificar registros que precisam de formatação
 */
export function needsSignificadoFormatting(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  const ifaDizVariants = '(Ifá\\s+diz|Ifa\\s+diz|IFÁ\\s+diz|IFA\\s+diz)';
  
  // Verifica se contém "Ifá diz" sem quebra dupla adequada antes
  const isHtml = /<[^>]+>/.test(trimmed);
  
  if (isHtml) {
    // Para HTML: verifica se há "Ifá diz" sem <br><br> antes
    // Captura casos com apenas um <br> ou nenhum
    const singleBreakPattern = new RegExp(`(?<!<br\\s*\\/?>\\s*<br\\s*\\/?>\\s*)${ifaDizVariants}`, 'gi');
    return singleBreakPattern.test(trimmed);
  } else {
    // Para texto puro: verifica se há "Ifá diz" sem \n\n antes
    // Captura casos com apenas um \n ou nenhum
    const singleBreakPattern = new RegExp(`(?<!\\n\\n)${ifaDizVariants}`, 'gi');
    return singleBreakPattern.test(trimmed);
  }
}
