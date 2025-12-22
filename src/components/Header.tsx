import { Button } from "@/components/ui/button";
import { BookOpen, Menu } from "lucide-react";
import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useFreePlanSettings } from "@/hooks/useFreePlanSettings";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isFreePlanEnabled } = useFreePlanSettings();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    
    if (element) {
      // Se estamos na página que tem o elemento, faz scroll
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Se não existe, navega para Home com hash
      navigate(`/#${sectionId}`);
    }
    
    setIsMenuOpen(false);
  };

  const handleCtaClick = () => {
    if (isFreePlanEnabled) {
      navigate('/auth');
    } else {
      const pricingElement = document.getElementById('pricing');
      if (pricingElement) {
        pricingElement.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/#pricing');
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Clicável para Home */}
          <Link to="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">Isesemind</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('features')} className="text-sm font-medium hover:text-primary transition-smooth">
              Funcionalidades
            </button>
            <Link to="/demonstracao" className="text-sm font-medium hover:text-primary transition-smooth">
              Demonstração
            </Link>
            <Link to="/biblioteca-yoruba" className="text-sm font-medium hover:text-primary transition-smooth">
              Biblioteca
            </Link>
            <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium hover:text-primary transition-smooth">
              Planos
            </button>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
              Entrar
            </Button>
            <Button variant="hero" size="sm" onClick={handleCtaClick}>
              {isFreePlanEnabled ? 'Começar Grátis' : 'Ver Planos'}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <button onClick={() => scrollToSection('features')} className="text-sm font-medium hover:text-primary transition-smooth text-left">
                Funcionalidades
              </button>
              <Link to="/demonstracao" className="text-sm font-medium hover:text-primary transition-smooth">
                Demonstração
              </Link>
              <Link to="/biblioteca-yoruba" className="text-sm font-medium hover:text-primary transition-smooth">
                Biblioteca
              </Link>
              <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium hover:text-primary transition-smooth text-left">
                Planos
              </button>
              <div className="flex flex-col gap-2 pt-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                  Entrar
                </Button>
                <Button variant="hero" size="sm" onClick={handleCtaClick}>
                  {isFreePlanEnabled ? 'Começar Grátis' : 'Ver Planos'}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
