import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// URL de produção fixa para garantir links corretos em emails
const PRODUCTION_URL = "https://isesemind.ifatokun.com.br";

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

    // 1. Deletar convites expirados para este email/grupo
    const { error: deleteError } = await supabaseAdmin
      .from("family_invites")
      .delete()
      .eq("family_group_id", family_group_id)
      .eq("email", email)
      .lt("expires_at", new Date().toISOString());

    if (deleteError) {
      console.log("[INVITE-FAMILY] Aviso ao limpar convites expirados:", deleteError);
    } else {
      console.log("[INVITE-FAMILY] Convites expirados limpos para:", email);
    }

    // 2. Verificar se existe convite pendente válido (não expirado)
    const { data: existingInvite } = await supabaseAdmin
      .from("family_invites")
      .select("id, token, expires_at")
      .eq("family_group_id", family_group_id)
      .eq("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    let invite;
    let inviteToken;
    let expiresAt;
    let isResend = false;

    if (existingInvite) {
      // 3. Se existe convite válido, reutilizar (permitir reenvio)
      console.log(`[INVITE-FAMILY] Convite existente encontrado para ${email}, reenviando...`);
      invite = existingInvite;
      inviteToken = existingInvite.token;
      expiresAt = new Date(existingInvite.expires_at);
      isResend = true;
    } else {
      // 4. Se não existe, criar novo convite
      inviteToken = crypto.randomUUID();
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

      const { data: newInvite, error: inviteError } = await supabaseAdmin
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
      
      invite = newInvite;
    }

    // Usar URL de produção fixa em vez de origin do request
    const inviteLink = `${PRODUCTION_URL}/familia/aceitar/${inviteToken}`;

    console.log(`[INVITE-FAMILY] ${isResend ? 'Reenviando' : 'Novo'} convite: ${invite.id} para ${email}`);

    // Enviar email com o convite usando Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;
    
    if (RESEND_API_KEY) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <h1 style="color: #ffd700; margin: 0; font-size: 24px;">🏠 Convite para Plano Família</h1>
              <p style="color: #fff; margin: 10px 0 0 0; opacity: 0.9;">Isesemind - Memorização dos 256 Odu Ifá</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
              <p style="margin: 0 0 16px 0; font-size: 16px;">Olá!</p>
              <p style="margin: 0 0 16px 0;">Você foi convidado(a) para fazer parte de um <strong>Plano Família</strong> no Isesemind.</p>
              <p style="margin: 0 0 24px 0;">Com o plano família, você terá acesso completo à plataforma de memorização dos 256 Odu Ifá.</p>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%); color: #1a1a2e; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">Aceitar Convite</a>
              </div>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #666;">Ou copie e cole este link no seu navegador:</p>
              <p style="margin: 8px 0 0 0; font-size: 12px; word-break: break-all; color: #888;">${inviteLink}</p>
            </div>
            
            <p style="font-size: 14px; color: #888; text-align: center;">
              ⏰ Este convite expira em <strong>7 dias</strong>.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            
            <p style="font-size: 12px; color: #aaa; text-align: center;">
              Se você não esperava este convite, pode ignorar este email.
            </p>
          </body>
          </html>
        `;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Isesemind <contato@isesemind.ifatokun.com.br>",
            to: [email],
            subject: "🏠 Você foi convidado para o Plano Família Isesemind!",
            html: emailHtml,
          }),
        });

        if (emailRes.ok) {
          emailSent = true;
          console.log(`[INVITE-FAMILY] Email enviado com sucesso para ${email}`);
        } else {
          const errorData = await emailRes.text();
          console.error(`[INVITE-FAMILY] Erro ao enviar email: ${errorData}`);
        }
      } catch (emailError) {
        console.error(`[INVITE-FAMILY] Erro ao enviar email:`, emailError);
      }
    } else {
      console.warn("[INVITE-FAMILY] RESEND_API_KEY não configurada, email não enviado");
    }

    return new Response(
      JSON.stringify({
        success: true,
        invite_id: invite.id,
        invite_link: inviteLink,
        expires_at: expiresAt.toISOString(),
        email_sent: emailSent,
        resent: isResend,
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
