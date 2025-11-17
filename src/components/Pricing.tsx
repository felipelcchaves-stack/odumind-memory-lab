import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const plans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    description: "Perfeito para iniciantes explorarem o método",
    features: [
      "5 Odu Ifá desbloqueados",
      "Flashcards básicos",
      "Mapas mentais simples",
      "Comunidade de estudantes",
      "Progresso básico",
    ],
    cta: "Começar Agora",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Premium",
    price: "R$ 49,90",
    period: "/mês",
    description: "Para estudantes sérios e comprometidos",
    features: [
      "Todos os 256 Odu Ifá",
      "Flashcards avançados com IA",
      "Mapas mentais interativos",
      "Repetição espaçada personalizada",
      "Acesso à comunidade premium",
      "Storytelling completo",
      "Testes e simulados ilimitados",
      "Feedback personalizado detalhado",
      "Certificados de conclusão",
      "Suporte prioritário",
    ],
    cta: "Começar Premium",
    variant: "premium" as const,
    popular: true,
  },
  {
    name: "Profissional",
    price: "R$ 99,90",
    period: "/mês",
    description: "Para mestres e professores de Ifá",
    features: [
      "Tudo do Premium",
      "Criar flashcards personalizados",
      "Módulos exclusivos para ensino",
      "Análises avançadas de progresso",
      "Mentoria em grupo mensal",
      "Materiais para impressão profissional",
      "Acesso antecipado a novos conteúdos",
      "Badge de mestre verificado",
    ],
    cta: "Começar Profissional",
    variant: "hero" as const,
    popular: false,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTAClick = (planName: string) => {
    if (user) {
      navigate('/subscription');
    } else {
      navigate('/auth');
    }
  };

  return (
    <section className="py-24 px-4 bg-background">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Escolha seu{" "}
            <span className="bg-gradient-secondary bg-clip-text text-transparent">
              Caminho de Aprendizado
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Planos flexíveis para todos os níveis de estudo, do iniciante ao mestre
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative transition-smooth hover:shadow-medium ${
                plan.popular
                  ? "border-2 border-primary shadow-medium scale-105"
                  : "border-2 hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-secondary text-sm font-semibold shadow-soft">
                    <Crown className="w-4 h-4" />
                    Mais Popular
                  </div>
                </div>
              )}

              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <Button
                  className="w-full"
                  size="lg"
                  variant={plan.variant}
                  onClick={() => handleCTAClick(plan.name)}
                >
                  {plan.cta}
                </Button>

                <div className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-muted border border-border">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">
              Todos os planos incluem 7 dias de garantia de satisfação
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
