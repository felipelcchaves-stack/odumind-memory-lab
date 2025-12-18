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
import { Gift, X, Loader2, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { useLandingTracking } from "@/hooks/useLandingTracking";
import { useExitPopupSettings } from "@/hooks/useExitPopupSettings";
import { supabase } from "@/integrations/supabase/client";

export const ExitIntentPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [hasShown, setHasShown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponValidUntil, setCouponValidUntil] = useState<string | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Digite seu email');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call edge function to generate coupon
      const { data, error } = await supabase.functions.invoke('generate-exit-popup-coupon', {
        body: { email, source: 'exit_popup' }
      });

      if (error) throw error;

      if (data?.code) {
        setCouponCode(data.code);
        setCouponValidUntil(data.validUntil);
        
        // Track lead capture
        trackLeadCapture('exit_intent_popup', true);
        trackCTAClick('quero_desconto', 'exit_intent_popup');
        
        toast.success('Cupom gerado com sucesso! Verifique seu email.');
      } else {
        throw new Error('Erro ao gerar cupom');
      }
    } catch (error: any) {
      console.error('Error generating coupon:', error);
      toast.error(error.message || 'Erro ao gerar cupom. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (couponCode) {
      navigator.clipboard.writeText(couponCode);
      toast.success('Código copiado!');
    }
  };

  const handleClose = () => {
    // Track popup close without action
    trackPopupClose('exit_intent_discount', !!couponCode);
    setIsOpen(false);
    // Reset states when closing
    setCouponCode(null);
    setEmail("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Track popup close if closing
      trackPopupClose('exit_intent_discount', !!couponCode);
      setCouponCode(null);
      setEmail("");
    }
    setIsOpen(open);
  };

  const formatValidUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
    });
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
              {couponCode ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <Gift className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            {couponCode ? '🎉 Cupom Gerado!' : settings.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {couponCode ? (
              'Use o código abaixo na hora de assinar para garantir seu desconto!'
            ) : (
              <span dangerouslySetInnerHTML={{ 
                __html: formattedDescription.replace(
                  /\*\*(.*?)\*\*/g, 
                  '<strong class="text-foreground">$1</strong>'
                ) 
              }} />
            )}
          </DialogDescription>
        </DialogHeader>

        {couponCode ? (
          <div className="space-y-4 mt-4">
            {/* Coupon Code Display */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-2 border-dashed border-amber-500 rounded-xl p-6 text-center">
              <p className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                Seu código de desconto
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-bold text-amber-800 dark:text-amber-300 tracking-widest">
                  {couponCode}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyCode}
                  className="h-8 w-8 text-amber-700 hover:text-amber-900 dark:text-amber-400"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {couponValidUntil && (
              <p className="text-sm text-center text-muted-foreground">
                ⏰ Válido até: <strong>{formatValidUntil(couponValidUntil)}</strong>
              </p>
            )}

            <Button 
              onClick={() => window.location.href = '/auth?tab=signup'} 
              className="w-full" 
              size="lg" 
              variant="hero"
            >
              Criar Minha Conta Agora
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Também enviamos o cupom para seu email 📧
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Seu melhor email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-center"
                disabled={isSubmitting}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              variant="hero"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando cupom...
                </>
              ) : (
                formattedButtonText
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Enviaremos o cupom de desconto direto no seu email
            </p>
          </form>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={handleClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {couponCode ? 'Fechar' : 'Não, obrigado'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
