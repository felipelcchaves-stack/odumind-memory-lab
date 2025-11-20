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

    const { invite_token } = await req.json();

    if (!invite_token) {
      throw new Error("Token de convite é obrigatório");
    }

    // Buscar convite
    const { data: invite, error: inviteError } = await supabaseClient
      .from("family_invites")
      .select(`
        *,
        family_groups (
          id,
          group_name,
          max_members
        )
      `)
      .eq("token", invite_token)
      .single();

    if (inviteError || !invite) {
      throw new Error("Convite não encontrado");
    }

    // Verificar se convite expirou
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      await supabaseClient
        .from("family_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);
      throw new Error("Este convite expirou");
    }

    // Verificar se convite está pendente
    if (invite.status !== "pending") {
      throw new Error("Este convite já foi usado ou cancelado");
    }

    // Verificar se email do convite corresponde ao do usuário
    if (invite.email !== user.email) {
      throw new Error("Este convite não é para o seu email");
    }

    // Verificar se usuário já faz parte de outro grupo
    const { data: existingMember } = await supabaseClient
      .from("family_members")
      .select("family_group_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (existingMember) {
      throw new Error("Você já faz parte de um grupo familiar");
    }

    // Verificar limite de membros
    const { count: memberCount } = await supabaseClient
      .from("family_members")
      .select("*", { count: "exact", head: true })
      .eq("family_group_id", invite.family_group_id)
      .eq("status", "active");

    if (memberCount && memberCount >= invite.family_groups.max_members) {
      throw new Error("Este grupo já atingiu o limite de membros");
    }

    // Adicionar usuário ao grupo
    const { error: memberError } = await supabaseClient
      .from("family_members")
      .insert({
        family_group_id: invite.family_group_id,
        user_id: user.id,
        status: "active",
        role: "member",
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      throw new Error(`Erro ao adicionar ao grupo: ${memberError.message}`);
    }

    // Atualizar status do convite
    await supabaseClient
      .from("family_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    console.log(`[ACCEPT-INVITE] User ${user.id} aceitou convite ${invite.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        family_group_id: invite.family_group_id,
        group_name: invite.family_groups.group_name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ACCEPT-INVITE] Erro:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
