import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useGuruCheckout } from "@/hooks/useGuruCheckout";
import { useLandingTracking } from "@/hooks/useLandingTracking";
import { usePlanVisibility } from "@/hooks/usePlanVisibility";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuruEnabled, openGuruCheckout, loading: guruLoading } = useGuruCheckout();
  const { trackCTAClick, trackInitiateCheckout, trackAddToCart } = useLandingTracking();
  const { visiblePlans, loading: plansLoading } = usePlanVisibility();

  // Dados específicos para a landing page (preços podem variar por promoção)
  const landingPlanData: Record<string, { price: string; priceValue: number; period: string; description: string; features: string[]; stripeId?: string; icon?: typeof Users }> = {
    gratuito: {
      price: "R$ 0",
      priceValue: 0,
      period: "/7 dias",
      description: "Experimente tudo por 7 dias, sem compromisso",
      features: [
        "Todos os 256 Odu Ifá por 7 dias",
        "Flashcards completos",
        "Repetição espaçada",
        "Progresso detalhado",
        "Após 7 dias, upgrade necessário",
      ],
    },
    awo: {
      price: "R$ 97,00",
      priceValue: 97.00,
      period: "/mês",
      description: "O plano ideal para dominar os 256 Odu",
      features: [
        "Todos os 256 Odu Ifá",
        "Flashcards avançados com IA",
        "Mapas mentais interativos",
        "Repetição espaçada personalizada",
        "Storytelling completo",
        "Testes e simulados ilimitados",
        "Suporte prioritário",
      ],
      stripeId: "price_1SUQe8Do1RHWW8lpTManIdtD",
    },
    egbe: {
      price: "R$ 129,90",
      priceValue: 129.90,
      period: "/mês",
      description: "Para grupos e terreiros que estudam juntos",
      features: [
        "Até 5 contas com acesso completo",
        "Todos os 256 Odu Ifá (cada conta)",
        "Dashboard compartilhado de progresso",
        "Todos os recursos do Awo",
        "Perfeito para grupos de estudo",
        "Gestão centralizada",
        "Suporte dedicado",
      ],
      stripeId: "price_1SVYDfDo1RHWW8lpGhLjNjoV",
      icon: Users,
    },
  };

  const handleCTAClick = async (planName: string, priceValue: number) => {
    // Track CTA click
    trackCTAClick(`começar_${planName.toLowerCase()}`, 'pricing', planName, priceValue);
    
    // Track AddToCart for interest tracking
    trackAddToCart(planName, priceValue);
    
    // Track InitiateCheckout
    trackInitiateCheckout(planName, priceValue, 'pricing');

    // Se for plano gratuito, vai para auth/subscription
    if (planName.toLowerCase() === "gratuito") {
      navigate(user ? '/subscription' : '/auth');
      return;
    }

    console.log('[PRICING] Estado GURU:', { isGuruEnabled, guruLoading });

    // Se GURU está carregando, aguarda um pouco
    if (guruLoading) {
      console.log('[PRICING] GURU ainda carregando, aguardando...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Se GURU está habilitado e tem link configurado, abre direto
    console.log('[PRICING] Tentando abrir GURU para:', planName);

    if (isGuruEnabled && openGuruCheckout(planName, false)) {
      console.log('[PRICING] GURU checkout aberto com sucesso');
      return; // Sucesso - abriu checkout GURU
    }

    console.log('[PRICING] Fallback: redirecionando para subscription/auth');
    // Fallback: redireciona para página de subscription
    navigate(user ? '/subscription' : '/auth');
  };

  if (plansLoading) {
    return (
      <section id="pricing" className="py-24 px-4 bg-background">
        <div className="container mx-auto flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Carregando planos...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-24 px-4 bg-background">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Escolha seu{" "}
            <span className="bg-gradient-secondary bg-clip-text text-transparent">
              Caminho de Aprendizado
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Planos flexíveis para todos os níveis de estudo
          </p>
        </div>

        {/* Pricing Cards */}
        <div className={`grid gap-6 max-w-5xl mx-auto ${visiblePlans.length === 1 ? 'max-w-md' : visiblePlans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3'}`}>
          {visiblePlans.map((plan, index) => {
            const planData = landingPlanData[plan.id];
            if (!planData) return null;
            
            const PlanIcon = planData.icon;
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

                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{planData.price}</span>
                    <span className="text-muted-foreground text-sm">{planData.period}</span>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4">{planData.description}</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {planData.features.map((feature, i) => (
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
                    onClick={() => handleCTAClick(plan.name, planData.priceValue)}
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
