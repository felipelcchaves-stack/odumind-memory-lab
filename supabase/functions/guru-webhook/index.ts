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
  // Adicione aqui os IDs dos produtos GURU e seus planos correspondentes
  // Exemplo: 'prod_guru_premium_mensal': 'Premium',
  'premium': 'Premium',
  'akapo': 'Akapo',
  'awo': 'Awo',
  'egbe': 'Egbe',
  'familia': 'Egbe',
  'profissional': 'Awo',
};

// Função para gerar senha aleatória
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Função para mapear produto GURU para plano do sistema
function mapGuruProductToPlan(productId: string, productName: string): string {
  // Primeiro tenta pelo ID
  if (GURU_PRODUCT_MAPPING[productId?.toLowerCase()]) {
    return GURU_PRODUCT_MAPPING[productId.toLowerCase()];
  }
  
  // Depois tenta pelo nome do produto
  const nameLower = productName?.toLowerCase() || '';
  for (const [key, plan] of Object.entries(GURU_PRODUCT_MAPPING)) {
    if (nameLower.includes(key)) {
      return plan;
    }
  }
  
  // Padrão
  return 'Premium';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook recebido");

    // Validar token da GURU
    const guruToken = req.headers.get("x-guru-token") || req.headers.get("authorization");
    const expectedToken = Deno.env.get("GURU_API_TOKEN");
    
    if (!expectedToken) {
      logStep("ERRO: GURU_API_TOKEN não configurado");
      return new Response(JSON.stringify({ error: "Configuração inválida" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // A GURU pode enviar o token de diferentes formas
    const tokenToValidate = guruToken?.replace("Bearer ", "").trim();
    if (tokenToValidate !== expectedToken) {
      logStep("ERRO: Token inválido", { received: tokenToValidate?.substring(0, 10) + "..." });
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("Token validado com sucesso");

    // Parse do payload
    const payload = await req.json();
    logStep("Payload recebido", { 
      event: payload.event || payload.type,
      email: payload.buyer?.email || payload.customer?.email || payload.email
    });

    // Inicializar Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Extrair dados do webhook (a estrutura pode variar conforme o tipo de evento)
    const eventType = payload.event || payload.type || payload.webhook_event;
    const buyerEmail = payload.buyer?.email || payload.customer?.email || payload.email || payload.subscriber?.email;
    const buyerName = payload.buyer?.name || payload.customer?.name || payload.name || payload.subscriber?.name || 'Usuário';
    const subscriptionId = payload.subscription?.id || payload.subscription_id || payload.id;
    const customerId = payload.buyer?.id || payload.customer?.id || payload.customer_id;
    const productId = payload.product?.id || payload.product_id || payload.offer?.product_id;
    const productName = payload.product?.name || payload.product_name || payload.offer?.name || '';
    
    if (!buyerEmail) {
      logStep("ERRO: Email não encontrado no payload");
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

    // Verificar se usuário já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === buyerEmail);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      logStep("Usuário existente encontrado", { userId });
    } else {
      // Criar novo usuário
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

      // Enviar email de boas-vindas com senha temporária
      // Nota: O Supabase enviará automaticamente um email de confirmação
      // Você pode personalizar isso no painel do Supabase ou criar um template customizado
      
      // Criar perfil para o novo usuário (o trigger handle_new_user já faz isso,
      // mas vamos garantir que o nome está correto)
      await supabaseAdmin
        .from('profiles')
        .update({ nome: buyerName })
        .eq('user_id', userId);
    }

    // Determinar o plano baseado no produto
    const planName = mapGuruProductToPlan(productId, productName);
    logStep("Plano mapeado", { productId, productName, planName });

    // Processar evento
    let subscriptionStatus = 'active';
    let shouldUpdateSubscription = true;

    switch (eventType?.toLowerCase()) {
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
        subscriptionStatus = 'active';
        logStep("Processando ativação de assinatura");
        break;

      case 'subscription_canceled':
      case 'subscription.canceled':
      case 'subscription_cancelled':
      case 'subscription.cancelled':
      case 'subscription_inactive':
      case 'subscription.inactive':
        subscriptionStatus = 'canceled';
        logStep("Processando cancelamento de assinatura");
        break;

      case 'subscription_expired':
      case 'subscription.expired':
      case 'subscription_overdue':
      case 'subscription.overdue':
        subscriptionStatus = 'past_due';
        logStep("Processando assinatura vencida/atrasada");
        break;

      case 'refund':
      case 'refund.created':
      case 'purchase_refunded':
      case 'purchase.refunded':
        subscriptionStatus = 'canceled';
        logStep("Processando reembolso");
        break;

      default:
        logStep("Evento não processado", { eventType });
        shouldUpdateSubscription = false;
    }

    if (shouldUpdateSubscription) {
      // Calcular período (30 dias para mensal, ajustar conforme necessário)
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      // Atualizar ou criar assinatura
      const { error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          status: subscriptionStatus,
          plan_name: planName,
          guru_subscription_id: subscriptionId?.toString() || null,
          guru_customer_id: customerId?.toString() || null,
          payment_gateway: 'guru',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        }, {
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
        isNewUser
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Webhook processado com sucesso",
      user_id: userId,
      is_new_user: isNewUser,
      subscription_status: subscriptionStatus,
      plan_name: planName
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
