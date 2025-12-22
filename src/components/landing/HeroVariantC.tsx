import { Button } from "@/components/ui/button";
import { Target, Mountain, Award, Play } from "lucide-react";
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
 * Variante C - Desafio/Superação
 * Foco em compromisso, maestria e superação pessoal
 */
const HeroVariantC = ({ 
  headline = "O Caminho dos 256 Odu Começa com o Primeiro Passo",
  subheadline = "Um sistema estruturado para quem leva a sério o estudo do Ifá e busca maestria verdadeira",
  ctaText,
  onCTAClick 
}: HeroVariantProps) => {
  const navigate = useNavigate();
  const { trackCTAClick, trackVideoInteraction, trackInitiateCheckout } = useLandingTracking();
  const { isFreePlanEnabled } = useFreePlanSettings();

  const handleCTAClick = () => {
    onCTAClick?.();
    
    if (!isFreePlanEnabled) {
      trackCTAClick('ver_planos', 'hero_variant_c');
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    trackCTAClick('aceitar_desafio', 'hero_variant_c');
    trackInitiateCheckout('Gratuito', 0, 'hero_variant_c');
    navigate('/auth');
  };

  const handleDemoClick = () => {
    trackCTAClick('ver_demonstracao', 'hero_variant_c');
    navigate('/demonstracao');
  };

  const finalCtaText = ctaText || (isFreePlanEnabled ? 'Aceitar o Desafio' : 'Ver Planos');

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

      {/* Gradient Overlay - More intense for challenge feel */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-background via-background/90 to-primary/15" />

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          {/* Badge - Challenge focused */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Compromisso com a Maestria</span>
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

          {/* Challenge elements */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
              <Mountain className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">256 Odu</span>
              <span className="text-xs text-muted-foreground">Um desafio real</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
              <Target className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">Sistema Estruturado</span>
              <span className="text-xs text-muted-foreground">Passo a passo</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
              <Award className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">Maestria Verdadeira</span>
              <span className="text-xs text-muted-foreground">Sem atalhos</span>
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

          {/* Motivational quote */}
          <blockquote className="text-sm italic text-muted-foreground/80 max-w-lg mx-auto border-l-2 border-primary/30 pl-4 text-left">
            "A jornada de mil passos começa com o primeiro. O Ifá não é para os apressados, é para os dedicados."
          </blockquote>
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

export default HeroVariantC;
