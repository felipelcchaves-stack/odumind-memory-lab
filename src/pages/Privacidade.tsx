import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MarkdownViewer } from '@/components/MarkdownViewer';
// Só o texto público (sem as notas internas de lojas/POLITICA-DE-PRIVACIDADE.md). Um teste garante que os dois são iguais.
import politica from '../content/politica-de-privacidade.md?raw';

/** Página pública /privacidade (exigida pela Apple e pelo Google). Funciona sem login, no site e no app. */
export default function Privacidade() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background px-4 py-8 pt-[calc(env(safe-area-inset-top)+2rem)]">
      <div className="mx-auto max-w-3xl">
        <MarkdownViewer content={politica} />
        <Button variant="outline" className="mt-8 min-h-11" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
