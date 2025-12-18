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
import { useLandingTracking } from "@/hooks/useLandingTracking";
import { useExitPopupSettings } from "@/hooks/useExitPopupSettings";

export const ExitIntentPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [hasShown, setHasShown] = useState(false);
  const { trackPopupView, trackPopupClose, trackLeadCapture, trackCTAClick } = useLandingTracking();
  const { settings, loading, formattedDescription, formattedButtonText } = useExitPopupSettings();

  useEffect(() => {
    // Não configurar listener se desabilitado ou carregando
    if (loading || !settings.enabled) return;

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
        // Track popup view
        trackPopupView('exit_intent_discount');
      }
    };

    // Add event listener after configured delay
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, settings.delaySeconds * 1000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown, isOpen, trackPopupView, loading, settings.enabled, settings.delaySeconds]);

  // Não renderizar nada se desabilitado ou carregando
  if (loading || !settings.enabled) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Digite seu email');
      return;
    }

    // Track lead capture
    trackLeadCapture('exit_intent_popup', true);
    trackCTAClick('quero_desconto', 'exit_intent_popup');

    // Here you would typically send to your email service
    console.log('Exit intent email captured:', email);
    toast.success('Desconto enviado para seu email!');
    setIsOpen(false);
  };

  const handleClose = () => {
    // Track popup close without action
    trackPopupClose('exit_intent_discount', false);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Track popup close if closing
      trackPopupClose('exit_intent_discount', false);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
            {settings.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            <span dangerouslySetInnerHTML={{ 
              __html: formattedDescription.replace(
                /\*\*(.*?)\*\*/g, 
                '<strong class="text-foreground">$1</strong>'
              ) 
            }} />
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
            {formattedButtonText}
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
