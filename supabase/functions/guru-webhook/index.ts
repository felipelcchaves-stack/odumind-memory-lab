import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-guru-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GURU-WEBHOOK] ${step}${detailsStr}`);
};

// Mapeamento de produtos GURU para planos do sistema
const GURU_PRODUCT_MAPPING: Record<string, string> = {
  'profissional': 'Awo',
  'professional': 'Awo',
  'familia': 'Egbe',
  'family': 'Egbe',
  'akapo': 'Awo',
  'awo': 'Awo',
  'egbe': 'Egbe',
  'premium': 'Awo',
};

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function mapGuruProductToPlan(productId: string, productName: string): string | null {
  if (GURU_PRODUCT_MAPPING[productId?.toLowerCase()]) {
    return GURU_PRODUCT_MAPPING[productId.toLowerCase()];
  }
  
  const nameLower = productName?.toLowerCase() || '';
  for (const [key, plan] of Object.entries(GURU_PRODUCT_MAPPING)) {
    if (nameLower.includes(key)) {
      return plan;
    }
  }
  
  return null; // Return null if not recognized
}

function isCancellationEvent(payload: any): boolean {
  if (payload.cancel_at_cycle_end === true) return true;
  if (payload.last_status === 'cancelled' || payload.last_status === 'canceled') return true;
  if (payload.cancelled_by || payload.canceled_by) return true;
  if (payload.subscription?.status === 'cancelled' || payload.subscription?.status === 'canceled') return true;
  if (payload.subscription?.status === 'inactive') return true;
  if (payload.status === 'cancelled' || payload.status === 'canceled') return true;
  if (payload.status === 'inactive') return true;
  
  return false;
}

// Fetch promo settings from database
async function getPromoSettings(supabaseAdmin: any): Promise<{
  enabled: boolean;
  name: string;
  durationDays: number;
  planMapping: string;
}> {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('key, value')
    .eq('category', 'promo');

  if (error) {
    logStep("Erro ao buscar configurações de promoção", { error: error.message });
    return {
      enabled: false,
      name: "Promoção",
      durationDays: 30,
      planMapping: "Awo",
    };
  }

  const settings: Record<string, string> = {};
  data?.forEach((s: any) => {
    settings[s.key] = s.value;
  });

  return {
    enabled: settings['promo_enabled'] === 'true',
    name: settings['promo_name'] || 'Promoção',
    durationDays: parseInt(settings['promo_duration_days'] || '30', 10),
    planMapping: settings['promo_plan_mapping'] || 'Awo',
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook recebido", { method: req.method });

    const payload = await req.json();
    logStep("Payload completo recebido", payload);

    const guruToken = payload.api_token;
    const expectedToken = Deno.env.get("GURU_API_TOKEN");
    
    if (!expectedToken) {
      logStep("ERRO: GURU_API_TOKEN não configurado no ambiente");
      return new Response(JSON.stringify({ error: "Configuração inválida" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!guruToken) {
      logStep("ERRO: api_token não encontrado no payload");
      return new Response(JSON.stringify({ error: "Token não fornecido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (guruToken !== expectedToken) {
      logStep("ERRO: Token inválido", { 
        received: guruToken?.substring(0, 10) + "...",
        expected: expectedToken?.substring(0, 10) + "..."
      });
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("Token validado com sucesso");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch promo settings
    const promoSettings = await getPromoSettings(supabaseAdmin);
    logStep("Configurações de promoção carregadas", promoSettings);

    const eventType = payload.webhook_type || payload.event || payload.type || payload.webhook_event;
    const buyerEmail = payload.contact?.email || payload.buyer?.email || payload.customer?.email || payload.email || payload.subscriber?.email;
    const buyerName = payload.contact?.name || payload.buyer?.name || payload.customer?.name || payload.name || payload.subscriber?.name || 'Usuário';
    const subscriptionId = payload.subscription?.id || payload.subscription_id || payload.id;
    const customerId = payload.contact?.id || payload.buyer?.id || payload.customer?.id || payload.customer_id;
    const productId = payload.product?.id || payload.product_id || payload.offer?.product_id;
    const productName = payload.product?.name || payload.product_name || payload.offer?.name || '';
    
    logStep("Verificando campos de cancelamento", {
      webhook_type: payload.webhook_type,
      event: payload.event,
      type: payload.type,
      cancel_at_cycle_end: payload.cancel_at_cycle_end,
      last_status: payload.last_status,
      cancelled_by: payload.cancelled_by,
      subscription_status: payload.subscription?.status,
      status: payload.status
    });
    
    if (!buyerEmail) {
      logStep("ERRO: Email não encontrado no payload", { payloadKeys: Object.keys(payload) });
      return new Response(JSON.stringify({ error: "Email não encontrado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Dados extraídos", { 
      eventType, 
      buyerEmail, 
      buyerName,
      subscriptionId,
      customerId,
      productId,
      productName
    });

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === buyerEmail);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      logStep("Usuário existente encontrado", { userId });
    } else {
      const tempPassword = generateRandomPassword();
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: buyerEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          nome: buyerName,
          created_via: 'guru_webhook'
        }
      });

      if (createError) {
        logStep("ERRO ao criar usuário", { error: createError.message });
        return new Response(JSON.stringify({ error: "Erro ao criar usuário" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      userId = newUser.user.id;
      isNewUser = true;
      logStep("Novo usuário criado", { userId, email: buyerEmail });

      await supabaseAdmin
        .from('profiles')
        .update({ nome: buyerName })
        .eq('user_id', userId);

      // Determine plan name for welcome email
      let emailPlanName = mapGuruProductToPlan(productId, productName);
      
      // If product not recognized but promo is enabled, use promo name
      if (!emailPlanName && promoSettings.enabled) {
        emailPlanName = promoSettings.name;
        logStep("Usando nome da promoção para email", { promoName: promoSettings.name });
      } else if (!emailPlanName) {
        emailPlanName = 'Awo';
      }

      // Send welcome email
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            email: buyerEmail,
            name: buyerName,
            password: tempPassword,
            planName: emailPlanName,
            isPromo: promoSettings.enabled && !mapGuruProductToPlan(productId, productName),
            promoDurationDays: promoSettings.durationDays,
          }),
        });

        if (emailResponse.ok) {
          logStep("E-mail de boas-vindas enviado com sucesso", { email: buyerEmail, planName: emailPlanName });
        } else {
          const emailError = await emailResponse.text();
          logStep("Erro ao enviar e-mail de boas-vindas", { error: emailError });
        }
      } catch (emailError) {
        logStep("Falha ao enviar e-mail de boas-vindas", { error: String(emailError) });
      }
    }

    // Determine plan and duration
    let planName = mapGuruProductToPlan(productId, productName);
    let durationDays = 30; // Default monthly

    // If product not recognized but promo is enabled, use promo settings
    if (!planName && promoSettings.enabled) {
      planName = promoSettings.planMapping;
      durationDays = promoSettings.durationDays;
      logStep("Produto não reconhecido, usando configuração de promoção", { 
        planName, 
        durationDays,
        promoName: promoSettings.name 
      });
    } else if (!planName) {
      planName = 'Awo'; // Default fallback
      logStep("Produto não reconhecido, usando plano padrão Awo");
    }

    logStep("Plano mapeado", { productId, productName, planName, durationDays });

    let subscriptionStatus = 'active';
    let shouldUpdateSubscription = true;

    const eventTypeLower = eventType?.toLowerCase() || '';

    switch (eventTypeLower) {
      case 'purchase_created':
      case 'purchase.created':
      case 'purchase_approved':
      case 'purchase.approved':
      case 'subscription_created':
      case 'subscription.created':
      case 'subscription_active':
      case 'subscription.active':
      case 'subscription_activated':
      case 'subscription.activated':
      case 'abandoned_cart_recovered':
      case 'sale_approved':
        subscriptionStatus = 'active';
        logStep("Processando ativação de assinatura", { eventType: eventTypeLower });
        break;

      case 'subscription_canceled':
      case 'subscription.canceled':
      case 'subscription_cancelled':
      case 'subscription.cancelled':
      case 'subscription_inactive':
      case 'subscription.inactive':
      case 'subscription_deactivated':
      case 'subscription.deactivated':
      case 'canceled':
      case 'cancelled':
        subscriptionStatus = 'canceled';
        planName = 'Gratuito';
        logStep("Processando CANCELAMENTO de assinatura", { eventType: eventTypeLower });
        break;

      case 'subscription_expired':
      case 'subscription.expired':
      case 'subscription_overdue':
      case 'subscription.overdue':
      case 'payment_failed':
      case 'payment.failed':
        subscriptionStatus = 'past_due';
        logStep("Processando assinatura vencida/atrasada", { eventType: eventTypeLower });
        break;

      case 'refund':
      case 'refund.created':
      case 'purchase_refunded':
      case 'purchase.refunded':
      case 'chargeback':
      case 'chargeback.created':
        subscriptionStatus = 'canceled';
        planName = 'Gratuito';
        logStep("Processando reembolso/chargeback", { eventType: eventTypeLower });
        break;

      default:
        if (isCancellationEvent(payload)) {
          subscriptionStatus = 'canceled';
          planName = 'Gratuito';
          logStep("Cancelamento detectado via campos do payload (fallback)", { eventType: eventTypeLower });
        } else {
          logStep("Evento não reconhecido, processando como ativação", { eventType: eventTypeLower });
          subscriptionStatus = 'active';
        }
    }

    if (subscriptionStatus === 'active' && isCancellationEvent(payload)) {
      subscriptionStatus = 'canceled';
      planName = 'Gratuito';
      logStep("CORREÇÃO: Cancelamento detectado via campos adicionais", {
        cancel_at_cycle_end: payload.cancel_at_cycle_end,
        last_status: payload.last_status
      });
    }

    logStep("Status final determinado", { 
      subscriptionStatus, 
      planName,
      eventType: eventTypeLower 
    });

    if (shouldUpdateSubscription) {
      const now = new Date();
      const periodEnd = new Date(now);
      
      if (subscriptionStatus !== 'canceled') {
        periodEnd.setDate(periodEnd.getDate() + durationDays);
      }

      const subscriptionData = {
        user_id: userId,
        status: subscriptionStatus,
        plan_name: planName,
        guru_subscription_id: subscriptionId?.toString() || null,
        guru_customer_id: customerId?.toString() || null,
        payment_gateway: 'guru',
        current_period_start: now.toISOString(),
        current_period_end: subscriptionStatus === 'canceled' ? now.toISOString() : periodEnd.toISOString(),
        updated_at: now.toISOString(),
      };

      logStep("Dados de assinatura a salvar", subscriptionData);

      const { error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'user_id'
        });

      if (subscriptionError) {
        logStep("ERRO ao atualizar assinatura", { error: subscriptionError.message });
        return new Response(JSON.stringify({ error: "Erro ao atualizar assinatura" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      logStep("Assinatura atualizada com sucesso", { 
        userId, 
        status: subscriptionStatus, 
        planName,
        durationDays,
        isNewUser
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Webhook processado com sucesso",
      user_id: userId,
      is_new_user: isNewUser,
      subscription_status: subscriptionStatus,
      plan_name: planName,
      duration_days: durationDays
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO no webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
