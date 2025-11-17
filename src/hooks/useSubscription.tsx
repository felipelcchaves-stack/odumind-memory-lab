import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = async () => {
    if (!user) {
      setSubscription(null);
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

      // Then sync with Stripe
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      // Only call edge function if we have a valid token
      if (!accessToken || accessToken === 'undefined') {
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
  }, [user]);

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
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        toast.error('Sessão inválida. Faça login novamente.');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;
      return data.url;
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Erro ao abrir portal de gerenciamento');
      return null;
    }
  };

  const hasActiveSubscription = () => {
    if (!subscription) return false;
    return subscription.status === 'active' || subscription.status === 'trialing';
  };

  const isPremium = () => {
    return hasActiveSubscription() && subscription?.plan_name === 'Premium';
  };

  const isProfessional = () => {
    return hasActiveSubscription() && subscription?.plan_name === 'Profissional';
  };

  const isFree = () => {
    return !subscription || subscription.status === 'free';
  };

  return {
    subscription,
    loading,
    loadSubscription,
    hasActiveSubscription,
    isPremium,
    isProfessional,
    isFree,
    createCheckout,
    openCustomerPortal,
  };
};
