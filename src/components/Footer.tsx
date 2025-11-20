import { BookOpen, Mail, Twitter, Instagram, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">Isesemind</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Memorização científica dos Odu Ifá através de repetição espaçada, storytelling e gamificação.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Produto</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-smooth">Funcionalidades</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-smooth">Planos</a></li>
              <li><a href="/auth" className="hover:text-primary transition-smooth">Começar Agora</a></li>
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <h3 className="font-semibold mb-4">Recursos</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#learning" className="hover:text-primary transition-smooth">Como Funciona</a></li>
              <li><a href="#faq" className="hover:text-primary transition-smooth">Perguntas Frequentes</a></li>
              <li><a href="mailto:contato@isesemind.com" className="hover:text-primary transition-smooth">Contato</a></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold mb-4">Conecte-se</h3>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-smooth"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-smooth"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-smooth"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-smooth"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              contato@isesemind.com
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-12 pt-6 space-y-4">
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-4 pb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border text-xs">
              🔒 Pagamento Seguro (SSL)
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border text-xs">
              ✅ 7 Dias de Garantia
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border text-xs">
              ⭐ 98% de Satisfação
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2024 Isesemind. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-primary transition-smooth">Termos de Uso</a>
              <a href="#" className="hover:text-primary transition-smooth">Privacidade</a>
              <a href="#" className="hover:text-primary transition-smooth">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
