import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESEND-PASSWORD] ${step}${detailsStr}`);
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting password resend process");

    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with user's token to verify admin role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !currentUser) {
      logStep("ERROR: Invalid user", { error: userError?.message });
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify admin role
    const { data: adminCheck } = await supabaseUser.rpc('has_admin_role', { _user_id: currentUser.id });
    if (!adminCheck) {
      logStep("ERROR: User is not admin", { userId: currentUser.id });
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem reenviar senhas" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep("Admin verified", { adminId: currentUser.id });

    // Parse request body
    const { user_id } = await req.json();
    if (!user_id) {
      logStep("ERROR: Missing user_id");
      return new Response(
        JSON.stringify({ error: "user_id é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep("Processing password reset for user", { targetUserId: user_id });

    // Create admin client to update user password
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user data from auth
    const { data: { user: targetUser }, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (targetUserError || !targetUser) {
      logStep("ERROR: Target user not found", { error: targetUserError?.message });
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user profile for name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('nome')
      .eq('user_id', user_id)
      .single();

    const userName = profile?.nome || targetUser.email?.split('@')[0] || 'Usuário';
    const userEmail = targetUser.email;

    if (!userEmail) {
      logStep("ERROR: User has no email");
      return new Response(
        JSON.stringify({ error: "Usuário não possui email cadastrado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate new temporary password
    const tempPassword = generateTempPassword();
    logStep("Generated temporary password");

    // Update user password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: tempPassword,
    });

    if (updateError) {
      logStep("ERROR: Failed to update password", { error: updateError.message });
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar senha: " + updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep("Password updated successfully");

    // Get subscription info for plan name
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_name')
      .eq('user_id', user_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const planName = subscription?.plan_name || 'Gratuito';

    // Call send-welcome-email function
    logStep("Calling send-welcome-email function");
    
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email: userEmail,
        name: userName,
        password: tempPassword,
        planName: planName,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      logStep("WARNING: Email send failed but password was updated", { error: errorText });
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: "Senha atualizada, mas houve erro ao enviar email. A nova senha é: " + tempPassword 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep("Password reset completed successfully", { email: userEmail });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Nova senha enviada para ${userEmail}` 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    logStep("ERROR: Unexpected error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
