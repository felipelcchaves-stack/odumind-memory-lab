import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdmin } from '@/hooks/useAdmin';
import { useGuruCheckout } from '@/hooks/useGuruCheckout';
import { useSubscriptionPlans, SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
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
import { Skeleton } from '@/components/ui/skeleton';

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
  const { plans, loading: plansLoading, getSubscriptionPlans, getPlanHierarchy } = useSubscriptionPlans();
  const navigate = useNavigate();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const { trackInitiateCheckout } = usePixelTracking();
  
  const visiblePlans = getSubscriptionPlans();
  
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

  // Get current plan hierarchy
  const getCurrentPlanHierarchy = () => {
    const currentPlanName = subscription?.plan_name || 'Gratuito';
    // Map old plan names to plan_level
    const planLevelMap: Record<string, string> = {
      'Gratuito': 'gratuito',
      'free': 'gratuito',
      'Awo': 'awo',
      'Premium': 'awo',
      'Profissional': 'awo',
      'Egbe': 'egbe',
      'Egbe (Família)': 'egbe',
      'Família': 'egbe',
      'Family': 'egbe',
    };
    const planLevel = planLevelMap[currentPlanName] || 'gratuito';
    return getPlanHierarchy(planLevel);
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

  const handleDowngrade = async (plan: SubscriptionPlan) => {
    const currentPlanName = subscription?.plan_name || '';
    
    // Validação especial para plano Família
    if ((currentPlanName === 'Egbe' || currentPlanName === 'Egbe (Família)' || currentPlanName === 'Família') && 
        plan.plan_level !== 'egbe') {
      
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
    if (plan.plan_level === 'gratuito') {
      // Don't show retention offer if already on Gratuito
      if (currentPlanName === 'Gratuito') {
        toast.info('Você já está no plano Gratuito');
        return;
      }

      setProcessingPlan(plan.slug);
      setPendingDowngradePlan(plan.nome);
      
      try {
        // Create retention offer
        const offerData = await createRetentionOffer(currentPlanName);
        
        if (offerData) {
          setRetentionOfferData(offerData);
          setShowRetentionOffer(true);
        } else {
          // If offer creation fails, proceed with downgrade
          await proceedWithDowngrade(plan.nome);
        }
      } catch (error) {
        console.error('Error creating retention offer:', error);
        // If error, proceed with downgrade anyway
        await proceedWithDowngrade(plan.nome);
      } finally {
        setProcessingPlan(null);
      }
    } else {
      // For other downgrades, proceed directly
      await proceedWithDowngrade(plan.nome);
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

    // Get the current plan from DB
    const currentPlan = plans.find(p => 
      p.nome === subscription.plan_name || 
      p.plan_level === subscription.plan_name.toLowerCase()
    );
    
    if (!currentPlan?.checkout_url) {
      toast.error('Plano não configurado corretamente');
      return;
    }

    try {
      // Open checkout with coupon if available, otherwise just open checkout
      if (retentionOfferData.couponCode) {
        const url = await createCheckoutWithCoupon(
          currentPlan.checkout_url, 
          retentionOfferData.couponCode
        );
        
        if (url) {
          window.open(url, '_blank');
          toast.success('Redirecionando para checkout com desconto...');
          setShowRetentionOffer(false);
        }
      } else if (currentPlan.checkout_url) {
        window.open(currentPlan.checkout_url, '_blank');
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

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (plan.plan_level === 'gratuito') {
      toast.info('Você já está no plano gratuito');
      return;
    }

    setProcessingPlan(plan.slug);
    
    try {
      // Track checkout initiation
      trackInitiateCheckout(plan.nome, plan.preco);
      
      console.log('[CHECKOUT] Estado GURU:', { isGuruEnabled, guruLoading });
      
      // Se GURU está carregando, aguarda um pouco
      if (guruLoading) {
        console.log('[CHECKOUT] GURU ainda carregando, aguardando...');
        toast.info('Preparando checkout...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Se tem checkout_url direto, usa
      if (plan.checkout_url) {
        window.open(plan.checkout_url, '_blank');
        toast.success('Redirecionando para checkout...');
        return;
      }
      
      // Se GURU está habilitado, tenta usar checkout GURU
      if (isGuruEnabled) {
        console.log('[CHECKOUT] Tentando abrir GURU para:', plan.nome);
        const opened = openGuruCheckout(plan.nome, false);
        console.log('[CHECKOUT] GURU abriu?', opened);
        if (opened) {
          toast.success('Redirecionando para checkout...');
          return;
        }
      }

      // Fallback message
      toast.error('Link de checkout não configurado. Entre em contato com o suporte.');
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

  // Format price
  const formatPrice = (preco: number, moeda: string) => {
    if (preco === 0) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda,
      minimumFractionDigits: 2
    }).format(preco);
  };

  // Format period
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

  // Check if plan is current
  const isCurrentPlan = (plan: SubscriptionPlan) => {
    const currentPlanName = subscription?.plan_name || 'Gratuito';
    const normalizedCurrent = currentPlanName.toLowerCase().replace(' (família)', '').replace('família', 'egbe');
    return plan.nome.toLowerCase() === normalizedCurrent || 
           plan.plan_level === normalizedCurrent ||
           (plan.plan_level === 'egbe' && (currentPlanName === 'Egbe' || currentPlanName === 'Família' || currentPlanName === 'Egbe (Família)'));
  };

  if (authLoading || subLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <DashboardHeader />
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-32 w-full mb-8" />
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-[400px] w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPlanName = subscription?.plan_name || 'Gratuito';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const currentHierarchy = getCurrentPlanHierarchy();

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
        <div className={`grid gap-6 ${
          visiblePlans.length === 1 ? 'max-w-md mx-auto' :
          visiblePlans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 
          'md:grid-cols-3'
        }`}>
          {visiblePlans.map((plan) => {
            const isCurrent = isCurrentPlan(plan);
            const planHierarchy = plan.hierarquia;
            const isDowngrade = planHierarchy < currentHierarchy;
            const isUpgrade = planHierarchy > currentHierarchy;
            const isFamilyPlan = plan.plan_level === 'egbe';
            const isPopular = plan.badge_text?.toLowerCase().includes('popular');

            return (
              <Card
                key={plan.id}
                className={`relative transition-all ${
                  isCurrent 
                    ? 'border-2 border-primary shadow-lg' 
                    : 'border hover:border-primary/50'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="default" className="bg-primary">
                      Seu Plano
                    </Badge>
                  </div>
                )}

                {!isCurrent && plan.badge_text && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary" className="bg-gradient-secondary">
                      {isPopular && <Crown className="w-3 h-3 mr-1" />}
                      {plan.badge_text}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  {isFamilyPlan && (
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-accent/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-accent" />
                    </div>
                  )}
                  <CardTitle className="text-xl">{plan.nome}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1 mt-2">
                    {plan.preco_original && plan.preco_original > plan.preco && (
                      <span className="text-lg text-muted-foreground line-through mr-2">
                        {formatPrice(plan.preco_original, plan.moeda)}
                      </span>
                    )}
                    <span className="text-3xl font-bold">{formatPrice(plan.preco, plan.moeda)}</span>
                    <span className="text-muted-foreground text-sm">{formatPeriod(plan.periodo)}</span>
                  </div>
                  {plan.descricao && (
                    <CardDescription className="mt-2">{plan.descricao}</CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          feature.included ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <span className={`text-sm ${!feature.included && 'text-muted-foreground line-through'}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4">
                    {isCurrent ? (
                      <Button className="w-full" variant="outline" disabled>
                        Plano Atual
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => handleSubscribe(plan)}
                        disabled={processingPlan === plan.slug}
                      >
                        {processingPlan === plan.slug ? 'Processando...' : 'Fazer Upgrade'}
                      </Button>
                    ) : isDowngrade ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleDowngrade(plan)}
                        disabled={processingPlan === plan.slug}
                      >
                        {processingPlan === plan.slug ? 'Processando...' : 'Fazer Downgrade'}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => handleSubscribe(plan)}
                        disabled={processingPlan === plan.slug}
                      >
                        {processingPlan === plan.slug ? 'Processando...' : plan.cta_text}
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
