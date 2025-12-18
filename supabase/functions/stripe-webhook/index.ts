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

// Função para verificar se a assinatura foi criada recentemente
async function wasRecentlyCreated(
  supabase: any,
  userId: string,
  minutesThreshold: number = 30
): Promise<{ isRecent: boolean; createdAt: string | null; currentStatus: string | null }> {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('created_at, status, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !subscription) {
      logStep("Nenhuma assinatura encontrada para verificação de recência", { userId, error });
      return { isRecent: false, createdAt: null, currentStatus: null };
    }

    const createdAt = new Date(subscription.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    logStep("Verificação de recência da assinatura", {
      userId,
      createdAt: subscription.created_at,
      updatedAt: subscription.updated_at,
      currentStatus: subscription.status,
      diffMinutes: Math.round(diffMinutes),
      threshold: minutesThreshold,
      isRecent: diffMinutes < minutesThreshold
    });

    return {
      isRecent: diffMinutes < minutesThreshold,
      createdAt: subscription.created_at,
      currentStatus: subscription.status
    };
  } catch (error) {
    logStep("Erro ao verificar recência da assinatura", { userId, error });
    return { isRecent: false, createdAt: null, currentStatus: null };
  }
}

// Função para verificar se é um evento de cancelamento legítimo
function isCancellationEvent(subscription: Stripe.Subscription): boolean {
  // Verifica se a assinatura realmente foi cancelada
  // Diferencia entre cancelamento real e eventos de atualização
  const isCanceled = subscription.status === 'canceled';
  const canceledAt = subscription.canceled_at;
  
  logStep("Verificação de evento de cancelamento", {
    status: subscription.status,
    isCanceled,
    canceledAt,
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });
  
  return isCanceled && canceledAt !== null;
}

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
        logStep("Subscription deleted event received", { 
          subscriptionId: subscription.id,
          status: subscription.status,
          canceledAt: subscription.canceled_at,
          createdAt: subscription.created
        });
        
        // Verificar se é realmente um evento de cancelamento
        if (!isCancellationEvent(subscription)) {
          logStep("⚠️ Evento de cancelamento ignorado - não é um cancelamento real", {
            subscriptionId: subscription.id,
            status: subscription.status
          });
          break;
        }
        
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if ('email' in customer && customer.email) {
          const { data: authData } = await supabaseClient.auth.admin.listUsers();
          const user = authData.users.find(u => u.email === customer.email);
          
          if (user) {
            // PROTEÇÃO: Verificar se assinatura foi criada recentemente
            const { isRecent, createdAt, currentStatus } = await wasRecentlyCreated(
              supabaseClient, 
              user.id, 
              30 // 30 minutos
            );
            
            // Se foi criada há menos de 30 minutos E tem status ativo, ignorar
            if (isRecent && currentStatus && ['active', 'trialing'].includes(currentStatus)) {
              logStep("⚠️ PROTEÇÃO ATIVADA: Ignorando cancelamento de assinatura recente", {
                userId: user.id,
                subscriptionId: subscription.id,
                createdAt,
                currentStatus,
                message: "Assinatura criada há menos de 30 minutos - evento de cancelamento ignorado"
              });
              
              // Retornar sucesso para o Stripe não reenviar
              return new Response(JSON.stringify({ 
                received: true, 
                warning: "Cancelamento ignorado - assinatura muito recente",
                details: {
                  userId: user.id,
                  createdAt,
                  currentStatus
                }
              }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }
            
            // Cancelamento legítimo - processar normalmente
            logStep("Processando cancelamento legítimo", {
              userId: user.id,
              createdAt,
              currentStatus
            });
            
            await supabaseClient
              .from('subscriptions')
              .update({
                status: 'canceled',
                plan_name: 'Gratuito',
                stripe_subscription_id: null,
                stripe_price_id: null,
              })
              .eq('user_id', user.id);
            
            logStep("✅ Subscription cancelada e definida como gratuita", { userId: user.id });
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
    } else if (priceId === 'price_1SVYC4Do1RHWW8lprTS45LGC') {
      planName = 'Premium'; // Annual
    } else if (priceId === 'price_1SUQe8Do1RHWW8lpTManIdtD') {
      planName = 'Profissional';
    } else if (priceId === 'price_1SVYDGDo1RHWW8lpDluZOrfK') {
      planName = 'Profissional'; // Annual
    } else if (priceId === 'price_1SVYDfDo1RHWW8lpGhLjNjoV') {
      planName = 'Família';
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

    // If family plan, create family group automatically
    if (planName === 'Família' || planName === 'Egbe') {
      logStep("Detected family plan, checking for group...", { userId: targetUserId });
      
      const { data: existingGroup } = await supabaseClient
        .from('family_groups')
        .select('id')
        .eq('owner_user_id', targetUserId)
        .maybeSingle();
      
      if (!existingGroup) {
        logStep("Creating family group...", { userId: targetUserId });
        
        const { data: newGroup, error: groupError } = await supabaseClient
          .from('family_groups')
          .insert({
            owner_user_id: targetUserId,
            stripe_subscription_id: subscription.id,
            group_name: 'Minha Família',
            max_members: 5,
          })
          .select()
          .single();
        
        if (groupError) {
          logStep("Error creating family group", { error: groupError });
        } else if (newGroup) {
          logStep("Family group created", { groupId: newGroup.id });
          
          // Add owner as first member
          const { error: memberError } = await supabaseClient
            .from('family_members')
            .insert({
              family_group_id: newGroup.id,
              user_id: targetUserId,
              status: 'active',
              role: 'owner',
              joined_at: new Date().toISOString(),
            });
          
          if (memberError) {
            logStep("Error adding owner as member", { error: memberError });
          } else {
            logStep("Owner added to family group successfully");
          }
        }
      } else {
        logStep("Family group already exists", { groupId: existingGroup.id });
      }
    }
  } catch (error) {
    logStep("Error updating subscription", { error });
    throw error;
  }
}
