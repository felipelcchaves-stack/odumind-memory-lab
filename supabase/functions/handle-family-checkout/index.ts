import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, stripe_subscription_id, plan_name } = await req.json();

    if (!user_id || !stripe_subscription_id) {
      throw new Error("user_id e stripe_subscription_id são obrigatórios");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar se é plano família
    if (plan_name?.toLowerCase().includes('família') || plan_name?.toLowerCase().includes('familia')) {
      // Criar grupo familiar automaticamente
      const { data: group, error: groupError } = await supabaseAdmin
        .from("family_groups")
        .insert({
          owner_user_id: user_id,
          stripe_subscription_id,
          group_name: "Minha Família",
          max_members: 5,
        })
        .select()
        .single();

      if (groupError) {
        console.error("Erro ao criar grupo:", groupError);
        throw groupError;
      }

      // Adicionar owner como primeiro membro
      await supabaseAdmin
        .from("family_members")
        .insert({
          family_group_id: group.id,
          user_id: user_id,
          status: "active",
          role: "owner",
          joined_at: new Date().toISOString(),
        });

      console.log(`[FAMILY-CHECKOUT] Grupo criado: ${group.id}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
