import { Button } from "@/components/ui/button";
import { BookOpen, Brain, Sparkles } from "lucide-react";
import heroPattern from "@/assets/hero-pattern.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
            Domine os{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Odu Ifá
            </span>
            {" "}com Ciência
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Sistema educacional completo que combina sabedoria ancestral com técnicas científicas de memorização: repetição espaçada, storytelling e gamificação.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-soft">
              <Brain className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Mapas Mentais</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-soft">
              <BookOpen className="w-5 h-5 text-secondary" />
              <span className="text-sm font-medium">Flashcards Interativos</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-soft">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium">Gamificação</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button size="lg" variant="hero" className="text-lg">
              Começar Gratuitamente
            </Button>
            <Button size="lg" variant="outline" className="text-lg">
              Ver Planos Premium
            </Button>
          </div>

          {/* Social Proof */}
          <p className="text-sm text-muted-foreground pt-4">
            Junte-se a milhares de estudantes e mestres de Ifá
          </p>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
    </section>
  );
};

export default Hero;
