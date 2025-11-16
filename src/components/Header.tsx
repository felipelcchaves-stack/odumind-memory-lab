import { Button } from "@/components/ui/button";
import { BookOpen, Menu } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">Odùmind</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-smooth">
              Funcionalidades
            </a>
            <a href="#learning" className="text-sm font-medium hover:text-primary transition-smooth">
              Aprendizado
            </a>
            <a href="#pricing" className="text-sm font-medium hover:text-primary transition-smooth">
              Planos
            </a>
            <a href="#community" className="text-sm font-medium hover:text-primary transition-smooth">
              Comunidade
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
            <Button variant="hero" size="sm">
              Começar Grátis
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
              <a href="#features" className="text-sm font-medium hover:text-primary transition-smooth">
                Funcionalidades
              </a>
              <a href="#learning" className="text-sm font-medium hover:text-primary transition-smooth">
                Aprendizado
              </a>
              <a href="#pricing" className="text-sm font-medium hover:text-primary transition-smooth">
                Planos
              </a>
              <a href="#community" className="text-sm font-medium hover:text-primary transition-smooth">
                Comunidade
              </a>
              <div className="flex flex-col gap-2 pt-4">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
                <Button variant="hero" size="sm">
                  Começar Grátis
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
