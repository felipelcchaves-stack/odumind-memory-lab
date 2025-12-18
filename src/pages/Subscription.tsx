import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdmin } from '@/hooks/useAdmin';
import { useGuruCheckout } from '@/hooks/useGuruCheckout';
import { usePlanVisibility } from '@/hooks/usePlanVisibility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Crown, Check, CreditCard, Calendar, AlertCircle, Shield, Users, AlertTriangle } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import RetentionOfferDialog from '@/components/RetentionOfferDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePixelTracking } from '@/hooks/usePixelTracking';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Dados dos planos para a página de subscription
const plansData = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/7 dias",
    description: "Experimente tudo por 7 dias, sem compromisso",
    features: [
      "Todos os 256 Odu Ifá por 7 dias",
      "Flashcards completos",
      "Repetição espaçada",
      "Progresso detalhado",
      "Após 7 dias, upgrade necessário",
    ],
    planId: "free",
  },
  {
    name: "Awo",
    price: "R$ 97,00",
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
    planId: "professional",
    stripeId: "price_1SUQe8Do1RHWW8lpTManIdtD",
  },
  {
    name: "Egbe (Família)",
    price: "R$ 129,90",
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
    planId: "family",
    stripeId: "price_1SVYDfDo1RHWW8lpGhLjNjoV",
  },
];

export default function Subscription() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isColaborador } = useAdmin();
  const { 
    subscription, 
    loading: subLoading, 
    loadSubscription, 
    createCheckout, 
    createFamilyCheckout, 
    createCheckoutWithCoupon,
    openCustomerPortal, 
    changeOwnSubscription,
    createRetentionOffer,
  } = useSubscription();
  const { isGuruEnabled, openGuruCheckout, openMemberArea, loading: guruLoading } = useGuruCheckout();
  const { visiblePlans: visiblePlanConfigs, loading: plansLoading } = usePlanVisibility();
  const navigate = useNavigate();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const { trackInitiateCheckout } = usePixelTracking();
  
  // Map visible plan configs to actual plan data
  const visiblePlans = plansData.filter(plan => {
    const planId = plan.name.toLowerCase().replace(' (família)', '').replace('egbe', 'egbe');
    const normalizedId = plan.name === 'Gratuito' ? 'gratuito' : 
                         plan.name === 'Awo' ? 'awo' : 'egbe';
    return visiblePlanConfigs.some(p => p.id === normalizedId);
  });
  
  // Retention offer state
  const [showRetentionOffer, setShowRetentionOffer] = useState(false);
  const [retentionOfferData, setRetentionOfferData] = useState<any>(null);
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState<string | null>(null);
  
  // Checkout required state (when free plan is disabled)
  const [isCheckoutRequired, setIsCheckoutRequired] = useState(false);
  
  // Check for required=true query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('required') === 'true') {
      setIsCheckoutRequired(true);
      window.history.replaceState({}, '', '/subscription');
    }
  }, []);

  // Plan hierarchy for determining if downgrade is allowed
  const planHierarchy = ['Gratuito', 'Awo', 'Egbe'];
  const getCurrentPlanIndex = () => {
    const currentPlanName = subscription?.plan_name || 'Gratuito';
    // Normalize plan name for hierarchy check
    const normalizedName = currentPlanName.includes('Egbe') || currentPlanName.includes('Família') 
      ? 'Egbe' 
      : currentPlanName;
    return planHierarchy.indexOf(normalizedName);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      toast.success('Assinatura ativada com sucesso!');
      loadSubscription();
      window.history.replaceState({}, '', '/subscription');
    } else if (params.get('canceled')) {
      toast.info('Checkout cancelado');
      window.history.replaceState({}, '', '/subscription');
    }
  }, [loadSubscription]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Show special message for admins/collaborators
  if (isAdmin || isColaborador) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Acesso Administrativo
              </CardTitle>
              <CardDescription>
                Sua conta tem privilégios especiais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Você tem acesso completo como <span className="font-semibold text-foreground">{isAdmin ? 'Administrador' : 'Colaborador'}</span>. 
                Todas as funcionalidades estão disponíveis sem necessidade de assinatura.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Acesso ilimitado a todos os 256 Odu</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Recursos avançados de memorização</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Ferramentas de gerenciamento de conteúdo</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleDowngrade = async (planName: string) => {
    const currentPlanName = subscription?.plan_name || '';
    
    // Validação especial para plano Família
    if ((currentPlanName === 'Egbe' || currentPlanName === 'Egbe (Família)' || currentPlanName === 'Família') && 
        planName !== 'Egbe') {
      
      // Verificar se é owner de grupo com membros
      try {
        const { data: familyGroup } = await supabase
          .from('family_groups')
          .select('id, owner_user_id')
          .eq('owner_user_id', user?.id)
          .single();

        if (familyGroup) {
          const { data: members } = await supabase
            .from('family_members')
            .select('id')
            .eq('family_group_id', familyGroup.id)
            .eq('status', 'active');

          if (members && members.length > 1) {
            toast.error(
              'Você não pode fazer downgrade enquanto houver membros ativos no grupo Família. ' +
              'Acesse a página Família para gerenciar os membros.',
              { duration: 8000 }
            );
            return;
          }
        }
      } catch (error) {
        console.error('Error checking family group:', error);
      }
    }
    
    // If downgrading to Gratuito, show retention offer first
    if (planName === 'Gratuito') {
      // Don't show retention offer if already on Gratuito
      if (currentPlanName === 'Gratuito') {
        toast.info('Você já está no plano Gratuito');
        return;
      }

      setProcessingPlan(planName);
      setPendingDowngradePlan(planName);
      
      try {
        // Create retention offer
        const offerData = await createRetentionOffer(currentPlanName);
        
        if (offerData) {
          setRetentionOfferData(offerData);
          setShowRetentionOffer(true);
        } else {
          // If offer creation fails, proceed with downgrade
          await proceedWithDowngrade(planName);
        }
      } catch (error) {
        console.error('Error creating retention offer:', error);
        // If error, proceed with downgrade anyway
        await proceedWithDowngrade(planName);
      } finally {
        setProcessingPlan(null);
      }
    } else {
      // For other downgrades, proceed directly
      await proceedWithDowngrade(planName);
    }
  };

  const proceedWithDowngrade = async (planName: string) => {
    setProcessingPlan(planName);
    
    try {
      const success = await changeOwnSubscription(planName);
      if (!success) {
        toast.error('Não foi possível realizar o downgrade');
      }
    } catch (error) {
      console.error('Error downgrading:', error);
      toast.error('Erro ao processar downgrade');
    } finally {
      setProcessingPlan(null);
      setPendingDowngradePlan(null);
      setShowRetentionOffer(false);
      setRetentionOfferData(null);
    }
  };

  const handleAcceptRetentionOffer = async () => {
    if (!retentionOfferData || !subscription?.plan_name) {
      toast.error('Erro ao processar oferta');
      return;
    }

    // Get the current plan's stripe ID
    const currentPlan = plansData.find(p => p.name === subscription.plan_name);
    if (!currentPlan?.stripeId) {
      toast.error('Plano não encontrado');
      return;
    }

    try {
      // Create checkout with the coupon
      const url = await createCheckoutWithCoupon(
        currentPlan.stripeId, 
        retentionOfferData.couponCode
      );
      
      if (url) {
        window.open(url, '_blank');
        toast.success('Redirecionando para checkout com desconto...');
        setShowRetentionOffer(false);
      }
    } catch (error) {
      console.error('Error accepting retention offer:', error);
      toast.error('Erro ao processar oferta');
    }
  };

  const handleDeclineRetentionOffer = async () => {
    if (pendingDowngradePlan) {
      await proceedWithDowngrade(pendingDowngradePlan);
    }
  };

  const handleSubscribe = async (planId: string, stripeId?: string) => {
    if (planId === 'free') {
      toast.info('Você já está no plano gratuito');
      return;
    }

    setProcessingPlan(planId);
    
    try {
      // Track checkout initiation
      const plan = plansData.find(p => p.planId === planId);
      if (plan) {
        const price = parseFloat(plan.price.replace('R$ ', '').replace(',', '.'));
        trackInitiateCheckout(plan.name, price);
      }
      
      console.log('[CHECKOUT] Estado GURU:', { isGuruEnabled, guruLoading });
      
      // Se GURU está carregando, aguarda um pouco
      if (guruLoading) {
        console.log('[CHECKOUT] GURU ainda carregando, aguardando...');
        toast.info('Preparando checkout...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Se GURU está habilitado, tenta usar checkout GURU primeiro
      if (isGuruEnabled && plan) {
        console.log('[CHECKOUT] Tentando abrir GURU para:', plan.name);
        const opened = openGuruCheckout(plan.name, false);
        console.log('[CHECKOUT] GURU abriu?', opened);
        if (opened) {
          toast.success('Redirecionando para checkout...');
          return;
        }
      }

      // Fallback para Stripe
      console.log('[CHECKOUT] Fallback para Stripe, stripeId:', stripeId);
      if (!stripeId) {
        toast.error('Link de checkout não configurado. Entre em contato com o suporte.');
        return;
      }
      
      // Use special checkout for family plan
      let url;
      if (planId === 'family') {
        url = await createFamilyCheckout(stripeId);
      } else {
        url = await createCheckout(stripeId);
      }
      
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Erro ao processar assinatura');
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    
    try {
      // Se GURU está habilitado e a assinatura é via GURU, abre área do membro GURU
      if (isGuruEnabled && subscription?.payment_gateway === 'guru') {
        const opened = openMemberArea();
        if (opened) {
          toast.success('Área do membro aberta em nova aba');
          setManagingSubscription(false);
          return;
        }
      }

      // Fallback para portal Stripe
      const url = await openCustomerPortal();
      if (url) {
        window.open(url, '_blank');
        toast.success('Portal aberto em nova aba');
      }
    } catch (error) {
      console.error('Error managing subscription:', error);
      toast.error('Erro ao abrir gerenciamento de assinatura');
    } finally {
      setManagingSubscription(false);
    }
  };

  if (authLoading || subLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const currentPlanName = subscription?.plan_name || 'Gratuito';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <DashboardHeader />
      
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {!isCheckoutRequired && (
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <h1 className="text-4xl font-bold mb-2">
            {isCheckoutRequired ? 'Escolha seu Plano' : 'Minha Assinatura'}
          </h1>
          <p className="text-muted-foreground">
            {isCheckoutRequired 
              ? 'Selecione um dos planos abaixo para acessar a plataforma'
              : 'Gerencie seu plano e acesse recursos premium'}
          </p>
        </div>

        {/* Checkout Required Alert */}
        {isCheckoutRequired && (
          <Alert variant="destructive" className="mb-6 border-orange-500/50 bg-orange-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Escolha um plano para continuar</AlertTitle>
            <AlertDescription>
              Para acessar a plataforma e começar sua jornada de memorização dos 256 Odu Ifá, 
              selecione um dos planos disponíveis abaixo.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Subscription Card */}
        {subscription && (
          <Card className="mb-8 border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    Plano Atual: {currentPlanName}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Status: <Badge variant={isActive ? "success" : "secondary"}>
                      {subscription.status === 'free' ? 'Gratuito' : 
                       subscription.status === 'active' ? 'Ativo' :
                       subscription.status === 'trialing' ? 'Período de Teste' :
                       subscription.status === 'past_due' ? 'Pagamento Pendente' :
                       'Cancelado'}
                    </Badge>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      toast.info('Recarregando assinatura...');
                      loadSubscription();
                    }}
                    size="sm"
                  >
                    Recarregar Status
                  </Button>
                  {isActive && (
                    <Button 
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={managingSubscription}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {managingSubscription ? 'Abrindo portal...' : 'Gerenciar Assinatura'}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {isActive && subscription.current_period_end && (
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Renovação em: {format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
                {subscription.cancel_at_period_end && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Sua assinatura será cancelada ao fim do período</span>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Plans Grid */}
        <div className={`grid gap-6 ${visiblePlans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
          {visiblePlans.map((plan, index) => {
            const isCurrentPlan = plan.name === currentPlanName || 
              (plan.name === 'Egbe (Família)' && (currentPlanName === 'Egbe' || currentPlanName === 'Família'));
            const currentPlanIdx = getCurrentPlanIndex();
            
            // Normalize plan name for hierarchy check
            const planNameNormalized = plan.name.includes('Egbe') ? 'Egbe' : plan.name;
            const thisPlanIdx = planHierarchy.indexOf(planNameNormalized);
            
            const isDowngrade = thisPlanIdx < currentPlanIdx;
            const isUpgrade = thisPlanIdx > currentPlanIdx;
            const isFamilyPlan = plan.planId === 'family';

            return (
              <Card
                key={index}
                className={`relative transition-all ${
                  isCurrentPlan 
                    ? 'border-2 border-primary shadow-lg' 
                    : 'border hover:border-primary/50'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="default" className="bg-primary">
                      Seu Plano
                    </Badge>
                  </div>
                )}

                {plan.name === 'Awo' && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary" className="bg-gradient-secondary">
                      <Crown className="w-3 h-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  {isFamilyPlan && (
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-accent/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-accent" />
                    </div>
                  )}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1 mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4">
                    {isCurrentPlan ? (
                      <Button className="w-full" variant="outline" disabled>
                        Plano Atual
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        className="w-full"
                        variant="premium"
                        onClick={() => handleSubscribe(plan.planId, plan.stripeId)}
                        disabled={processingPlan === plan.planId}
                      >
                        {processingPlan === plan.planId ? 'Processando...' : 'Fazer Upgrade'}
                      </Button>
                    ) : isDowngrade ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleDowngrade(plan.name)}
                        disabled={processingPlan === plan.name}
                      >
                        {processingPlan === plan.name ? 'Processando...' : 'Fazer Downgrade'}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => handleSubscribe(plan.planId, plan.stripeId)}
                        disabled={processingPlan === plan.planId}
                      >
                        {processingPlan === plan.planId ? 'Processando...' : 'Assinar'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Todos os planos incluem 7 dias de garantia de satisfação.</p>
          <p className="mt-1">Dúvidas? Entre em contato pelo suporte.</p>
        </div>

        {/* Retention Offer Dialog */}
        <RetentionOfferDialog
          open={showRetentionOffer}
          onOpenChange={setShowRetentionOffer}
          currentPlan={subscription?.plan_name || 'Awo'}
          discountPercent={retentionOfferData?.discountPercent || 30}
          durationMonths={retentionOfferData?.durationMonths || 3}
          onAcceptOffer={handleAcceptRetentionOffer}
          onDeclineOffer={handleDeclineRetentionOffer}
        />
      </div>
    </div>
  );
}
