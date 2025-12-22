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

// Mapeamento estático de fallback (usado quando não há match no banco)
const GURU_PRODUCT_MAPPING_FALLBACK: Record<string, string> = {
  'profissional': 'Awo',
  'professional': 'Awo',
  'familia': 'Egbe',
  'family': 'Egbe',
  'akapo': 'Awo',
  'awo': 'Awo',
  'egbe': 'Egbe',
  'premium': 'Awo',
};

// Interface para planos do banco
interface PlanMapping {
  plan_level: string;
  guru_product_id: string | null;
  guru_offer_id: string | null;
  nome: string;
}

// Busca mapeamento de planos dinamicamente do banco de dados
async function getPlansFromDatabase(supabaseAdmin: any): Promise<Map<string, string>> {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('plan_level, guru_product_id, guru_offer_id, nome')
      .eq('ativo', true);
      
    if (error || !plans) {
      logStep("Erro ao buscar planos do banco", { error: error?.message });
      return new Map();
    }
    
    const mapping = new Map<string, string>();
    
    for (const plan of plans) {
      // Mapear por guru_product_id (exato)
      if (plan.guru_product_id && plan.guru_product_id.trim() !== '') {
        mapping.set(plan.guru_product_id.toLowerCase().trim(), plan.plan_level);
        logStep("Mapeamento adicionado por guru_product_id", { 
          guru_product_id: plan.guru_product_id, 
          plan_level: plan.plan_level 
        });
      }
      // Mapear por guru_offer_id (exato)
      if (plan.guru_offer_id && plan.guru_offer_id.trim() !== '') {
        mapping.set(plan.guru_offer_id.toLowerCase().trim(), plan.plan_level);
        logStep("Mapeamento adicionado por guru_offer_id", { 
          guru_offer_id: plan.guru_offer_id, 
          plan_level: plan.plan_level 
        });
      }
    }
    
    logStep("Mapeamento de planos carregado do banco", { 
      totalPlanos: plans.length,
      mappingSize: mapping.size,
      mappings: Array.from(mapping.entries())
    });
    
    return mapping;
  } catch (err) {
    logStep("Exceção ao buscar planos do banco", { error: String(err) });
    return new Map();
  }
}

// Converte plan_level para nome do plano
const PLAN_LEVEL_TO_NAME: Record<string, string> = {
  'gratuito': 'Gratuito',
  'awo': 'Awo',
  'egbe': 'Egbe',
};

function mapGuruProductToPlan(
  productId: string, 
  productName: string,
  dbMapping: Map<string, string>
): string | null {
  const productIdLower = productId?.toLowerCase()?.trim() || '';
  const productNameLower = productName?.toLowerCase()?.trim() || '';
  
  logStep("mapGuruProductToPlan - Iniciando busca", { 
    productId: productIdLower, 
    productName: productNameLower,
    dbMappingSize: dbMapping.size
  });
  
  // 1. Verificar pelo guru_product_id exato no banco
  if (productIdLower && dbMapping.has(productIdLower)) {
    const planLevel = dbMapping.get(productIdLower)!;
    const planName = PLAN_LEVEL_TO_NAME[planLevel] || planLevel;
    logStep("Match encontrado: guru_product_id exato no banco", { productId: productIdLower, planLevel, planName });
    return planName;
  }
  
  // 2. Verificar pelo productName exato no banco (pode ser guru_offer_id)
  if (productNameLower && dbMapping.has(productNameLower)) {
    const planLevel = dbMapping.get(productNameLower)!;
    const planName = PLAN_LEVEL_TO_NAME[planLevel] || planLevel;
    logStep("Match encontrado: productName exato no banco", { productName: productNameLower, planLevel, planName });
    return planName;
  }
  
  // 3. Verificar se productId ou productName contém algum ID do banco
  for (const [key, planLevel] of dbMapping.entries()) {
    if ((productIdLower && productIdLower.includes(key)) || 
        (productNameLower && productNameLower.includes(key))) {
      const planName = PLAN_LEVEL_TO_NAME[planLevel] || planLevel;
      logStep("Match encontrado: produto contém ID do banco", { key, planLevel, planName });
      return planName;
    }
    // Também verificar se o key contém o productId (caso o ID seja parcial)
    if (productIdLower && key.includes(productIdLower) && productIdLower.length > 3) {
      const planName = PLAN_LEVEL_TO_NAME[planLevel] || planLevel;
      logStep("Match encontrado: ID do banco contém productId", { key, productId: productIdLower, planLevel, planName });
      return planName;
    }
  }
  
  // 4. Fallback: mapeamento estático por palavras-chave
  if (GURU_PRODUCT_MAPPING_FALLBACK[productIdLower]) {
    logStep("Match encontrado: mapeamento estático por productId", { productId: productIdLower });
    return GURU_PRODUCT_MAPPING_FALLBACK[productIdLower];
  }
  
  // 5. Verificar se productName contém palavras-chave do mapeamento estático
  for (const [key, plan] of Object.entries(GURU_PRODUCT_MAPPING_FALLBACK)) {
    if (productNameLower.includes(key)) {
      logStep("Match encontrado: productName contém palavra-chave", { key, plan });
      return plan;
    }
  }
  
  logStep("Nenhum match encontrado para produto", { productId, productName });
  return null; // Return null if not recognized
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function isCancellationEvent(payload: any): boolean {
  // Check explicit cancellation flags
  if (payload.cancel_at_cycle_end === true || payload.cancel_at_cycle_end === 1) return true;
  if (payload.last_status === 'cancelled' || payload.last_status === 'canceled') return true;
  
  // CORREÇÃO: Verificar se cancelled_by tem valores REAIS (não apenas se existe)
  // O Guru sempre envia cancelled_by: {} vazio, que é truthy em JS
  const cancelledBy = payload.cancelled_by || payload.canceled_by;
  if (cancelledBy && typeof cancelledBy === 'object') {
    // Só considerar cancelamento se tiver email, nome ou data preenchidos
    const hasEmail = cancelledBy.email && String(cancelledBy.email).trim() !== '';
    const hasName = cancelledBy.name && String(cancelledBy.name).trim() !== '';
    const hasDate = cancelledBy.date && String(cancelledBy.date).trim() !== '';
    
    if (hasEmail || hasName || hasDate) {
      logStep("Cancelamento detectado via cancelled_by com dados válidos", { cancelledBy });
      return true;
    }
    // Se cancelled_by existe mas está vazio, NÃO é cancelamento
    logStep("cancelled_by presente mas vazio - ignorando como cancelamento", { cancelledBy });
  }
  
  if (payload.subscription?.status === 'cancelled' || payload.subscription?.status === 'canceled') return true;
  if (payload.subscription?.status === 'inactive') return true;
  if (payload.status === 'cancelled' || payload.status === 'canceled') return true;
  if (payload.status === 'inactive') return true;
  
  return false;
}

// Normaliza string removendo espaços, acentos e caracteres especiais para matching
function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, ''); // Remove tudo que não é letra ou número
}

// Fetch promo settings from database
async function getPromoSettings(supabaseAdmin: any): Promise<{
  enabled: boolean;
  name: string;
  durationDays: number;
  planMapping: string;
  guruProductId: string;
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
      guruProductId: "",
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
    guruProductId: settings['promo_guru_product_id'] || '',
  };
}

// Check if the product matches the promo configuration - IMPROVED MATCHING
function isPromoProduct(productId: string, productName: string, promoGuruProductId: string): boolean {
  if (!promoGuruProductId) return false;
  
  // Normaliza todas as strings para comparação
  const promoNormalized = normalizeForMatching(promoGuruProductId);
  const productIdNormalized = normalizeForMatching(productId || '');
  const productNameNormalized = normalizeForMatching(productName || '');
  
  // Log detalhado para debug
  logStep("Verificando match de produto promo", {
    promoOriginal: promoGuruProductId,
    promoNormalized,
    productNameOriginal: productName,
    productNameNormalized,
    productIdOriginal: productId,
    productIdNormalized
  });
  
  // Check 1: Match exato normalizado
  if (productIdNormalized === promoNormalized || productNameNormalized === promoNormalized) {
    logStep("Match encontrado: exato normalizado");
    return true;
  }
  
  // Check 2: Um contém o outro (normalizado)
  if (productIdNormalized.includes(promoNormalized) || productNameNormalized.includes(promoNormalized)) {
    logStep("Match encontrado: produto contém promo ID");
    return true;
  }
  
  if (promoNormalized.includes(productIdNormalized) && productIdNormalized.length > 3) {
    logStep("Match encontrado: promo ID contém produto ID");
    return true;
  }
  
  if (promoNormalized.includes(productNameNormalized) && productNameNormalized.length > 3) {
    logStep("Match encontrado: promo ID contém nome do produto");
    return true;
  }
  
  // Check 3: Verifica se todas as palavras do promoId estão no productName
  const promoWords = promoGuruProductId.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const productNameLower = (productName || '').toLowerCase();
  
  const allWordsMatch = promoWords.every(word => {
    const wordNormalized = normalizeForMatching(word);
    return productNameNormalized.includes(wordNormalized) || productNameLower.includes(word);
  });
  
  if (allWordsMatch && promoWords.length > 0) {
    logStep("Match encontrado: todas as palavras do promo ID estão no nome do produto", { promoWords });
    return true;
  }
  
  logStep("Nenhum match encontrado");
  return false;
}

// Check if subscription was recently created (protection against unexpected cancellations)
async function wasRecentlyCreated(supabaseAdmin: any, userId: string, minutesThreshold: number = 30): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('created_at, updated_at, status')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  const createdAt = new Date(data.created_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
  
  // If subscription was created within threshold and is active, it's "recently created"
  const isRecent = diffMinutes <= minutesThreshold && data.status === 'active';
  
  if (isRecent) {
    logStep("⚠️ Assinatura foi criada recentemente", {
      createdAt: data.created_at,
      diffMinutes: Math.round(diffMinutes),
      currentStatus: data.status
    });
  }
  
  return isRecent;
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

    // Carregar mapeamento dinâmico de planos do banco
    const dbPlanMapping = await getPlansFromDatabase(supabaseAdmin);
    logStep("Mapeamento dinâmico de planos carregado", { size: dbPlanMapping.size });

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
      let emailPlanName = mapGuruProductToPlan(productId, productName, dbPlanMapping);
      let emailIsPromo = false;
      let emailPromoDuration = promoSettings.durationDays;
      
      // Check if this is a promo product (explicit match)
      if (promoSettings.enabled && promoSettings.guruProductId && 
          isPromoProduct(productId, productName, promoSettings.guruProductId)) {
        emailPlanName = promoSettings.name;
        emailIsPromo = true;
        logStep("Usando nome da promoção para email (ID correspondente)", { promoName: promoSettings.name });
      }
      // If not recognized but promo is enabled without specific ID
      else if (!emailPlanName && promoSettings.enabled && !promoSettings.guruProductId) {
        emailPlanName = promoSettings.name;
        emailIsPromo = true;
        logStep("Usando nome da promoção para email (sem ID específico)", { promoName: promoSettings.name });
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
            isPromo: emailIsPromo,
            promoDurationDays: emailPromoDuration,
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
    let planName = mapGuruProductToPlan(productId, productName, dbPlanMapping);
    let durationDays = 30; // Default monthly
    let isPromo = false;

    // First, check if this is a promo product (explicit match)
    if (promoSettings.enabled && promoSettings.guruProductId && 
        isPromoProduct(productId, productName, promoSettings.guruProductId)) {
      planName = promoSettings.planMapping;
      durationDays = promoSettings.durationDays;
      isPromo = true;
      logStep("Produto promocional identificado pelo ID", { 
        productId,
        productName,
        promoGuruProductId: promoSettings.guruProductId,
        planName, 
        durationDays,
        promoName: promoSettings.name 
      });
    }
    // If not a promo product but also not recognized, and promo is enabled without specific ID
    else if (!planName && promoSettings.enabled && !promoSettings.guruProductId) {
      planName = promoSettings.planMapping;
      durationDays = promoSettings.durationDays;
      isPromo = true;
      logStep("Produto não reconhecido, usando configuração de promoção (sem ID específico)", { 
        planName, 
        durationDays,
        promoName: promoSettings.name 
      });
    } 
    // If not recognized and promo has specific ID (but doesn't match), use default
    else if (!planName) {
      planName = 'Awo'; // Default fallback
      logStep("Produto não reconhecido, usando plano padrão Awo");
    }

    logStep("Plano mapeado", { productId, productName, planName, durationDays, isPromo });

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

      case 'subscription':
        // Quando webhook_type é genérico "subscription", verificar last_status
        if (payload.last_status === 'active' || payload.last_status === 'approved') {
          subscriptionStatus = 'active';
          logStep("Assinatura ativa detectada via last_status", { last_status: payload.last_status });
        } else if (payload.last_status === 'cancelled' || payload.last_status === 'canceled') {
          subscriptionStatus = 'canceled';
          planName = 'Gratuito';
          logStep("Cancelamento detectado via last_status", { last_status: payload.last_status });
        } else if (payload.last_status === 'inactive' || payload.last_status === 'expired') {
          subscriptionStatus = 'canceled';
          planName = 'Gratuito';
          logStep("Assinatura inativa/expirada via last_status", { last_status: payload.last_status });
        } else {
          // last_status não reconhecido ou não presente, assumir ativo
          subscriptionStatus = 'active';
          logStep("Evento 'subscription' sem last_status reconhecido, assumindo ativo", { 
            last_status: payload.last_status,
            webhook_type: payload.webhook_type 
          });
        }
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

    // PROTEÇÃO: Se é um evento de cancelamento, verificar se a assinatura foi criada recentemente
    if (subscriptionStatus === 'canceled' || isCancellationEvent(payload)) {
      const isRecentlyCreated = await wasRecentlyCreated(supabaseAdmin, userId, 30);
      
      if (isRecentlyCreated) {
        logStep("⚠️ PROTEÇÃO ATIVADA: Ignorando cancelamento para assinatura recém-criada", {
          eventType: eventTypeLower,
          userId
        });
        
        // Retorna sucesso mas não processa o cancelamento
        return new Response(JSON.stringify({ 
          success: true,
          message: "Cancelamento ignorado - assinatura muito recente",
          user_id: userId,
          protection_activated: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    if (subscriptionStatus === 'active' && isCancellationEvent(payload)) {
      // Double-check: only cancel if not recently created
      const isRecentlyCreated = await wasRecentlyCreated(supabaseAdmin, userId, 30);
      
      if (!isRecentlyCreated) {
        subscriptionStatus = 'canceled';
        planName = 'Gratuito';
        logStep("CORREÇÃO: Cancelamento detectado via campos adicionais", {
          cancel_at_cycle_end: payload.cancel_at_cycle_end,
          last_status: payload.last_status
        });
      } else {
        logStep("⚠️ Ignorando flags de cancelamento para assinatura recém-criada");
      }
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

      // Capturar valor pago do Guru - verificar múltiplos campos possíveis
      let amountPaid = 
        payload.subscription?.price || 
        payload.subscription?.value ||
        payload.price || 
        payload.value || 
        payload.order?.value ||
        payload.order?.total ||
        payload.offer?.price ||
        payload.purchase?.price ||
        payload.purchase?.value ||
        null;
      
      // Converter para número se for string
      if (typeof amountPaid === 'string') {
        amountPaid = parseFloat(amountPaid.replace(',', '.'));
      }
      
      // Se for centavos (valor muito alto), converter para reais
      if (amountPaid && amountPaid > 10000) {
        amountPaid = amountPaid / 100;
      }
      
      logStep("Payment details from Guru", { 
        amountPaid,
        originalFields: {
          subscription_price: payload.subscription?.price,
          subscription_value: payload.subscription?.value,
          price: payload.price,
          value: payload.value,
          order_value: payload.order?.value,
          order_total: payload.order?.total,
          offer_price: payload.offer?.price,
        }
      });

      const subscriptionData: Record<string, any> = {
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

      // Adicionar amount_paid se disponível e válido
      if (amountPaid && typeof amountPaid === 'number' && amountPaid > 0 && !isNaN(amountPaid)) {
        subscriptionData.amount_paid = amountPaid;
        logStep("amount_paid será salvo", { amountPaid });
      } else {
        logStep("amount_paid não disponível ou inválido, não será salvo");
      }

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

      // Se for plano Egbe/Família, criar grupo automaticamente
      if (subscriptionStatus === 'active' && (planName === 'Egbe' || planName === 'Família' || planName.toLowerCase().includes('família') || planName.toLowerCase().includes('egbe'))) {
        logStep("Detectado plano família, verificando grupo...", { userId, planName });
        
        // Verificar se já existe grupo
        const { data: existingGroup } = await supabaseAdmin
          .from('family_groups')
          .select('id')
          .eq('owner_user_id', userId)
          .maybeSingle();
        
        if (!existingGroup) {
          logStep("Criando grupo família...", { userId });
          
          // Criar grupo
          const { data: newGroup, error: groupError } = await supabaseAdmin
            .from('family_groups')
            .insert({
              owner_user_id: userId,
              stripe_subscription_id: null,
              group_name: 'Minha Família',
              max_members: 5,
            })
            .select('id')
            .single();
          
          if (groupError) {
            logStep("Erro ao criar grupo família", { error: groupError.message });
          } else {
            logStep("Grupo família criado", { groupId: newGroup.id });
            
            // Adicionar o dono como membro owner
            const { error: memberError } = await supabaseAdmin
              .from('family_members')
              .insert({
                family_group_id: newGroup.id,
                user_id: userId,
                role: 'owner',
                status: 'active',
                joined_at: new Date().toISOString()
              });
            
            if (memberError) {
              logStep("Erro ao adicionar owner como membro", { error: memberError.message });
            } else {
              logStep("Owner adicionado ao grupo família com sucesso");
            }
          }
        } else {
          logStep("Grupo família já existe", { groupId: existingGroup.id });
        }
      }
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
