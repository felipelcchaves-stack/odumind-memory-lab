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

// Mapping de planos para price IDs
const PRICE_IDS = {
  'Premium': {
    monthly: 'price_1QqvTYLHoh71qD8NRLFwQ0W5',
    annual: 'price_1QqvU8LHoh71qD8NnvwZGQkC'
  },
  'Profissional': {
    monthly: 'price_1QqvUWLHoh71qD8Nu5Rt06dT',
    annual: 'price_1QqvV7LHoh71qD8NCMh1WY3k'
  },
  'Família': {
    monthly: 'price_1Qs8a7LHoh71qD8N9xRrfF9k',
    annual: 'price_1Qs8bELHoh71qD8Ng9cCHQfH'
  }
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
    const { userId, newPlan, billingCycle, reason } = await req.json();
    
    if (!userId || !newPlan || !billingCycle) {
      throw new Error("Missing required fields: userId, newPlan, billingCycle");
    }
    
    if (!['monthly', 'annual'].includes(billingCycle)) {
      throw new Error("Invalid billing cycle. Must be 'monthly' or 'annual'");
    }
    
    logStep("Request data", { userId, newPlan, billingCycle, reason });

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

    // Criar nova assinatura no Stripe (se não for downgrade para Free)
    if (newPlan !== 'Gratuito' && newPlan !== 'free') {
      const priceId = PRICE_IDS[newPlan as keyof typeof PRICE_IDS]?.[billingCycle as 'monthly' | 'annual'];
      
      if (!priceId) {
        throw new Error(`Invalid plan: ${newPlan}. Available plans: Premium, Profissional, Família`);
      }

      logStep("Creating new Stripe subscription", { priceId });

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

      // Atualizar tabela subscriptions
      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: newStripeSubId,
          stripe_price_id: priceId,
          plan_name: newPlan,
          status: newSubscription.status,
          current_period_start: new Date(newSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(newSubscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: false
        });

      if (updateError) {
        logStep("Error updating subscriptions table", { error: updateError });
        throw updateError;
      }
      logStep("Updated subscriptions table");
    } else {
      // Downgrade para Free
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
