import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHANGE-OWN-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Mapeamento de aliases de planos (case-insensitive)
const PLAN_ALIASES: { [key: string]: string } = {
  'egbe (família)': 'Egbe',
  'família': 'Egbe',
  'familia': 'Egbe',
  'family': 'Egbe',
  'profissional': 'Awo',
  'professional': 'Awo',
  'premium': 'Awo',
  'awo': 'Awo',
  'akapo': 'Awo',
  'egbe': 'Egbe',
  'gratuito': 'Gratuito',
  'free': 'Gratuito',
};

function normalizePlanName(planName: string): string {
  const lowerName = planName.toLowerCase();
  return PLAN_ALIASES[lowerName] || planName;
}

// Plan hierarchy for downgrade validation (lower index = lower tier)
// Removido Akapo - agora só temos Gratuito, Awo e Egbe
const PLAN_HIERARCHY = ['Gratuito', 'Awo', 'Egbe'];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) throw new Error("Authentication failed");
    logStep("User authenticated", { userId: user.id });

    // Get request body
    const { newPlan } = await req.json();
    logStep("Request received", { newPlan });

    if (!newPlan) {
      throw new Error("newPlan is required");
    }

    // Get current subscription
    const { data: currentSub, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (subError) {
      logStep("Error fetching subscription", { error: subError });
      throw new Error("Could not fetch current subscription");
    }

    const currentPlan = currentSub?.plan_name || 'Gratuito';
    logStep("Current plan", { currentPlan });

    // Normalize plan names
    const currentPlanNormalized = normalizePlanName(currentPlan);
    const newPlanNormalized = normalizePlanName(newPlan);
    
    logStep("Plans normalized", { 
      currentPlan, 
      currentPlanNormalized, 
      newPlan, 
      newPlanNormalized 
    });

    // Validate downgrade (can only go to same or lower tier)
    const currentIndex = PLAN_HIERARCHY.indexOf(currentPlanNormalized);
    const newIndex = PLAN_HIERARCHY.indexOf(newPlanNormalized);

    if (currentIndex === -1 || newIndex === -1) {
      throw new Error("Invalid plan name");
    }

    if (newIndex > currentIndex) {
      throw new Error("Cannot upgrade to a higher plan. Please use the subscribe button.");
    }

    if (currentIndex === newIndex) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "You are already on this plan" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Downgrade validated", { from: currentPlan, to: newPlan });

    // Se está fazendo downgrade de Egbe (Família), verificar se é owner
    if (currentPlanNormalized === 'Egbe' && newPlanNormalized !== 'Egbe') {
      const { data: familyGroup, error: groupError } = await supabaseClient
        .from('family_groups')
        .select('*')
        .eq('owner_user_id', user.id)
        .single();

      if (familyGroup && !groupError) {
        // Verificar se há membros ativos
        const { data: members, error: membersError } = await supabaseClient
          .from('family_members')
          .select('id')
          .eq('family_group_id', familyGroup.id)
          .eq('status', 'active');

        if (members && members.length > 1) {
          throw new Error(
            'Você não pode fazer downgrade do plano Família enquanto houver membros ativos. ' +
            'Remova todos os membros primeiro ou transfira a propriedade do grupo.'
          );
        }

        // Se chegou aqui, é owner mas não há outros membros
        // Desativar o grupo familiar
        await supabaseClient
          .from('family_members')
          .update({ status: 'inactive' })
          .eq('family_group_id', familyGroup.id);

        // Desativar todos os convites pendentes
        await supabaseClient
          .from('family_invites')
          .update({ status: 'expired' })
          .eq('family_group_id', familyGroup.id)
          .eq('status', 'pending');

        logStep("Family group deactivated", { groupId: familyGroup.id });
      }
    }

    // Update subscription in database
    const { error: updateError } = await supabaseClient
      .from("subscriptions")
      .update({
        plan_name: newPlanNormalized,
        status: newPlanNormalized === 'Gratuito' ? 'free' : currentSub.status,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      logStep("Error updating subscription", { error: updateError });
      throw new Error("Failed to update subscription");
    }

    logStep("Subscription updated successfully");

    // Log the change for audit
    const { error: logError } = await supabaseClient
      .from("subscription_changes")
      .insert({
        user_id: user.id,
        changed_by: user.id,
        old_plan: currentPlanNormalized,
        new_plan: newPlanNormalized,
        billing_cycle: 'monthly',
        reason: 'User requested downgrade',
      });

    if (logError) {
      logStep("Error logging change", { error: logError });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Plan successfully changed from ${currentPlan} to ${newPlanNormalized}`,
        newPlan: newPlanNormalized,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
