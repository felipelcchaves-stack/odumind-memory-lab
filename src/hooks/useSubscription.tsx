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

      // Wait a bit to ensure session is fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get current session and validate/refresh if needed
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      // If session is invalid or expired, try to refresh it
      if (sessionError || !sessionData.session) {
        console.warn('No valid session, attempting to refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.warn('Unable to refresh session, skipping Stripe sync');
          setLoading(false);
          return;
        }
        
        sessionData.session = refreshData.session;
      }
      
      const accessToken = sessionData.session?.access_token;
      
      // Only call edge function if we have a valid token
      if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
        console.warn('No valid access token available, skipping Stripe sync');
        setLoading(false);
        return;
      }

      console.log('Calling check-subscription with valid token');
      const { data: stripeData, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        console.error('Error checking subscription with Stripe:', error);
        toast.error('Erro ao verificar assinatura. Seus dados locais foram mantidos.');
        // Default to free plan on error to avoid blocking users
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

      if (stripeData) {
        // Update local state with fresh data from Stripe
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

  const hasActiveSubscription = () => {
    // Admins and Colaboradores always have access
    if (isAdmin || isColaborador) return true;
    
    if (!subscription) return false;
    return subscription.status === 'active' || subscription.status === 'trialing';
  };

  const isPremium = () => {
    // Admins and Colaboradores have premium access
    if (isAdmin || isColaborador) return true;
    
    return hasActiveSubscription() && (
      subscription?.plan_name === 'Premium' || 
      subscription?.plan_name === 'Akapo' ||
      subscription?.plan_name?.includes('Premium')
    );
  };

  const isProfessional = () => {
    // Admins and Colaboradores have professional access
    if (isAdmin || isColaborador) return true;
    
    return hasActiveSubscription() && (
      subscription?.plan_name === 'Profissional' || 
      subscription?.plan_name === 'Awo' ||
      subscription?.plan_name?.includes('Profissional')
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
    isFree,
    createCheckout,
    openCustomerPortal,
  };
};
