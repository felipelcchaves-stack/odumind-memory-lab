import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  email: string;
  type: 'password_reset' | 'email_confirmation' | 'magic_link';
  token?: string;
  redirectUrl?: string;
  userName?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-AUTH-EMAIL] ${step}${detailsStr}`);
};

const getPasswordResetEmailHtml = (userName: string, resetUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha - Isesemind</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffd700; margin: 0; font-size: 28px; font-weight: bold;">🔐 Redefinir Senha</h1>
      <p style="color: #ffffff; margin-top: 10px; font-size: 16px; opacity: 0.9;">Isesemind - Memorização dos 256 Odu</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333333; margin-bottom: 25px;">Olá <strong>${userName}</strong>,</p>
      
      <p style="font-size: 16px; color: #555555; line-height: 1.6; margin-bottom: 25px;">
        Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%); color: #1a1a2e; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);">
          Redefinir Minha Senha
        </a>
      </div>
      
      <!-- Alternative Link -->
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
        <p style="font-size: 14px; color: #666666; margin: 0 0 10px 0;">
          Se o botão não funcionar, copie e cole este link no seu navegador:
        </p>
        <p style="font-size: 12px; color: #007bff; word-break: break-all; margin: 0;">
          ${resetUrl}
        </p>
      </div>
      
      <!-- Warning -->
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
        <p style="font-size: 14px; color: #856404; margin: 0;">
          ⚠️ <strong>Importante:</strong> Este link expira em <strong>1 hora</strong>. Se você não solicitou esta redefinição, ignore este email.
        </p>
      </div>
      
      <!-- Security Note -->
      <p style="font-size: 14px; color: #888888; line-height: 1.6;">
        Por questões de segurança, nunca compartilhe este link com outras pessoas. Nossa equipe nunca pedirá sua senha por email.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
        Precisa de ajuda? Entre em contato conosco.
      </p>
      <p style="margin: 0; font-size: 12px; color: #999999;">
        © ${new Date().getFullYear()} Isesemind. Todos os direitos reservados.
      </p>
    </div>
  </div>
  
  <!-- Anti-spam footer -->
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
    <p style="font-size: 11px; color: #999999; line-height: 1.5;">
      Este email foi enviado para ${userName} porque foi solicitada uma redefinição de senha na plataforma Isesemind.
      Se você não solicitou esta ação, pode ignorar este email com segurança.
    </p>
  </div>
</body>
</html>
`;

const getEmailConfirmationHtml = (userName: string, confirmUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmar Email - Isesemind</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffd700; margin: 0; font-size: 28px; font-weight: bold;">✉️ Confirme seu Email</h1>
      <p style="color: #ffffff; margin-top: 10px; font-size: 16px; opacity: 0.9;">Bem-vindo ao Isesemind!</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333333; margin-bottom: 25px;">Olá <strong>${userName}</strong>,</p>
      
      <p style="font-size: 16px; color: #555555; line-height: 1.6; margin-bottom: 25px;">
        Obrigado por se cadastrar no Isesemind! Para completar seu registro e começar sua jornada de memorização dos 256 Odu, confirme seu endereço de email clicando no botão abaixo:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${confirmUrl}" style="display: inline-block; background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%); color: #1a1a2e; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);">
          Confirmar Meu Email
        </a>
      </div>
      
      <!-- Alternative Link -->
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
        <p style="font-size: 14px; color: #666666; margin: 0 0 10px 0;">
          Se o botão não funcionar, copie e cole este link no seu navegador:
        </p>
        <p style="font-size: 12px; color: #007bff; word-break: break-all; margin: 0;">
          ${confirmUrl}
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
      <p style="margin: 0; font-size: 12px; color: #999999;">
        © ${new Date().getFullYear()} Isesemind. Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type, token, redirectUrl, userName }: AuthEmailRequest = await req.json();
    
    logStep("Recebida solicitação de email", { email, type, hasToken: !!token });

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      logStep("ERRO: RESEND_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "Serviço de email não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = 'https://isesemind.ifatokun.com.br';
    const displayName = userName || email.split('@')[0];
    
    let subject: string;
    let html: string;
    let actionUrl: string;

    switch (type) {
      case 'password_reset':
        actionUrl = token 
          ? `${siteUrl}/auth?mode=reset&token=${token}` 
          : (redirectUrl || `${siteUrl}/auth?mode=reset`);
        subject = "🔐 Redefinir sua senha - Isesemind";
        html = getPasswordResetEmailHtml(displayName, actionUrl);
        break;
        
      case 'email_confirmation':
        actionUrl = token 
          ? `${siteUrl}/auth?mode=confirm&token=${token}` 
          : (redirectUrl || `${siteUrl}/auth`);
        subject = "✉️ Confirme seu email - Isesemind";
        html = getEmailConfirmationHtml(displayName, actionUrl);
        break;
        
      case 'magic_link':
        actionUrl = redirectUrl || `${siteUrl}/auth`;
        subject = "🔗 Seu link de acesso - Isesemind";
        html = getPasswordResetEmailHtml(displayName, actionUrl); // Reusing reset template for now
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: "Tipo de email inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    logStep("Enviando email via Resend", { to: email, subject, type });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Isesemind <noreply@isesemind.ifatokun.com.br>",
        to: [email],
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      logStep("Erro ao enviar email", { status: emailResponse.status, result: emailResult });
      return new Response(
        JSON.stringify({ 
          error: "Falha ao enviar email", 
          details: emailResult 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Email enviado com sucesso", { id: emailResult.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado com sucesso",
        emailId: emailResult.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("Erro inesperado", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
