import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// URL de produção fixa para garantir links corretos em emails
const PRODUCTION_URL = "https://isesemind.ileaseifatokun.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Cliente com ANON_KEY para autenticação do usuário
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    // Cliente com SERVICE_ROLE_KEY para bypass RLS em operações admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    const { email, family_group_id } = await req.json();

    if (!email || !family_group_id) {
      throw new Error("Email e family_group_id são obrigatórios");
    }

    // Verificar se usuário é owner do grupo (usando admin para bypass RLS)
    const { data: group, error: groupError } = await supabaseAdmin
      .from("family_groups")
      .select("owner_user_id, max_members")
      .eq("id", family_group_id)
      .single();

    if (groupError || !group) {
      console.error("[INVITE-FAMILY] Erro ao buscar grupo:", groupError);
      throw new Error("Grupo não encontrado");
    }

    if (group.owner_user_id !== user.id) {
      throw new Error("Apenas o proprietário pode convidar membros");
    }

    // Verificar número de membros atuais (usando admin para bypass RLS)
    const { count: memberCount } = await supabaseAdmin
      .from("family_members")
      .select("*", { count: "exact", head: true })
      .eq("family_group_id", family_group_id)
      .eq("status", "active");

    if (memberCount && memberCount >= group.max_members) {
      throw new Error(`Limite de ${group.max_members} membros atingido`);
    }

    // Verificar se email já foi convidado ou já é membro (usando admin para bypass RLS)
    const { data: existingInvite } = await supabaseAdmin
      .from("family_invites")
      .select("id")
      .eq("family_group_id", family_group_id)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite) {
      throw new Error("Este email já possui um convite pendente");
    }

    // Gerar token único
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

    // Criar convite (usando admin para bypass RLS)
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("family_invites")
      .insert({
        family_group_id,
        email,
        token: inviteToken,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (inviteError) {
      console.error("[INVITE-FAMILY] Erro ao criar convite:", inviteError);
      throw new Error(`Erro ao criar convite: ${inviteError.message}`);
    }

    // Usar URL de produção fixa em vez de origin do request
    const inviteLink = `${PRODUCTION_URL}/familia/aceitar/${inviteToken}`;

    console.log(`[INVITE-FAMILY] Convite criado: ${invite.id} para ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        invite_id: invite.id,
        invite_link: inviteLink,
        expires_at: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[INVITE-FAMILY] Erro:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
