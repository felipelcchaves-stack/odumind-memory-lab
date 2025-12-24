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
    const injectedScripts: HTMLScriptElement[] = [];
    
    console.info('[Vturb Debug] Iniciando carregamento do player', { 
      videoType, 
      scriptLength: videoScript.length 
    });
    
    // Criar um elemento temporário para parsear o HTML
    const temp = document.createElement('div');
    temp.innerHTML = videoScript;
    
    // Separar elementos HTML dos scripts
    const scripts = temp.querySelectorAll('script');
    console.info('[Vturb Debug] Scripts encontrados:', scripts.length);
    
    // Remover scripts do temp para adicionar apenas HTML ao container
    scripts.forEach(script => script.remove());
    
    // Primeiro: inserir apenas o HTML (vturb-smartplayer element, etc)
    container.innerHTML = temp.innerHTML;
    
    // Forçar estilos no player element para garantir visibilidade
    const playerEl = container.querySelector('vturb-smartplayer, div[id*="smartplayer"], div[class*="smartplayer"]');
    if (playerEl) {
      console.info('[Vturb Debug] Player element encontrado:', playerEl.tagName);
      (playerEl as HTMLElement).style.cssText = 'display: block !important; width: 100% !important; height: 100% !important; min-height: 200px !important;';
    } else {
      console.info('[Vturb Debug] Nenhum player element encontrado no HTML inicial');
    }
    
    // Depois: executar scripts (com pequeno delay para garantir que o DOM está pronto)
    const timeoutId = setTimeout(() => {
      scripts.forEach((originalScript, index) => {
        const newScript = document.createElement('script');
        
        // Marcar como nosso para cleanup
        newScript.setAttribute('data-oluwo-injected', 'true');
        
        // Copiar todos os atributos
        Array.from(originalScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        
        // Se for inline (sem src), copiar o conteúdo
        if (!originalScript.src && originalScript.textContent) {
          newScript.textContent = originalScript.textContent;
          console.info('[Vturb Debug] Script inline injetado:', index);
        } else if (originalScript.src) {
          console.info('[Vturb Debug] Script externo:', originalScript.src);
          newScript.onload = () => console.info('[Vturb Debug] Script carregado:', originalScript.src);
          newScript.onerror = (e) => console.error('[Vturb Debug] Erro ao carregar script:', originalScript.src, e);
        }
        
        // Adicionar ao body (alguns players preferem body ao head)
        document.body.appendChild(newScript);
        injectedScripts.push(newScript);
      });
      
      // Verificar após delay se o player foi renderizado
      setTimeout(() => {
        const playerCheck = container.querySelector('vturb-smartplayer, div[id*="smartplayer"], iframe, video');
        console.info('[Vturb Debug] Verificação após 1s:', playerCheck ? 'Player encontrado' : 'Player não encontrado');
        console.info('[Vturb Debug] Container innerHTML length:', container.innerHTML.length);
        
        // Tentar forçar estilos novamente após scripts carregarem
        const allPlayerEls = container.querySelectorAll('vturb-smartplayer, div[id*="smartplayer"], div[class*="smartplayer"], iframe');
        allPlayerEls.forEach(el => {
          (el as HTMLElement).style.cssText = 'display: block !important; width: 100% !important; height: 100% !important; min-height: 300px !important; position: relative !important;';
        });
      }, 1000);
    }, 150);

    return () => {
      // Cleanup quando modal fecha
      clearTimeout(timeoutId);
      container.innerHTML = '';
      
      // Remover apenas scripts que nós injetamos
      injectedScripts.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
      
      // Remover scripts com nosso marcador
      document.querySelectorAll('script[data-oluwo-injected="true"]').forEach(s => s.remove());
      
      // Remover scripts do Vturb/Panda que podem ter sido criados dinamicamente
      document.querySelectorAll('script[src*="converteai.net"], script[src*="panda"]').forEach(s => s.remove());
      
      console.info('[Vturb Debug] Cleanup realizado');
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
            className="aspect-video bg-muted rounded-lg overflow-hidden relative"
            style={{ minHeight: '300px' }}
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
