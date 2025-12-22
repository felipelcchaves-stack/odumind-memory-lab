import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Play, Sparkles } from "lucide-react";
import { useLandingTracking } from "@/hooks/useLandingTracking";

interface OluwoExplanationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OluwoExplanationModal = ({ open, onOpenChange }: OluwoExplanationModalProps) => {
  const navigate = useNavigate();
  const { trackCTAClick, trackVideoInteraction } = useLandingTracking();

  const handleDemoClick = () => {
    trackCTAClick('ver_demonstracao', 'oluwo_modal');
    onOpenChange(false);
    navigate('/demonstracao');
  };

  const handleStartClick = () => {
    trackCTAClick('comecar_agora', 'oluwo_modal');
    onOpenChange(false);
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Isesemind: Explicação do Oluwo
          </DialogTitle>
        </DialogHeader>
        
        {/* Área do vídeo */}
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          <iframe 
            src="https://www.youtube.com/embed/MKI62vSrTLQ"
            className="w-full h-full"
            title="Isesemind: Explicação do Oluwo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        
        {/* Texto de apoio */}
        <div className="space-y-3 text-center">
          <p className="text-muted-foreground">
            Assista ao Oluwo explicar como o método Isesemind funciona e por que ele é 
            diferente de tudo que você já tentou para memorizar os 256 Odù Ifá.
          </p>
          <p className="text-sm text-muted-foreground/80">
            Descubra como nossa tecnologia de repetição espaçada, combinada com técnicas 
            milenares de memorização, pode transformar seu aprendizado.
          </p>
        </div>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleDemoClick}
          >
            <Play className="w-4 h-4" />
            Ver Demonstração
          </Button>
          <Button 
            variant="hero" 
            onClick={handleStartClick}
          >
            Começar Agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
