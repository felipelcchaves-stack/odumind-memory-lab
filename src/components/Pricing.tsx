import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useGuruCheckout } from "@/hooks/useGuruCheckout";
import { useLandingTracking } from "@/hooks/useLandingTracking";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { Skeleton } from "@/components/ui/skeleton";
import { appendUtmToUrl } from "@/lib/utmUtils";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isGuruEnabled, openGuruCheckout, loading: guruLoading } = useGuruCheckout();
  const { trackCTAClick, trackInitiateCheckout, trackAddToCart } = useLandingTracking();
  const { plans, loading: plansLoading, getLandingPlans } = useSubscriptionPlans();

  const visiblePlans = getLandingPlans();

  const handleCTAClick = async (plan: typeof visiblePlans[0]) => {
    // Track CTA click
    trackCTAClick(`começar_${plan.nome.toLowerCase()}`, 'pricing', plan.nome, plan.preco);
    
    // Track AddToCart for interest tracking
    trackAddToCart(plan.nome, plan.preco);
    
    // Track InitiateCheckout
    trackInitiateCheckout(plan.nome, plan.preco, 'pricing');

    // Se for plano gratuito, vai para auth/subscription
    if (plan.plan_level === 'gratuito') {
      navigate(user ? '/subscription' : '/auth');
      return;
    }

    console.log('[PRICING] Estado GURU:', { isGuruEnabled, guruLoading });

    // Se GURU está carregando, aguarda um pouco
    if (guruLoading) {
      console.log('[PRICING] GURU ainda carregando, aguardando...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Se tem checkout_url direto, usa (com UTMs)
    if (plan.checkout_url) {
      const urlWithUtm = appendUtmToUrl(plan.checkout_url);
      window.open(urlWithUtm, '_blank');
      return;
    }

    // Se GURU está habilitado, tenta usar checkout GURU
    console.log('[PRICING] Tentando abrir GURU para:', plan.nome);
    if (isGuruEnabled && openGuruCheckout(plan.nome, false)) {
      console.log('[PRICING] GURU checkout aberto com sucesso');
      return;
    }

    console.log('[PRICING] Fallback: redirecionando para subscription/auth');
    // Fallback: redireciona para página de subscription
    navigate(user ? '/subscription' : '/auth');
  };

  // Ícones por plan_level
  const getIcon = (planLevel: string) => {
    if (planLevel === 'egbe') return Users;
    return null;
  };

  // Período formatado
  const formatPeriod = (periodo: string) => {
    const periods: Record<string, string> = {
      mensal: '/mês',
      trimestral: '/trimestre',
      semestral: '/semestre',
      anual: '/ano',
      unico: '',
    };
    return periods[periodo] || '';
  };

  // Formatar preço
  const formatPrice = (preco: number, moeda: string) => {
    if (preco === 0) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda,
      minimumFractionDigits: 2
    }).format(preco);
  };

  if (plansLoading) {
    return (
      <section id="pricing" className="py-24 px-4 bg-background">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
          </div>
          <div className="grid gap-6 max-w-5xl mx-auto md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-[500px] w-full rounded-lg" />
            ))}
          </div>
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
        <div className={`grid gap-6 max-w-5xl mx-auto ${
          visiblePlans.length === 1 ? 'max-w-md' : 
          visiblePlans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 
          'md:grid-cols-3'
        }`}>
          {visiblePlans.map((plan) => {
            const PlanIcon = getIcon(plan.plan_level);
            const isPopular = plan.badge_text?.toLowerCase().includes('popular');
            
            return (
              <Card
                key={plan.id}
                className={`relative transition-smooth hover:shadow-medium ${
                  isPopular
                    ? "border-2 border-primary shadow-medium md:scale-105"
                    : "border-2 hover:border-primary/50"
                }`}
              >
                {plan.badge_text && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-secondary text-sm font-semibold shadow-soft">
                      <Crown className="w-4 h-4" />
                      {plan.badge_text}
                    </div>
                  </div>
                )}

                <CardHeader className="text-center pb-6 pt-8">
                  {PlanIcon && (
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
                      <PlanIcon className="w-6 h-6 text-accent" />
                    </div>
                  )}
                  <CardTitle className="text-2xl mb-2">{plan.nome}</CardTitle>

                  <div className="flex items-baseline justify-center gap-1">
                    {plan.preco_original && plan.preco_original > plan.preco && (
                      <span className="text-lg text-muted-foreground line-through mr-2">
                        {formatPrice(plan.preco_original, plan.moeda)}
                      </span>
                    )}
                    <span className="text-4xl font-bold">{formatPrice(plan.preco, plan.moeda)}</span>
                    <span className="text-muted-foreground text-sm">{formatPeriod(plan.periodo)}</span>
                  </div>

                  {plan.descricao && (
                    <p className="text-sm text-muted-foreground mt-4">{plan.descricao}</p>
                  )}
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className={`rounded-full p-0.5 mt-0.5 flex-shrink-0 ${
                          feature.included ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <Check className={`w-3.5 h-3.5 ${
                            feature.included ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <span className={`text-sm ${!feature.included && 'text-muted-foreground line-through'}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.variant === 'premium' ? 'default' : plan.variant}
                    size="lg"
                    onClick={() => handleCTAClick(plan)}
                  >
                    {plan.cta_text}
                    {isPopular && <Sparkles className="ml-2 w-4 h-4" />}
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
