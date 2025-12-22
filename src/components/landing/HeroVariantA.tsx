import { Button } from "@/components/ui/button";
import { Sparkles, Play } from "lucide-react";
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
 * Variante A - Emocional/Transformação
 * Foco em transformação pessoal e jornada de aprendizado
 */
const HeroVariantA = ({ 
  headline = "O Método que Torna Possível Aprender os 256 Odù Ifá",
  subheadline = "Um sistema inteligente de memorização que respeita seu ritmo e transforma seu aprendizado",
  ctaText,
  onCTAClick 
}: HeroVariantProps) => {
  const navigate = useNavigate();
  const { trackCTAClick, trackVideoInteraction, trackInitiateCheckout } = useLandingTracking();
  const { isFreePlanEnabled } = useFreePlanSettings();

  const handleCTAClick = () => {
    onCTAClick?.();
    
    if (!isFreePlanEnabled) {
      trackCTAClick('ver_planos', 'hero_variant_a');
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    trackCTAClick('começar_gratis', 'hero_variant_a');
    trackInitiateCheckout('Gratuito', 0, 'hero_variant_a');
    navigate('/auth');
  };

  const handleDemoClick = () => {
    trackCTAClick('ver_demonstracao', 'hero_variant_a');
    navigate('/demonstracao');
  };

  const finalCtaText = ctaText || (isFreePlanEnabled ? 'Começar Minha Jornada' : 'Ver Planos');

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

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-background via-background/95 to-primary/5" />

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Método de Memorização Avançada</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            IseseMind —{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              {headline}
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            {subheadline}
          </p>

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

export default HeroVariantA;
