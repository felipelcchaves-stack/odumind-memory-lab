import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-CHANGE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Sem Stripe, não existe mais "criar uma assinatura paga de verdade" por
// aqui - assinaturas pagas passam pelo checkout do Guru direto com o
// cliente. Esta function só concede acesso complementar/gratuito
// (ex: cortesia, parceria, correção manual) ou faz downgrade pra Gratuito.

// Aliases de planos (nomes antigos mapeiam para nomes canônicos: Awo ou Egbe)
const PLAN_ALIASES: Record<string, string> = {
  // Awo = plano individual premium
  'premium': 'Awo',
  'profissional': 'Awo',
  'professional': 'Awo',
  'akapo': 'Awo',
  'awo': 'Awo',
  // Egbe = plano família
  'família': 'Egbe',
  'familia': 'Egbe',
  'family': 'Egbe',
  'egbe': 'Egbe',
  // Gratuito
  'gratuito': 'Gratuito',
  'free': 'Gratuito',
};

const VALID_PLANS = ['Gratuito', 'Awo', 'Egbe'];

// Helper para normalizar nome do plano (case-insensitive)
const normalizePlanName = (plan: string): string => {
  const lowerPlan = plan.toLowerCase();
  const normalized = PLAN_ALIASES[lowerPlan] || plan;
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
    const { userId, newPlan, billingCycle, reason } = await req.json();

    if (!userId || !newPlan || !billingCycle) {
      throw new Error("Missing required fields: userId, newPlan, billingCycle");
    }

    if (!['monthly', 'annual'].includes(billingCycle)) {
      throw new Error("Invalid billing cycle. Must be 'monthly' or 'annual'");
    }

    logStep("Request data", { userId, newPlan, billingCycle, reason });

    // Buscar email do usuário (só pra confirmar que existe)
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

    const normalizedPlan = normalizePlanName(newPlan);
    let auditInfo: any = {};

    if (normalizedPlan === 'Gratuito') {
      logStep("Downgrading to free plan");

      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_name: 'Gratuito',
          status: 'free',
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          payment_gateway: 'guru',
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;
      logStep("Downgraded to free plan");
    } else {
      if (!VALID_PLANS.includes(normalizedPlan)) {
        throw new Error(`Invalid plan: ${newPlan}. Available plans: Awo, Egbe, Gratuito`);
      }

      logStep("Granting complimentary access (database only)", { plan: normalizedPlan });

      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_name: normalizedPlan,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: oneYearFromNow.toISOString(),
          cancel_at_period_end: false,
          payment_gateway: 'guru',
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      logStep("Complimentary subscription created", {
        plan: normalizedPlan,
        validUntil: oneYearFromNow,
        daysGranted: 365
      });
      auditInfo.complimentaryGrant = {
        granted: true,
        validUntil: oneYearFromNow.toISOString(),
        reason: reason || 'Acesso administrativo concedido',
      };

      // Se for plano Egbe (Família), criar grupo automaticamente
      if (normalizedPlan === 'Egbe') {
        logStep("Detected family plan, creating family group...", { userId });

        const { data: existingGroup } = await supabaseClient
          .from('family_groups')
          .select('id')
          .eq('owner_user_id', userId)
          .maybeSingle();

        if (!existingGroup) {
          logStep("Creating family group for complimentary subscription...");

          const { data: newGroup, error: groupError } = await supabaseClient
            .from('family_groups')
            .insert({
              owner_user_id: userId,
              group_name: 'Minha Família',
              max_members: 5,
            })
            .select()
            .single();

          if (groupError) {
            logStep("ERROR creating family group", { error: groupError });
            throw new Error(`Erro ao criar grupo familiar: ${groupError.message}`);
          }

          logStep("Family group created", { groupId: newGroup.id });

          const { error: memberError } = await supabaseClient
            .from('family_members')
            .insert({
              family_group_id: newGroup.id,
              user_id: userId,
              status: 'active',
              role: 'owner',
              invited_at: new Date().toISOString(),
              joined_at: new Date().toISOString(),
            });

          if (memberError) {
            logStep("ERROR adding owner as member", { error: memberError });
            throw new Error(`Erro ao adicionar membro: ${memberError.message}`);
          }

          logStep("Owner added to family group successfully");
          auditInfo.familyGroupCreated = {
            groupId: newGroup.id,
            reason: 'auto_created_for_complimentary'
          };
        } else {
          logStep("Family group already exists", { groupId: existingGroup.id });
          auditInfo.familyGroupCreated = {
            groupId: existingGroup.id,
            reason: 'already_exists'
          };
        }
      }
    }

    // Registrar na tabela de auditoria
    const { error: auditError } = await supabaseClient
      .from('subscription_changes')
      .insert({
        user_id: userId,
        changed_by: adminUser.id,
        old_plan: currentSub?.plan_name || 'Gratuito',
        new_plan: normalizedPlan,
        billing_cycle: billingCycle,
        reason: reason || null,
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
        message: `Assinatura alterada de ${currentSub?.plan_name || 'Gratuito'} para ${normalizedPlan}`,
        oldPlan: currentSub?.plan_name || 'Gratuito',
        newPlan: normalizedPlan,
        billingCycle: billingCycle,
        ...auditInfo,
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
