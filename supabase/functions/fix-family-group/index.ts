import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FIX-FAMILY-GROUP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Starting family group fix process");

    // Only an admin can trigger a system-wide backfill across every active
    // Família/Egbe subscription.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !adminUser) throw new Error("Authentication failed");

    const { data: isAdmin } = await supabaseAdmin.rpc('has_admin_role', { _user_id: adminUser.id });
    if (!isAdmin) throw new Error("User is not an admin");
    logStep("Admin authenticated", { adminId: adminUser.id });

    // Buscar todos os usuários com plano Família/Egbe ativo mas sem grupo
    const { data: subs, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan_name, status')
      .in('plan_name', ['Família', 'Egbe'])
      .eq('status', 'active');

    if (subsError) {
      logStep("Error fetching subscriptions", { error: subsError });
      throw subsError;
    }

    if (!subs || subs.length === 0) {
      logStep("No active family subscriptions found");
      return new Response(JSON.stringify({ 
        success: true,
        fixed: 0,
        message: 'Nenhuma assinatura Família ativa encontrada'
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      });
    }

    logStep("Found active family subscriptions", { count: subs.length });

    let fixed = 0;
    let alreadyHaveGroup = 0;
    const results = [];

    for (const sub of subs) {
      logStep("Processing user", { userId: sub.user_id, plan: sub.plan_name });

      // Verificar se já tem grupo (como membro ativo)
      const { data: existingMembership, error: memberError } = await supabaseAdmin
        .from('family_members')
        .select('family_group_id')
        .eq('user_id', sub.user_id)
        .eq('status', 'active')
        .maybeSingle();

      if (memberError) {
        logStep("Error checking membership", { userId: sub.user_id, error: memberError });
        results.push({
          userId: sub.user_id,
          status: 'error',
          error: memberError.message
        });
        continue;
      }

      if (existingMembership) {
        logStep("User already has active family group", { 
          userId: sub.user_id, 
          groupId: existingMembership.family_group_id 
        });
        alreadyHaveGroup++;
        results.push({
          userId: sub.user_id,
          status: 'already_has_group',
          groupId: existingMembership.family_group_id
        });
        continue;
      }

      // Criar grupo familiar
      logStep("Creating family group", { userId: sub.user_id });
      
      const { data: newGroup, error: groupError } = await supabaseAdmin
        .from('family_groups')
        .insert({
          owner_user_id: sub.user_id,
          stripe_subscription_id: null,
          group_name: 'Minha Família',
          max_members: 5,
        })
        .select()
        .single();

      if (groupError) {
        logStep("Error creating family group", { userId: sub.user_id, error: groupError });
        results.push({
          userId: sub.user_id,
          status: 'error',
          error: groupError.message
        });
        continue;
      }

      logStep("Family group created", { userId: sub.user_id, groupId: newGroup.id });

      // Adicionar como membro
      const { error: memberInsertError } = await supabaseAdmin
        .from('family_members')
        .insert({
          family_group_id: newGroup.id,
          user_id: sub.user_id,
          status: 'active',
          role: 'owner',
          invited_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        });

      if (memberInsertError) {
        logStep("Error adding owner as member", { userId: sub.user_id, error: memberInsertError });
        results.push({
          userId: sub.user_id,
          status: 'group_created_but_member_error',
          groupId: newGroup.id,
          error: memberInsertError.message
        });
        continue;
      }

      logStep("Successfully fixed user", { userId: sub.user_id, groupId: newGroup.id });
      fixed++;
      results.push({
        userId: sub.user_id,
        status: 'fixed',
        groupId: newGroup.id
      });
    }

    const summary = {
      success: true,
      totalProcessed: subs.length,
      fixed: fixed,
      alreadyHaveGroup: alreadyHaveGroup,
      errors: results.filter(r => r.status === 'error').length,
      message: `Processados ${subs.length} usuários. ${fixed} grupos criados, ${alreadyHaveGroup} já tinham grupo.`,
      results: results
    };

    logStep("Process complete", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in fix process", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
