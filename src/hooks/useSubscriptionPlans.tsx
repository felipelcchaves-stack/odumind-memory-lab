import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco: number;
  preco_original: number | null;
  moeda: string;
  periodo: string;
  duracao_dias: number | null;
  features: PlanFeature[];
  checkout_url: string | null;
  guru_product_id: string | null;
  guru_offer_id: string | null;
  plan_level: string;
  hierarquia: number;
  cta_text: string;
  badge_text: string | null;
  variant: 'outline' | 'default' | 'premium';
  cor: string | null;
  ativo: boolean;
  visivel_landing: boolean;
  visivel_subscription: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

// Helper to safely parse features from JSON
function parseFeatures(features: Json): PlanFeature[] {
  if (Array.isArray(features)) {
    return features.map(f => {
      if (typeof f === 'object' && f !== null && 'text' in f && 'included' in f) {
        return {
          text: String((f as { text: unknown }).text),
          included: Boolean((f as { included: unknown }).included)
        };
      }
      return { text: '', included: false };
    });
  }
  return [];
}

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async (includeInactive = false) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('subscription_plans')
        .select('*')
        .order('ordem', { ascending: true });

      if (!includeInactive) {
        query = query.eq('ativo', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Parse and transform data
      const parsedPlans: SubscriptionPlan[] = (data || []).map(plan => ({
        ...plan,
        preco: Number(plan.preco),
        preco_original: plan.preco_original ? Number(plan.preco_original) : null,
        features: parseFeatures(plan.features),
        variant: (plan.variant || 'default') as 'outline' | 'default' | 'premium'
      }));

      setPlans(parsedPlans);
    } catch (err) {
      console.error('Error loading subscription plans:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Get plans for landing page
  const getLandingPlans = useCallback(() => {
    return plans.filter(p => p.visivel_landing && p.ativo);
  }, [plans]);

  // Get plans for subscription page
  const getSubscriptionPlans = useCallback(() => {
    return plans.filter(p => p.visivel_subscription && p.ativo);
  }, [plans]);

  // Get plan by slug
  const getPlanBySlug = useCallback((slug: string) => {
    return plans.find(p => p.slug === slug);
  }, [plans]);

  // Get plan by level (gratuito, awo, egbe)
  const getPlansByLevel = useCallback((level: string) => {
    return plans.filter(p => p.plan_level === level && p.ativo);
  }, [plans]);

  // Get checkout URL for a plan
  const getCheckoutUrl = useCallback((planSlug: string) => {
    const plan = plans.find(p => p.slug === planSlug);
    return plan?.checkout_url || null;
  }, [plans]);

  // Get plan hierarchy (for upgrade/downgrade logic)
  const getPlanHierarchy = useCallback((planLevel: string) => {
    const plan = plans.find(p => p.plan_level === planLevel);
    return plan?.hierarquia ?? 0;
  }, [plans]);

  // CRUD operations for admin
  const createPlan = async (planData: Partial<SubscriptionPlan>) => {
    const insertData = {
      slug: planData.slug || '',
      nome: planData.nome || '',
      descricao: planData.descricao,
      preco: planData.preco || 0,
      preco_original: planData.preco_original,
      moeda: planData.moeda || 'BRL',
      periodo: planData.periodo || 'mensal',
      duracao_dias: planData.duracao_dias,
      features: (planData.features || []) as unknown as Json,
      checkout_url: planData.checkout_url,
      guru_product_id: planData.guru_product_id,
      guru_offer_id: planData.guru_offer_id,
      plan_level: planData.plan_level || 'awo',
      hierarquia: planData.hierarquia || 0,
      cta_text: planData.cta_text || 'Assinar',
      badge_text: planData.badge_text,
      variant: planData.variant || 'default',
      cor: planData.cor,
      ativo: planData.ativo ?? true,
      visivel_landing: planData.visivel_landing ?? true,
      visivel_subscription: planData.visivel_subscription ?? true,
      ordem: planData.ordem || 0,
    };

    const { data, error } = await supabase
      .from('subscription_plans')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    await loadPlans(true);
    return data;
  };

  const updatePlan = async (id: string, planData: Partial<SubscriptionPlan>) => {
    const updateData: Record<string, unknown> = {};
    
    // Only include fields that are provided
    if (planData.slug !== undefined) updateData.slug = planData.slug;
    if (planData.nome !== undefined) updateData.nome = planData.nome;
    if (planData.descricao !== undefined) updateData.descricao = planData.descricao;
    if (planData.preco !== undefined) updateData.preco = planData.preco;
    if (planData.preco_original !== undefined) updateData.preco_original = planData.preco_original;
    if (planData.moeda !== undefined) updateData.moeda = planData.moeda;
    if (planData.periodo !== undefined) updateData.periodo = planData.periodo;
    if (planData.duracao_dias !== undefined) updateData.duracao_dias = planData.duracao_dias;
    if (planData.features !== undefined) updateData.features = planData.features as unknown as Json;
    if (planData.checkout_url !== undefined) updateData.checkout_url = planData.checkout_url;
    if (planData.guru_product_id !== undefined) updateData.guru_product_id = planData.guru_product_id;
    if (planData.guru_offer_id !== undefined) updateData.guru_offer_id = planData.guru_offer_id;
    if (planData.plan_level !== undefined) updateData.plan_level = planData.plan_level;
    if (planData.hierarquia !== undefined) updateData.hierarquia = planData.hierarquia;
    if (planData.cta_text !== undefined) updateData.cta_text = planData.cta_text;
    if (planData.badge_text !== undefined) updateData.badge_text = planData.badge_text;
    if (planData.variant !== undefined) updateData.variant = planData.variant;
    if (planData.cor !== undefined) updateData.cor = planData.cor;
    if (planData.ativo !== undefined) updateData.ativo = planData.ativo;
    if (planData.visivel_landing !== undefined) updateData.visivel_landing = planData.visivel_landing;
    if (planData.visivel_subscription !== undefined) updateData.visivel_subscription = planData.visivel_subscription;
    if (planData.ordem !== undefined) updateData.ordem = planData.ordem;

    const { data, error } = await supabase
      .from('subscription_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await loadPlans(true);
    return data;
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await loadPlans(true);
  };

  const togglePlanActive = async (id: string, ativo: boolean) => {
    return updatePlan(id, { ativo });
  };

  return {
    plans,
    loading,
    error,
    loadPlans,
    getLandingPlans,
    getSubscriptionPlans,
    getPlanBySlug,
    getPlansByLevel,
    getCheckoutUrl,
    getPlanHierarchy,
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanActive,
    refresh: () => loadPlans(true)
  };
}
