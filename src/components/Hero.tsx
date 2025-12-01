import { Button } from "@/components/ui/button";
import { BookOpen, Brain, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroPattern from "@/assets/hero-pattern.jpg";
const Hero = () => {
  const navigate = useNavigate();
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-10" style={{
      backgroundImage: `url(${heroPattern})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }} />
      
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
              256 Odu, Rituais & Rezas
            </span>
            {" "}em 14 Dias
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">Plataforma completa de memorização Yorubá. Método aprovado por +2.500 Babalawo, Iyanifa, Awo e estudantes.</p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-soft">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">256 Odu Ifá</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-soft">
              <Brain className="w-5 h-5 text-secondary" />
              <span className="text-sm font-medium">50+ Rituais</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-soft">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium">Rezas & Invocações</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button size="lg" variant="hero" className="text-lg px-8" onClick={() => navigate('/auth')}>
              Começar Grátis Agora
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              <a href="#demo" className="flex items-center gap-2">
                Ver Vídeo Demo
              </a>
            </Button>
          </div>

          {/* Video Demo Section */}
          <div className="mt-12 max-w-3xl mx-auto">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              ▶️ Veja como funciona em 60 segundos:
            </p>
            <div className="aspect-video bg-muted rounded-xl flex items-center justify-center border-2 border-border hover:border-primary transition-colors cursor-pointer group">
              <div className="text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
                  <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">Clique para assistir a demonstração</p>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <p className="text-sm text-muted-foreground pt-8">
            Junte-se a milhares de estudantes e mestres de Ifá
          </p>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl animate-float" style={{
      animationDelay: '1s'
    }} />
    </section>;
};
export default Hero;