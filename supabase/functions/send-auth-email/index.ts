import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

// Supabase Auth "Send Email" hook contract - NOT a regular HTTP endpoint our
// own frontend calls. Supabase's Auth server POSTs a signed payload here for
// every auth email (signup confirmation, password recovery, etc); the
// signature must be verified with the hook secret configured in
// Supabase Auth > Hooks (dashboard-generated, format "v1,whsec_...").
// See: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const hookSecret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace("v1,whsec_", "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
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

const getGenericAuthEmailHtml = (userName: string, actionUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ação necessária - Isesemind</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffd700; margin: 0; font-size: 28px; font-weight: bold;">Isesemind</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333333; margin-bottom: 25px;">Olá <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555555; line-height: 1.6; margin-bottom: 25px;">
        Clique no botão abaixo para continuar:
      </p>
      <div style="text-align: center; margin: 35px 0;">
        <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%); color: #1a1a2e; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold;">
          Continuar
        </a>
      </div>
    </div>
  </div>
</body>
</html>
`;

// Maps a Supabase auth email_data.token_hash + email_action_type into a link
// through Supabase's own verify endpoint - it validates the token server-side
// and redirects the browser to redirect_to with a working session attached.
// Sending users straight to our own /auth page with a raw token (the old
// behavior here) skips that verification step and never establishes a session.
const buildActionUrl = (emailData: EmailData) => {
  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to,
  });
  return `${SUPABASE_URL}/auth/v1/verify?${params.toString()}`;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  if (!hookSecret) {
    logStep("ERRO: SEND_EMAIL_HOOK_SECRET não configurado");
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: "Hook secret não configurado" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(hookSecret);

  try {
    const { user, email_data } = wh.verify(payload, headers) as {
      user: { email: string; user_metadata?: { nome?: string } };
      email_data: EmailData;
    };

    if (!RESEND_API_KEY) {
      throw { code: 500, message: "RESEND_API_KEY não configurada" };
    }

    const displayName = user.user_metadata?.nome || user.email.split('@')[0];
    const actionUrl = buildActionUrl(email_data);

    let subject: string;
    let html: string;

    switch (email_data.email_action_type) {
      case 'recovery':
        subject = "🔐 Redefinir sua senha - Isesemind";
        html = getPasswordResetEmailHtml(displayName, actionUrl);
        break;

      case 'signup':
        subject = "✉️ Confirme seu email - Isesemind";
        html = getEmailConfirmationHtml(displayName, actionUrl);
        break;

      default:
        // magiclink/invite/email_change/reauthentication/notifications -
        // none of these are triggered by this app's current auth flows
        // (only signUp + resetPasswordForEmail are used), but a safe
        // generic template covers anything Supabase sends unexpectedly
        // instead of silently failing to deliver the email.
        subject = "Isesemind - Ação necessária";
        html = getGenericAuthEmailHtml(displayName, actionUrl);
        break;
    }

    logStep("Enviando email via Resend", { to: user.email, subject, type: email_data.email_action_type });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Isesemind <noreply@isesemind.ifatokun.com.br>",
        to: [user.email],
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw { code: emailResponse.status, message: `Resend error: ${JSON.stringify(emailResult)}` };
    }

    logStep("Email enviado com sucesso", { id: emailResult.id });
  } catch (error: any) {
    logStep("Erro ao processar hook", { error: error.message ?? error });
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code ?? 500,
          message: error.message ?? "Erro desconhecido",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
