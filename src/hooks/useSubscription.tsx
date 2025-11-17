import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading subscription:', error);
        throw error;
      }

      if (data) {
        setSubscription(data as SubscriptionData);
      } else {
        // Create free subscription if doesn't exist
        const { data: newSub, error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            status: 'free',
            plan_name: 'Gratuito'
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSubscription(newSub as SubscriptionData);
      }
    } catch (error) {
      console.error('Error in loadSubscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [user]);

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
    isFree
  };
};
