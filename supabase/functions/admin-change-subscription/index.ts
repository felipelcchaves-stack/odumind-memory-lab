import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-CHANGE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Mapping de planos para price IDs (valores corretos do Stripe)
const PRICE_IDS = {
  'Premium': {
    monthly: 'price_1SUQd7Do1RHWW8lpaKCqKH8g',  // R$ 49,90/mês
    annual: 'price_1SVYC4Do1RHWW8lprTS45LGC'   // R$ 499,90/ano
  },
  'Akapo': {
    monthly: 'price_1SUQd7Do1RHWW8lpaKCqKH8g',  // R$ 49,90/mês
    annual: 'price_1SVYC4Do1RHWW8lprTS45LGC'   // R$ 499,90/ano
  },
  'Profissional': {
    monthly: 'price_1SUQe8Do1RHWW8lpTManIdtD',  // R$ 99,90/mês
    annual: 'price_1SVYDGDo1RHWW8lpDluZOrfK'   // R$ 999,90/ano
  },
  'Awo': {
    monthly: 'price_1SUQe8Do1RHWW8lpTManIdtD',  // R$ 99,90/mês
    annual: 'price_1SVYDGDo1RHWW8lpDluZOrfK'   // R$ 999,90/ano
  },
  'Família': {
    monthly: 'price_1SVYDfDo1RHWW8lpGhLjNjoV',  // R$ 129,90/mês
    annual: null  // Não tem plano anual ainda
  },
  'Egbe': {
    monthly: 'price_1SVYDfDo1RHWW8lpGhLjNjoV',  // R$ 129,90/mês (Família)
    annual: null  // Não tem plano anual ainda
  }
};

// Aliases de planos (nomes alternativos que mapeiam para nomes canônicos)
const PLAN_ALIASES: Record<string, string> = {
  'Egbe': 'Família',
  'Akapo': 'Premium',
  'Awo': 'Profissional'
};

// Helper para normalizar nome do plano
const normalizePlanName = (plan: string): string => {
  const normalized = PLAN_ALIASES[plan] || plan;
  logStep("Plan name normalized", { original: plan, normalized });
  return normalized;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Autenticar admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !adminUser) throw new Error("Authentication failed");
    logStep("Admin authenticated", { adminId: adminUser.id });

    // Verificar se é admin
    const { data: isAdmin } = await supabaseClient.rpc('has_admin_role', { _user_id: adminUser.id });
    if (!isAdmin) throw new Error("User is not an admin");
    logStep("Admin role verified");

    // Obter dados da requisição
    const { userId, newPlan, billingCycle, reason, grantComplimentary } = await req.json();
    
    if (!userId || !newPlan || !billingCycle) {
      throw new Error("Missing required fields: userId, newPlan, billingCycle");
    }
    
    if (!['monthly', 'annual'].includes(billingCycle)) {
      throw new Error("Invalid billing cycle. Must be 'monthly' or 'annual'");
    }
    
    logStep("Request data", { userId, newPlan, billingCycle, reason, grantComplimentary });

    // Buscar email do usuário
    const { data: { user: targetUser }, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    if (userError || !targetUser?.email) throw new Error("User not found or no email");
    logStep("Target user found", { email: targetUser.email });

    // Buscar assinatura atual
    const { data: currentSub, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (subError) {
      logStep("No current subscription found, will create new one");
    } else {
      logStep("Current subscription", { plan: currentSub.plan_name, status: currentSub.status });
    }

    // Inicializar Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Buscar ou criar customer no Stripe
    const customers = await stripe.customers.list({ email: targetUser.email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      const newCustomer = await stripe.customers.create({
        email: targetUser.email,
        metadata: { supabase_user_id: userId }
      });
      customerId = newCustomer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    let oldStripeSubId = currentSub?.stripe_subscription_id || null;
    let newStripeSubId: string | null = null;
    let stripeResponse: any = {};

    // Cancelar assinatura antiga se existir
    if (oldStripeSubId) {
      try {
        const canceledSub = await stripe.subscriptions.cancel(oldStripeSubId);
        logStep("Canceled old subscription", { subscriptionId: oldStripeSubId });
        stripeResponse.canceledSubscription = {
          id: canceledSub.id,
          status: canceledSub.status,
          canceledAt: canceledSub.canceled_at
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep("Error canceling old subscription", { error: errorMessage });
        stripeResponse.cancelError = errorMessage;
      }
    }

    // Criar nova assinatura (se não for downgrade para Free)
    if (newPlan !== 'Gratuito' && newPlan !== 'free') {
      const normalizedPlan = normalizePlanName(newPlan);
      const priceId = PRICE_IDS[normalizedPlan as keyof typeof PRICE_IDS]?.[billingCycle as 'monthly' | 'annual'];
      
      if (!priceId) {
        logStep("ERROR: Invalid plan configuration", { 
          originalPlan: newPlan, 
          normalizedPlan, 
          billingCycle,
          availablePlans: Object.keys(PRICE_IDS)
        });
        throw new Error(`Invalid plan or billing cycle: ${newPlan} (${billingCycle}). Available plans: Premium/Akapo, Profissional/Awo, Família/Egbe`);
      }
      
      logStep("Price ID found for plan", { normalizedPlan, billingCycle, priceId });

      // Verificar se o customer tem payment method
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
        limit: 1
      });

      const hasPaymentMethod = paymentMethods.data.length > 0;
      logStep("Payment method check", { hasPaymentMethod, customerId });

      // Se grantComplimentary=true OU não tem payment method: criar subscription complimentary
      if (grantComplimentary || !hasPaymentMethod) {
        logStep("Creating complimentary subscription (database only)", { reason: grantComplimentary ? 'admin_grant' : 'no_payment_method' });
        
        // Não criar no Stripe, apenas no banco de dados com status 'active' e período de 1 ano
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        logStep("Attempting upsert to subscriptions table", { 
          userId, 
          planName: normalizedPlan, 
          type: 'complimentary' 
        });

        const { error: updateError } = await supabaseClient
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: null, // NULL indica que é complimentary
            stripe_price_id: priceId,
            plan_name: normalizedPlan,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: oneYearFromNow.toISOString(),
            cancel_at_period_end: false
          }, {
            onConflict: 'user_id'
          });

        if (updateError) throw updateError;
        
        logStep("Complimentary subscription created", { 
          plan: normalizedPlan,
          validUntil: oneYearFromNow,
          daysGranted: 365 
        });
        stripeResponse.complimentaryGrant = {
          granted: true,
          validUntil: oneYearFromNow.toISOString(),
          reason: grantComplimentary ? 'Acesso administrativo concedido' : 'Customer sem método de pagamento - acesso temporário'
        };

      } else {
        // Customer tem payment method: criar subscription normal no Stripe
        logStep("Creating paid Stripe subscription", { priceId });

        const newSubscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          metadata: {
            supabase_user_id: userId,
            changed_by_admin: adminUser.id,
            billing_cycle: billingCycle
          }
        });

        newStripeSubId = newSubscription.id;
        logStep("Created new subscription", { subscriptionId: newStripeSubId });

        stripeResponse.newSubscription = {
          id: newSubscription.id,
          status: newSubscription.status,
          currentPeriodStart: newSubscription.current_period_start,
          currentPeriodEnd: newSubscription.current_period_end,
          priceId: priceId
        };

        logStep("Attempting upsert to subscriptions table", { 
          userId, 
          planName: normalizedPlan, 
          stripeSubscriptionId: newStripeSubId,
          type: 'paid' 
        });

        // Atualizar tabela subscriptions
        const { error: updateError } = await supabaseClient
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: newStripeSubId,
            stripe_price_id: priceId,
            plan_name: normalizedPlan,
            status: newSubscription.status,
            current_period_start: new Date(newSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(newSubscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: false
          }, {
            onConflict: 'user_id'
          });

        if (updateError) throw updateError;
        logStep("Updated subscriptions table with normalized plan name", { plan: normalizedPlan });
      }
    } else {
      // Downgrade para Free
      logStep("Attempting upsert to subscriptions table", { 
        userId, 
        planName: 'Gratuito', 
        type: 'downgrade' 
      });

      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          stripe_price_id: null,
          plan_name: 'Gratuito',
          status: 'free',
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;
      logStep("Downgraded to free plan");
    }

    // Registrar na tabela de auditoria
    const { error: auditError } = await supabaseClient
      .from('subscription_changes')
      .insert({
        user_id: userId,
        changed_by: adminUser.id,
        old_plan: currentSub?.plan_name || 'Gratuito',
        new_plan: newPlan,
        old_stripe_subscription_id: oldStripeSubId,
        new_stripe_subscription_id: newStripeSubId,
        billing_cycle: billingCycle,
        reason: reason || null,
        stripe_response: stripeResponse
      });

    if (auditError) {
      logStep("Error creating audit log", { error: auditError });
      // Não falhar por causa de erro de auditoria
    } else {
      logStep("Audit log created");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Assinatura alterada de ${currentSub?.plan_name || 'Gratuito'} para ${newPlan}`,
        oldPlan: currentSub?.plan_name || 'Gratuito',
        newPlan: newPlan,
        billingCycle: billingCycle,
        stripeCustomerId: customerId,
        oldStripeSubscriptionId: oldStripeSubId,
        newStripeSubscriptionId: newStripeSubId,
        stripeResponse: stripeResponse
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    let errorMessage: string;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      // PostgrestError do Supabase
      errorMessage = String(error.message);
    } else if (error && typeof error === 'object' && 'error' in error) {
      // Alguns erros do Supabase usam a propriedade 'error'
      errorMessage = String((error as any).error);
    } else {
      errorMessage = JSON.stringify(error);
    }
    
    logStep("ERROR", { 
      message: errorMessage,
      errorType: error?.constructor?.name,
      fullError: error 
    });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: error
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
