import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const monthlyPlans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    originalPrice: undefined,
    savings: undefined,
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
    icon: undefined,
  },
  {
    name: "Premium",
    price: "R$ 49,90",
    period: "/mês",
    originalPrice: undefined,
    savings: undefined,
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
    stripeId: "price_1SUQd7Do1RHWW8lpaKCqKH8g",
    icon: undefined,
  },
  {
    name: "Profissional",
    price: "R$ 99,90",
    period: "/mês",
    originalPrice: undefined,
    savings: undefined,
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
    stripeId: "price_1SUQe8Do1RHWW8lpTManIdtD",
    icon: undefined,
  },
  {
    name: "Família",
    price: "R$ 129,90",
    period: "/mês",
    originalPrice: undefined,
    savings: undefined,
    description: "Para grupos e terreiros que estudam juntos",
    features: [
      "Até 5 contas Premium",
      "Todos os 256 Odu Ifá (cada conta)",
      "Dashboard compartilhado de progresso",
      "Recursos Premium completos",
      "Perfeito para grupos de estudo",
      "Gestão centralizada",
      "Suporte dedicado",
    ],
    cta: "Começar Família",
    variant: "outline" as const,
    popular: false,
    stripeId: "price_1SVYDfDo1RHWW8lpGhLjNjoV",
    icon: Users,
  },
];

const annualPlans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    originalPrice: undefined,
    savings: undefined,
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
    icon: undefined,
  },
  {
    name: "Premium Anual",
    price: "R$ 499,90",
    period: "/ano",
    originalPrice: "R$ 598,80",
    savings: "Economize R$ 99/ano",
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
      "🎁 1 mês grátis de presente",
    ],
    cta: "Começar Premium Anual",
    variant: "premium" as const,
    popular: true,
    stripeId: "price_1SVYC4Do1RHWW8lprTS45LGC",
    icon: undefined,
  },
  {
    name: "Profissional Anual",
    price: "R$ 999,90",
    period: "/ano",
    originalPrice: "R$ 1.198,80",
    savings: "Economize R$ 199/ano",
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
      "🎁 Sessão de mentoria 1:1 inclusa",
    ],
    cta: "Começar Profissional Anual",
    variant: "hero" as const,
    popular: false,
    stripeId: "price_1SVYDGDo1RHWW8lpDluZOrfK",
    icon: undefined,
  },
  {
    name: "Família",
    price: "R$ 129,90",
    period: "/mês",
    originalPrice: undefined,
    savings: undefined,
    description: "Para grupos e terreiros que estudam juntos",
    features: [
      "Até 5 contas Premium",
      "Todos os 256 Odu Ifá (cada conta)",
      "Dashboard compartilhado de progresso",
      "Recursos Premium completos",
      "Perfeito para grupos de estudo",
      "Gestão centralizada",
      "Suporte dedicado",
    ],
    cta: "Começar Família",
    variant: "outline" as const,
    popular: false,
    stripeId: "price_1SVYDfDo1RHWW8lpGhLjNjoV",
    icon: Users,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const plans = billingCycle === 'monthly' ? monthlyPlans : annualPlans;

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
        <div className="text-center max-w-3xl mx-auto mb-8 space-y-4">
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

        {/* Billing Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Mensal
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              billingCycle === 'annual' ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium transition-colors ${billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Anual
            </span>
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
              Economize 16%
            </Badge>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const PlanIcon = plan.icon;
            return (
              <Card
                key={index}
                className={`relative transition-smooth hover:shadow-medium ${
                  plan.popular
                    ? "border-2 border-primary shadow-medium md:scale-105"
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

                <CardHeader className="text-center pb-6 pt-8">
                  {PlanIcon && (
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                      <PlanIcon className="w-6 h-6 text-accent" />
                    </div>
                  )}
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  
                  {plan.originalPrice && (
                    <div className="text-sm text-muted-foreground line-through mb-1">
                      {plan.originalPrice}
                    </div>
                  )}
                  
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  
                  {plan.savings && (
                    <Badge variant="secondary" className="mt-2 bg-green-500/10 text-green-600 border-green-500/20">
                      {plan.savings}
                    </Badge>
                  )}
                  
                  <p className="text-sm text-muted-foreground mt-4">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="rounded-full p-0.5 bg-primary/10 mt-0.5 flex-shrink-0">
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.variant}
                    size="lg"
                    onClick={() => handleCTAClick(plan.name)}
                  >
                    {plan.cta}
                    {plan.popular && <Sparkles className="ml-2 w-4 h-4" />}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
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
