import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdmin } from '@/hooks/useAdmin';

export interface SubscriptionData {
  status: 'free' | 'active' | 'trialing' | 'past_due' | 'canceled';
  plan_name: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  guru_subscription_id?: string;
  guru_customer_id?: string;
  payment_gateway?: 'stripe' | 'guru';
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const { isAdmin, isColaborador, loading: rolesLoading } = useAdmin();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    // Wait for roles to load before proceeding
    if (rolesLoading) {
      console.log('Roles still loading, waiting...');
      return;
    }

    // Skip Stripe sync for admins/collaborators
    if (isAdmin || isColaborador) {
      console.log('User is admin/collaborator, granting full access');
      setSubscription({
        status: 'active',
        plan_name: 'Administrativo',
      } as SubscriptionData);
      setLoading(false);
      return;
    }

    let localData = null;

    try {
      // First check local database
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      localData = data;

      if (localData) {
        setSubscription(localData as SubscriptionData);
      }

      const getValidAccessToken = async (): Promise<string | null> => {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (!sessionError && sessionData.session?.access_token) return sessionData.session.access_token;

        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session?.access_token) return refreshData.session.access_token;

        return null;
      };

      const safeInvokeCheckSubscription = async (token: string) => {
        try {
          return await supabase.functions.invoke('check-subscription', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (err: any) {
          // supabase-js can throw for non-2xx responses; normalize into the same shape
          return {
            data: null,
            error: {
              message: err?.message ? String(err.message) : String(err),
            },
          } as any;
        }
      };

      const isAuthExpired = (msg?: string) =>
        !!msg && (
          msg.includes('401') ||
          msg.toLowerCase().includes('session expired') ||
          msg.toLowerCase().includes('auth session missing')
        );

      const token1 = await getValidAccessToken();
      if (!token1 || token1 === 'undefined' || token1 === 'null') {
        console.warn('No valid access token available, skipping subscription sync');
        setLoading(false);
        return;
      }

      const { data: stripeData1, error: error1 } = await safeInvokeCheckSubscription(token1);

      // 401 / session expired: refresh and retry once (quietly)
      if (error1 && isAuthExpired(error1.message)) {
        const token2 = await getValidAccessToken();
        if (token2 && token2 !== token1) {
          const { data: stripeData2, error: error2 } = await safeInvokeCheckSubscription(token2);
          if (!error2 && stripeData2) {
            const { data: updatedData } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();

            if (updatedData) setSubscription(updatedData as SubscriptionData);
            setLoading(false);
            return;
          }
        }

        // Keep local state when session is truly expired
        setLoading(false);
        return;
      }

      if (error1) {
        console.error('Error checking subscription with backend:', error1);
        // Silenciar todos os erros relacionados a autenticação/sessão
        const isAuthRelated = 
          error1.message?.includes('Auth session missing') ||
          error1.message?.includes('401') ||
          error1.message?.includes('session expired') ||
          error1.message?.includes('session_expired') ||
          error1.message?.includes('Session expired');
        
        // Só mostrar toast para erros NÃO relacionados a auth
        if (user && !isAuthRelated) {
          toast.error('Erro ao verificar assinatura. Seus dados locais foram mantidos.');
        }
        if (!localData) {
          const freeData: SubscriptionData = {
            status: 'free',
            plan_name: 'Gratuito',
          };
          setSubscription(freeData);
        }
        setLoading(false);
        return;
      }

      if (stripeData1) {
        const { data: updatedData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (updatedData) {
          setSubscription(updatedData as SubscriptionData);
        }
      }
    } catch (error) {
      console.error('Error in loadSubscription:', error);
      // Default to free plan on error to avoid blocking users
      if (!localData) {
        const freeData: SubscriptionData = {
          status: 'free',
          plan_name: 'Gratuito',
        };
        setSubscription(freeData);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [user, isAdmin, isColaborador, rolesLoading]);

  const createCheckout = async (priceId: string) => {
    if (!user) {
      toast.error('Faça login para continuar');
      return null;
    }

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        toast.error('Sessão inválida. Faça login novamente.');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;
      return data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Erro ao criar sessão de checkout');
      return null;
    }
  };

  const createFamilyCheckout = async (priceId: string) => {
    if (!user) {
      toast.error('Faça login para continuar');
      return null;
    }

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        toast.error('Sessão inválida. Faça login novamente.');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('create-family-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;
      return data.url;
    } catch (error) {
      console.error('Error creating family checkout:', error);
      toast.error('Erro ao criar sessão de checkout para plano família');
      return null;
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      toast.error('Faça login para continuar');
      return null;
    }

    try {
      console.log('Refreshing session before opening portal...');
      
      // Force refresh session to get a fresh token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Session refresh failed:', refreshError);
        toast.error('Sessão expirada. Faça login novamente.');
        return null;
      }

      const accessToken = refreshData.session?.access_token;
      
      if (!accessToken || accessToken === 'undefined') {
        console.error('No valid access token after refresh');
        toast.error('Erro ao obter token válido. Faça login novamente.');
        return null;
      }

      console.log('Calling customer-portal with fresh token');
      
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        console.error('Portal invocation error:', error);
        
        // If token is still invalid after refresh, prompt re-login
        if (error.message?.includes('session') || error.message?.includes('token') || error.message?.includes('authentication')) {
          toast.error('Sessão expirada. Faça login novamente.');
        } else {
          toast.error('Erro ao abrir portal de gerenciamento');
        }
        return null;
      }

      return data.url;
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Erro ao abrir portal de gerenciamento');
      return null;
    }
  };

  const createRetentionOffer = async (currentPlan: string) => {
    if (!user) {
      toast.error('Faça login para continuar');
      return null;
    }

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        toast.error('Sessão inválida. Faça login novamente.');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('create-retention-offer', {
        body: { 
          currentPlan,
          discountPercent: 30,
          durationMonths: 3,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (error) {
        console.error('Error creating retention offer:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating retention offer:', error);
      return null;
    }
  };

  const createCheckoutWithCoupon = async (priceId: string, couponCode?: string) => {
    if (!user) {
      toast.error('Faça login para continuar');
      return null;
    }

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        toast.error('Sessão inválida. Faça login novamente.');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-with-coupon', {
        body: { priceId, couponCode },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;
      return data.url;
    } catch (error) {
      console.error('Error creating checkout with coupon:', error);
      toast.error('Erro ao criar sessão de checkout');
      return null;
    }
  };

  const normalizePlanName = (planName: string): string => {
    const lowerName = planName.toLowerCase();
    const aliases: { [key: string]: string } = {
      'egbe (família)': 'Egbe',
      'família': 'Egbe',
      'familia': 'Egbe',
      'family': 'Egbe',
      'profissional': 'Awo',
      'professional': 'Awo',
      'premium': 'Awo',
      'akapo': 'Awo',
    };
    return aliases[lowerName] || planName;
  };

  const changeOwnSubscription = async (newPlan: string): Promise<boolean> => {
    if (!user) {
      toast.error('Você precisa estar autenticado');
      return false;
    }

    const normalizedPlan = normalizePlanName(newPlan);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('change-own-subscription', {
        body: { newPlan: normalizedPlan },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error changing subscription:', error);
        toast.error(error.message || 'Erro ao alterar plano');
        return false;
      }

      if (data.success) {
        toast.success(data.message || 'Plano alterado com sucesso!');
        await loadSubscription();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Exception changing subscription:', error);
      
      // Tratamento específico para erro de membros ativos
      if (error.message?.includes('membros ativos')) {
        toast.error(error.message, { duration: 6000 });
      } else {
        toast.error('Erro ao processar mudança de plano');
      }
      
      return false;
    }
  };

  const hasActiveSubscription = () => {
    // Admins and Colaboradores always have access
    if (isAdmin || isColaborador) return true;
    
    if (!subscription) return false;
    return subscription.status === 'active' || subscription.status === 'trialing';
  };

  const isPremium = () => {
    // Admins and Colaboradores have premium access
    if (isAdmin || isColaborador) return true;
    
    const planName = subscription?.plan_name?.toLowerCase() || '';
    return hasActiveSubscription() && (
      planName === 'awo' || 
      planName === 'premium' ||
      planName === 'profissional' ||
      planName === 'professional' ||
      planName === 'akapo'
    );
  };

  const isProfessional = () => {
    // Alias for isPremium - both refer to Awo plan
    return isPremium();
  };

  const isFamily = () => {
    // Admins and Colaboradores don't have family plan
    if (isAdmin || isColaborador) return false;
    
    return hasActiveSubscription() && (
      subscription?.plan_name === 'Família' || 
      subscription?.plan_name === 'Family' ||
      subscription?.plan_name?.toLowerCase().includes('familia') ||
      subscription?.plan_name?.toLowerCase().includes('family')
    );
  };

  const isFree = () => {
    // Admins and Colaboradores are never on free plan
    if (isAdmin || isColaborador) return false;
    
    return !subscription || subscription.status === 'free';
  };

  return {
    subscription,
    loading: loading || rolesLoading,
    loadSubscription,
    hasActiveSubscription,
    isPremium,
    isProfessional,
    isFamily,
    isFree,
    createCheckout,
    createFamilyCheckout,
    createCheckoutWithCoupon,
    openCustomerPortal,
    changeOwnSubscription,
    createRetentionOffer,
  };
};
