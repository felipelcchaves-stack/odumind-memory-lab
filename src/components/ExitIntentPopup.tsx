import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, X } from "lucide-react";
import { toast } from "sonner";

export const ExitIntentPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if popup was already shown in this session
    const popupShown = sessionStorage.getItem('exitIntentShown');
    if (popupShown) {
      setHasShown(true);
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse is leaving from the top and popup hasn't been shown
      if (e.clientY <= 0 && !hasShown && !isOpen) {
        setIsOpen(true);
        setHasShown(true);
        sessionStorage.setItem('exitIntentShown', 'true');
      }
    };

    // Add event listener after 3 seconds to avoid immediate trigger
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 3000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Digite seu email');
      return;
    }

    // Here you would typically send to your email service
    console.log('Exit intent email captured:', email);
    toast.success('Desconto enviado para seu email!');
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>

        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Espera! 🎁
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Antes de ir, que tal <strong className="text-foreground">20% de desconto</strong> no seu primeiro mês?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Seu melhor email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-center"
            />
          </div>

          <Button type="submit" className="w-full" size="lg" variant="hero">
            Quero Meu Desconto de 20%
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Enviaremos o cupom de desconto direto no seu email
          </p>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Não, obrigado
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
