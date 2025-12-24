import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Play, Sparkles, Loader2 } from "lucide-react";
import { useLandingTracking } from "@/hooks/useLandingTracking";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { useEffect, useRef } from "react";

interface OluwoExplanationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OluwoExplanationModal = ({ open, onOpenChange }: OluwoExplanationModalProps) => {
  const navigate = useNavigate();
  const { trackCTAClick, trackVideoInteraction } = useLandingTracking();
  const scriptContainerRef = useRef<HTMLDivElement>(null);
  
  const { settings, loading, getSetting } = usePublicSettings([
    'oluwo_video_type',
    'oluwo_video_url',
    'oluwo_video_script'
  ]);

  const videoType = getSetting('oluwo_video_type', 'youtube');
  const videoUrl = getSetting('oluwo_video_url', 'https://www.youtube.com/embed/MKI62vSrTLQ');
  const videoScript = getSetting('oluwo_video_script', '');

  // Handle script-based players (Vturb, etc.)
  useEffect(() => {
    if (!open || videoType !== 'script' || !videoScript || !scriptContainerRef.current) {
      return;
    }

    const container = scriptContainerRef.current;
    container.innerHTML = videoScript;

    // Execute any scripts in the injected HTML
    const scripts = container.querySelectorAll('script');
    scripts.forEach(script => {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = script.textContent;
      }
      document.body.appendChild(newScript);
    });

    return () => {
      // Cleanup scripts when modal closes
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [open, videoType, videoScript]);

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

  const renderVideoPlayer = () => {
    if (loading) {
      return (
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    switch (videoType) {
      case 'youtube':
        return (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <iframe 
              src={videoUrl}
              className="w-full h-full"
              title="Isesemind: Explicação do Oluwo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      
      case 'vturb':
      case 'iframe':
        return (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <iframe 
              src={videoUrl}
              className="w-full h-full"
              title="Isesemind: Explicação do Oluwo"
              allow="accelerometer; autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          </div>
        );
      
      case 'script':
        return (
          <div 
            ref={scriptContainerRef}
            className="aspect-video bg-muted rounded-lg overflow-hidden"
          />
        );
      
      default:
        return (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Play className="w-12 h-12 mx-auto mb-2" />
              <p>Vídeo não configurado</p>
            </div>
          </div>
        );
    }
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
        {renderVideoPlayer()}
        
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
