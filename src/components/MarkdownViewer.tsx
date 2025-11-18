import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/utils';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

/**
 * Renderiza Markdown de forma segura
 * Suporta: negrito, itálico, listas, links, parágrafos
 */
export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // Links externos com segurança
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            />
          ),
          // Estilização de listas
          ul: ({ node, ...props }) => (
            <ul {...props} className="list-disc list-inside space-y-1" />
          ),
          ol: ({ node, ...props }) => (
            <ol {...props} className="list-decimal list-inside space-y-1" />
          ),
          // Parágrafos com espaçamento
          p: ({ node, ...props }) => (
            <p {...props} className="mb-2 last:mb-0" />
          ),
          // Código inline
          code: ({ node, ...props }) => (
            <code
              {...props}
              className="bg-muted px-1 py-0.5 rounded text-sm font-mono"
            />
          ),
          // Negrito
          strong: ({ node, ...props }) => (
            <strong {...props} className="font-semibold" />
          ),
          // Itálico
          em: ({ node, ...props }) => (
            <em {...props} className="italic" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
