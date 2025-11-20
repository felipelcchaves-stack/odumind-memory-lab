import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function FloatingHelp() {
  const handleClick = () => {
    toast.info('💡 Dica: Procure pelos ícones ? ao redor da tela para obter ajuda contextual!', {
      duration: 5000,
    });
  };

  return (
    <Button
      className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50 hover:scale-110 transition-transform"
      variant="default"
      size="icon"
      onClick={handleClick}
      aria-label="Ajuda"
    >
      <HelpCircle className="h-6 w-6" />
    </Button>
  );
}
