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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating to free status");
      
      // Update subscription in database to free
      await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'free',
          plan_name: 'Gratuito',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          stripe_price_id: null,
          current_period_end: null,
        });

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

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No subscription found");
      
      await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'free',
          plan_name: 'Gratuito',
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          stripe_price_id: null,
          current_period_end: null,
        });

      return new Response(JSON.stringify({ 
        subscribed: false,
        status: 'free',
        plan_name: 'Gratuito'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const priceId = subscription.items.data[0].price.id;
    
    logStep("Processing subscription", { 
      subscriptionId: subscription.id,
      status: subscription.status,
      periodStart: subscription.current_period_start,
      periodEnd: subscription.current_period_end
    });
    
    // Determine plan name based on price ID
    let planName = 'Gratuito';
    if (priceId === 'price_1SUQd7Do1RHWW8lpaKCqKH8g') {
      planName = 'Premium';
    } else if (priceId === 'price_1SUQe8Do1RHWW8lpTManIdtD') {
      planName = 'Profissional';
    }

    // Safely convert timestamps to ISO strings
    let currentPeriodStart = null;
    let currentPeriodEnd = null;
    
    try {
      if (subscription.current_period_start && typeof subscription.current_period_start === 'number' && subscription.current_period_start > 0) {
        currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
        logStep("Converted period_start", { original: subscription.current_period_start, converted: currentPeriodStart });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logStep("Error converting period_start", { value: subscription.current_period_start, error: errorMessage });
    }
    
    try {
      if (subscription.current_period_end && typeof subscription.current_period_end === 'number' && subscription.current_period_end > 0) {
        currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        logStep("Converted period_end", { original: subscription.current_period_end, converted: currentPeriodEnd });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logStep("Error converting period_end", { value: subscription.current_period_end, error: errorMessage });
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

    logStep("Subscription data", subscriptionData);

    // Update subscription in database
    await supabaseClient
      .from('subscriptions')
      .upsert(subscriptionData);

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
