import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      logStep("WARNING: No webhook secret configured, skipping verification");
    }

    let event: Stripe.Event;
    
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { sessionId: session.id, customerId: session.customer });
        
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await updateSubscription(subscription, session.metadata?.user_id);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });
        await updateSubscription(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });
        
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if ('email' in customer && customer.email) {
          const { data: authData } = await supabaseClient.auth.admin.listUsers();
          const user = authData.users.find(u => u.email === customer.email);
          
          if (user) {
            await supabaseClient
              .from('subscriptions')
              .update({
                status: 'canceled',
                plan_name: 'Gratuito',
                stripe_subscription_id: null,
                stripe_price_id: null,
              })
              .eq('user_id', user.id);
            
            logStep("Subscription set to free", { userId: user.id });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function updateSubscription(
  subscription: Stripe.Subscription,
  userId?: string
) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (!('email' in customer) || !customer.email) {
      logStep("No email found for customer");
      return;
    }

    let targetUserId = userId;
    
    if (!targetUserId) {
      const { data: authData } = await supabaseClient.auth.admin.listUsers();
      const user = authData.users.find(u => u.email === customer.email);
      if (!user) {
        logStep("User not found", { email: customer.email });
        return;
      }
      targetUserId = user.id;
    }

    const priceId = subscription.items.data[0].price.id;
    
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
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logStep("Error converting period_start in webhook", { value: subscription.current_period_start, error: errorMessage });
    }
    
    try {
      if (subscription.current_period_end && typeof subscription.current_period_end === 'number' && subscription.current_period_end > 0) {
        currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logStep("Error converting period_end in webhook", { value: subscription.current_period_end, error: errorMessage });
    }

    const subscriptionData = {
      user_id: targetUserId,
      status: subscription.status,
      plan_name: planName,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
    };

    logStep("Subscription data to upsert", { 
      userId: targetUserId, 
      plan: planName,
      status: subscription.status 
    });

    // Check if subscription exists, then update or insert
    const { data: existingSubscription } = await supabaseClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (existingSubscription) {
      // Update existing subscription
      await supabaseClient
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', targetUserId);
      
      logStep("Updated existing subscription in database", { 
        userId: targetUserId, 
        plan: planName,
        status: subscription.status 
      });
    } else {
      // Insert new subscription
      await supabaseClient
        .from('subscriptions')
        .insert(subscriptionData);
      
      logStep("Inserted new subscription in database", { 
        userId: targetUserId, 
        plan: planName,
        status: subscription.status 
      });
    }
  } catch (error) {
    logStep("Error updating subscription", { error });
    throw error;
  }
}
