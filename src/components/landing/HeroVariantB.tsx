import { Button } from "@/components/ui/button";
import { Brain, BookOpen, Zap, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLandingTracking } from "@/hooks/useLandingTracking";
import { useFreePlanSettings } from "@/hooks/useFreePlanSettings";
import heroPattern from "@/assets/hero-pattern.jpg";

interface HeroVariantProps {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  onCTAClick?: () => void;
}

/**
 * Variante B - Ciência + Tradição
 * Foco em técnicas comprovadas pela neurociência aplicadas ao conhecimento ancestral
 */
const HeroVariantB = ({ 
  headline = "Memorize os 256 Odu Ifá com Ciência e Respeito à Tradição",
  subheadline = "Técnicas de memorização comprovadas pela neurociência aplicadas ao conhecimento ancestral Yorubá",
  ctaText,
  onCTAClick 
}: HeroVariantProps) => {
  const navigate = useNavigate();
  const { trackCTAClick, trackVideoInteraction, trackInitiateCheckout } = useLandingTracking();
  const { isFreePlanEnabled } = useFreePlanSettings();

  const handleCTAClick = () => {
    onCTAClick?.();
    
    if (!isFreePlanEnabled) {
      trackCTAClick('ver_planos', 'hero_variant_b');
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    trackCTAClick('conhecer_metodo', 'hero_variant_b');
    trackInitiateCheckout('Gratuito', 0, 'hero_variant_b');
    navigate('/auth');
  };

  const handleDemoClick = () => {
    trackCTAClick('ver_demonstracao', 'hero_variant_b');
    navigate('/demonstracao');
  };

  const finalCtaText = ctaText || (isFreePlanEnabled ? 'Conhecer o Método' : 'Ver Planos');

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `url(${heroPattern})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Gradient Overlay - Slightly different gradient for distinction */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-background via-background/95 to-primary/10" />

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          {/* Badge - Science focused */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Neurociência + Tradição Yorubá</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              {headline}
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            {subheadline}
          </p>

          {/* Trust elements - Science based */}
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Brain className="w-5 h-5 text-primary" />
              <span className="text-sm">Repetição Espaçada</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm">Recall Ativo</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="text-sm">Flashcards Inteligentes</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              size="lg"
              variant="hero"
              className="text-lg px-8"
              onClick={handleCTAClick}
            >
              {finalCtaText}
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 gap-2"
              onClick={handleDemoClick}
            >
              <Play className="w-5 h-5" />
              Ver Demonstração Grátis
            </Button>
          </div>

          {/* Trust statement */}
          <p className="text-sm text-muted-foreground/80 max-w-xl mx-auto">
            Baseado nas mesmas técnicas de memorização usadas por poliglotas, médicos e estudantes de alto desempenho
          </p>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-20 right-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '1s' }}
      />
    </section>
  );
};

export default HeroVariantB;
