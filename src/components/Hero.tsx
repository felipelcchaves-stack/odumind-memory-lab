import { Button } from "@/components/ui/button";
import { Sparkles, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLandingTracking } from "@/hooks/useLandingTracking";
import { useFreePlanSettings } from "@/hooks/useFreePlanSettings";
import heroPattern from "@/assets/hero-pattern.jpg";

const Hero = () => {
  const navigate = useNavigate();
  const { trackCTAClick, trackVideoInteraction, trackInitiateCheckout } = useLandingTracking();
  const { isFreePlanEnabled } = useFreePlanSettings();

  const handleCTAClick = () => {
    if (!isFreePlanEnabled) {
      // Scroll to pricing section when free plan is disabled
      trackCTAClick('ver_planos', 'hero');
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    // Track CTA click for free trial
    trackCTAClick('começar_gratis', 'hero');
    trackInitiateCheckout('Gratuito', 0, 'hero');
    navigate('/auth');
  };

  const handleDemoClick = () => {
    trackCTAClick('ver_demonstracao', 'hero');
    navigate('/demonstracao');
  };

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
              O Método que Torna Possível
            </span>{" "}
            Aprender os 256 Odù Ifá
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Você não vai aprender tudo de uma vez. Mas, pela primeira vez, você vai conseguir aprender.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              size="lg"
              variant="hero"
              className="text-lg px-8"
              onClick={handleCTAClick}
            >
              {isFreePlanEnabled ? 'Começar Grátis Agora' : 'Ver Planos'}
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

export default Hero;
