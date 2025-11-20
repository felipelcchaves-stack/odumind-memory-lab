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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    const { stripe_subscription_id, group_name } = await req.json();

    // Verificar se usuário já tem um grupo
    const { data: existingMember } = await supabaseClient
      .from("family_members")
      .select("family_group_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (existingMember) {
      throw new Error("Usuário já faz parte de um grupo familiar");
    }

    // Criar grupo familiar
    const { data: newGroup, error: groupError } = await supabaseClient
      .from("family_groups")
      .insert({
        owner_user_id: user.id,
        stripe_subscription_id,
        group_name: group_name || "Minha Família",
        max_members: 5,
      })
      .select()
      .single();

    if (groupError) {
      throw new Error(`Erro ao criar grupo: ${groupError.message}`);
    }

    // Adicionar owner como primeiro membro
    const { error: memberError } = await supabaseClient
      .from("family_members")
      .insert({
        family_group_id: newGroup.id,
        user_id: user.id,
        status: "active",
        role: "owner",
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      throw new Error(`Erro ao adicionar membro: ${memberError.message}`);
    }

    console.log(`[CREATE-FAMILY] Grupo criado: ${newGroup.id} por user ${user.id}`);

    return new Response(
      JSON.stringify({ family_group_id: newGroup.id, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[CREATE-FAMILY] Erro:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
