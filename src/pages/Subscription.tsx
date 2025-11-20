import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Crown, Check, CreditCard, Calendar, AlertCircle, Shield, Users } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import RetentionOfferDialog from '@/components/RetentionOfferDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePixelTracking } from '@/hooks/usePixelTracking';

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
    planId: "free",
  },
  {
    name: "Akapo",
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
      "Suporte prioritário",
    ],
    planId: "premium",
    stripeId: "price_1SUQd7Do1RHWW8lpaKCqKH8g",
  },
  {
    name: "Awo",
    price: "R$ 99,90",
    period: "/mês",
    description: "Para mestres e professores de Ifá",
    features: [
      "Tudo do Akapo",
      "Criar flashcards personalizados",
      "Módulos exclusivos para ensino",
      "Análises avançadas de progresso",
      "Mentoria em grupo mensal",
      "Acesso antecipado a novos conteúdos",
      "Badge de mestre verificado",
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
      "Até 5 contas Akapo",
      "Todos os 256 Odu Ifá (cada conta)",
      "Dashboard compartilhado de progresso",
      "Recursos Akapo completos",
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
  const navigate = useNavigate();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const { trackInitiateCheckout } = usePixelTracking();
  
  // Retention offer state
  const [showRetentionOffer, setShowRetentionOffer] = useState(false);
  const [retentionOfferData, setRetentionOfferData] = useState<any>(null);
  const [pendingDowngradePlan, setPendingDowngradePlan] = useState<string | null>(null);

  // Plan hierarchy for determining if downgrade is allowed
  const planHierarchy = ['Gratuito', 'Akapo', 'Awo', 'Egbe'];
  const getCurrentPlanIndex = () => {
    const currentPlanName = subscription?.plan_name || 'Gratuito';
    return planHierarchy.indexOf(currentPlanName);
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
    // If downgrading to Gratuito, show retention offer first
    if (planName === 'Gratuito') {
      const currentPlanName = subscription?.plan_name || '';
      
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
    const currentPlan = plans.find(p => p.name === subscription.plan_name);
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

    if (!stripeId) {
      toast.error('ID do plano não configurado. Entre em contato com o suporte.');
      return;
    }

    setProcessingPlan(planId);
    
    try {
      // Track checkout initiation
      const plan = plans.find(p => p.planId === planId);
      if (plan) {
        const price = parseFloat(plan.price.replace('R$ ', '').replace(',', '.'));
        trackInitiateCheckout(plan.name, price);
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

  if (authLoading || subLoading) {
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
      
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-4xl font-bold mb-2">Minha Assinatura</h1>
          <p className="text-muted-foreground">
            Gerencie seu plano e acesse recursos premium
          </p>
        </div>

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
        <div className="grid md:grid-cols-4 gap-6">
          {plans.map((plan, index) => {
            const isCurrentPlan = plan.name === currentPlanName;
            const currentPlanIdx = getCurrentPlanIndex();
            const thisPlanIdx = planHierarchy.indexOf(plan.name);
            const canDowngrade = thisPlanIdx < currentPlanIdx && !isCurrentPlan;
            const isUpgrade = thisPlanIdx > currentPlanIdx;
            
            return (
              <Card
                key={index}
                className={`relative transition-smooth hover:shadow-medium ${
                  isCurrentPlan
                    ? "border-2 border-primary shadow-medium"
                    : "border-2 hover:border-primary/50"
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="px-4 py-1.5 bg-gradient-secondary text-sm font-semibold shadow-soft">
                      Seu Plano Atual
                    </Badge>
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
                  {canDowngrade ? (
                    <Button
                      className="w-full"
                      size="lg"
                      variant="outline"
                      disabled={processingPlan === plan.name}
                      onClick={() => handleDowngrade(plan.name)}
                    >
                      {processingPlan === plan.name ? 'Processando...' : 'Fazer Downgrade'}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={isCurrentPlan || processingPlan === plan.planId}
                      onClick={() => handleSubscribe(plan.planId, plan.stripeId)}
                      variant={isCurrentPlan ? "secondary" : "default"}
                    >
                      {processingPlan === plan.planId ? (
                        'Processando...'
                      ) : isCurrentPlan ? (
                        'Plano Atual'
                      ) : plan.planId === 'free' ? (
                        'Plano Gratuito'
                      ) : isUpgrade ? (
                        `Fazer Upgrade`
                      ) : (
                        `Assinar ${plan.name}`
                      )}
                    </Button>
                  )}

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
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <Card className="inline-block">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  Todos os planos incluem 7 dias de garantia de satisfação
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Retention Offer Dialog */}
      {retentionOfferData && (
        <RetentionOfferDialog
          open={showRetentionOffer}
          onOpenChange={setShowRetentionOffer}
          onAcceptOffer={handleAcceptRetentionOffer}
          onDeclineOffer={handleDeclineRetentionOffer}
          currentPlan={subscription?.plan_name || ''}
          discountPercent={retentionOfferData.discountPercent}
          durationMonths={retentionOfferData.durationMonths}
          loading={processingPlan !== null}
        />
      )}
    </div>
  );
}
