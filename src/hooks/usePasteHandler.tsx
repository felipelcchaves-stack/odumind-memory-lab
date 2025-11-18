import { useCallback } from 'react';
import { extractClipboardContent } from '@/lib/markdownUtils';

interface UsePasteHandlerOptions {
  onPaste: (text: string) => void;
  maxLength?: number;
}

/**
 * Hook para interceptar colagem e converter HTML → Markdown
 */
export function usePasteHandler({ onPaste, maxLength }: UsePasteHandlerOptions) {
  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      
      const markdownText = extractClipboardContent(event.nativeEvent);
      
      // Aplica limite de caracteres se especificado
      const finalText = maxLength
        ? markdownText.substring(0, maxLength)
        : markdownText;
      
      onPaste(finalText);
    },
    [onPaste, maxLength]
  );

  return { handlePaste };
}
