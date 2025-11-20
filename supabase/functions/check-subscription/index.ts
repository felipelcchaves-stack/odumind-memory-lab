import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Helper para verificar se usuário é membro de família ativa
const checkFamilyMembership = async (supabaseAdmin: any, userId: string) => {
  try {
    const { data: memberData, error } = await supabaseAdmin
      .from('family_members')
      .select(`
        family_group_id,
        family_groups (
          stripe_subscription_id,
          group_name
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !memberData) {
      return null;
    }

    return {
      family_group_id: memberData.family_group_id,
      stripe_subscription_id: memberData.family_groups?.stripe_subscription_id,
      group_name: memberData.family_groups?.group_name,
    };
  } catch (err) {
    console.error('[CHECK-FAMILY] Erro ao verificar família:', err);
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Validate token is not empty or "undefined" string
    if (!token || token === "undefined" || token === "null" || token.trim() === "") {
      logStep("ERROR: Invalid token", { token: token?.substring(0, 20) });
      return new Response(JSON.stringify({ 
        error: "Invalid authentication token",
        code: 401 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Cliente para validar usuário (usa ANON_KEY com token)
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    logStep("Validating token");
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError) {
      logStep("ERROR: Authentication failed", { error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) {
      logStep("ERROR: No user or email");
      throw new Error("User not authenticated or email not available");
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Cliente admin para operações no banco (usa SERVICE_ROLE_KEY)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, checking family membership");
      
      // Verificar se é membro de família antes de retornar 'free'
      const familyMembership = await checkFamilyMembership(supabaseAdmin, user.id);
      
      if (familyMembership && familyMembership.stripe_subscription_id) {
        logStep("User is family member", { 
          group: familyMembership.group_name,
          subscription_id: familyMembership.stripe_subscription_id 
        });
        
        // Buscar detalhes da subscription do grupo no Stripe
        try {
          const familySubscription = await stripe.subscriptions.retrieve(
            familyMembership.stripe_subscription_id
          );
          
          if (familySubscription.status === 'active' || familySubscription.status === 'trialing') {
            const planName = 'Premium (Família)';
            const subscriptionEnd = new Date(familySubscription.current_period_end * 1000).toISOString();
            
            // Atualizar/inserir na tabela subscriptions
            const { data: existingData } = await supabaseAdmin
              .from('subscriptions')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();

            if (existingData) {
              await supabaseAdmin
                .from('subscriptions')
                .update({
                  status: 'active',
                  plan_name: planName,
                  current_period_end: subscriptionEnd,
                })
                .eq('user_id', user.id);
            } else {
              await supabaseAdmin
                .from('subscriptions')
                .insert({
                  user_id: user.id,
                  status: 'active',
                  plan_name: planName,
                  current_period_end: subscriptionEnd,
                });
            }

            return new Response(JSON.stringify({
              subscribed: true,
              status: 'active',
              plan_name: planName,
              subscription_end: subscriptionEnd,
              is_family_member: true,
              family_group_name: familyMembership.group_name,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        } catch (stripeError) {
          console.error('[CHECK-FAMILY] Erro ao buscar subscription do grupo:', stripeError);
        }
      }
      
      logStep("No customer and not family member, updating to free status");
      
      // Update subscription in database to free - use update first, then insert if not found
      const { data: existingData } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingData) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'free',
            plan_name: 'Gratuito',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_end: null,
          })
          .eq('user_id', user.id);
      } else {
        await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: user.id,
            status: 'free',
            plan_name: 'Gratuito',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_end: null,
          });
      }

      return new Response(JSON.stringify({ 
        subscribed: false,
        status: 'free',
        plan_name: 'Gratuito'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions using list first
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No subscription found");
      
      const { data: existingData2 } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingData2) {
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'free',
            plan_name: 'Gratuito',
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_end: null,
          })
          .eq('user_id', user.id);

        if (updateError) {
          logStep("ERROR updating free subscription", { error: updateError });
        } else {
          logStep("Successfully updated to free subscription");
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: user.id,
            status: 'free',
            plan_name: 'Gratuito',
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_end: null,
          });

        if (insertError) {
          logStep("ERROR inserting free subscription", { error: insertError });
        } else {
          logStep("Successfully inserted free subscription");
        }
      }

      return new Response(JSON.stringify({ 
        subscribed: false,
        status: 'free',
        plan_name: 'Gratuito'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Retrieve full subscription details to ensure we get complete data
    logStep("Found subscription, retrieving full details", { subscriptionId: subscriptions.data[0].id });
    const subscription = await stripe.subscriptions.retrieve(subscriptions.data[0].id);
    
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const priceId = subscription.items.data[0].price.id;
    
    logStep("Processing subscription", { 
      subscriptionId: subscription.id,
      status: subscription.status,
      periodStart: subscription.current_period_start,
      periodEnd: subscription.current_period_end,
      priceId
    });
    
    // Determine plan name based on price ID
    let planName = 'Gratuito';
    if (priceId === 'price_1SUQd7Do1RHWW8lpaKCqKH8g') {
      planName = 'Premium';
    } else if (priceId === 'price_1SUQe8Do1RHWW8lpTManIdtD') {
      planName = 'Profissional';
    }

    // Convert timestamps to ISO strings
    let currentPeriodStart = null;
    let currentPeriodEnd = null;
    
    if (subscription.current_period_start) {
      currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
      logStep("Converted period_start", { original: subscription.current_period_start, converted: currentPeriodStart });
    }
    
    if (subscription.current_period_end) {
      currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Converted period_end", { original: subscription.current_period_end, converted: currentPeriodEnd });
    }

    const subscriptionData = {
      user_id: user.id,
      status: subscription.status,
      plan_name: planName,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
    };

    logStep("Subscription data to upsert", subscriptionData);

    // Check if subscription exists, then update or insert
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingSubscription) {
      // Update existing subscription
      const { data: updatedData, error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', user.id)
        .select();

      if (updateError) {
        logStep("ERROR updating subscription", { error: updateError });
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }
      
      logStep("Successfully updated subscription", { data: updatedData });
    } else {
      // Insert new subscription
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert(subscriptionData)
        .select();

      if (insertError) {
        logStep("ERROR inserting subscription", { error: insertError });
        throw new Error(`Failed to insert subscription: ${insertError.message}`);
      }
      
      logStep("Successfully inserted subscription", { data: insertedData });
    }

    return new Response(JSON.stringify({
      subscribed: isActive,
      status: subscription.status,
      plan_name: planName,
      current_period_end: subscriptionData.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
