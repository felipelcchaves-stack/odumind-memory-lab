import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
  password: string;
  planName: string;
  isPromo?: boolean;
  promoDurationDays?: number;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-WELCOME-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, password, planName, isPromo, promoDurationDays }: WelcomeEmailRequest = await req.json();
    
    logStep("Enviando e-mail de boas-vindas", { email, name, planName, isPromo, promoDurationDays });

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = 'https://isesemind.ifatokun.com.br';
    const loginUrl = `${siteUrl}/auth`;
    
    logStep("URL de login configurada", { loginUrl });

    // Build duration text for promo plans
    let durationText = '';
    if (isPromo && promoDurationDays) {
      if (promoDurationDays >= 365) {
        const years = Math.floor(promoDurationDays / 365);
        durationText = years === 1 ? '1 ano' : `${years} anos`;
      } else if (promoDurationDays >= 30) {
        const months = Math.floor(promoDurationDays / 30);
        durationText = months === 1 ? '1 mês' : `${months} meses`;
      } else {
        durationText = `${promoDurationDays} dias`;
      }
    }

    // Customize subject and badge for promo
    const emailSubject = isPromo 
      ? `🎉 ${planName} - Seus dados de acesso ao Isesemind`
      : "🎉 Bem-vindo ao Isesemind - Seus dados de acesso";

    const planBadgeColor = isPromo ? '#ff6b35' : '#2e7d32';
    const planBadgeBg = isPromo ? '#fff3e0' : '#e8f5e9';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Isesemind</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffd700; margin: 0; font-size: 28px; font-weight: bold;">🎉 Bem-vindo ao Isesemind!</h1>
      <p style="color: #ffffff; margin-top: 10px; font-size: 16px; opacity: 0.9;">Sua jornada de memorização dos 256 Odu começa agora</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333333; margin-bottom: 25px;">Olá <strong>${name || 'Estudante'}</strong>,</p>
      
      <p style="font-size: 16px; color: #555555; line-height: 1.6; margin-bottom: 25px;">
        ${isPromo 
          ? `Parabéns por garantir sua vaga na <strong>${planName}</strong>! Seu pagamento foi confirmado e sua conta já está ativa.`
          : 'Seu pagamento foi confirmado e sua conta já está ativa! Abaixo estão seus dados de acesso:'
        }
      </p>
      
      <!-- Credentials Box -->
      <div style="background-color: #f8f9fa; border-left: 4px solid #ffd700; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
          <strong>📧 E-mail:</strong>
        </p>
        <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; font-family: monospace; background: #ffffff; padding: 10px; border-radius: 4px;">
          ${email}
        </p>
        
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
          <strong>🔐 Senha temporária:</strong>
        </p>
        <p style="margin: 0; font-size: 18px; color: #1a1a2e; font-family: monospace; background: #ffffff; padding: 10px; border-radius: 4px; letter-spacing: 1px;">
          ${password}
        </p>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%); color: #1a1a2e; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);">
          👉 Acessar Agora
        </a>
      </div>
      
      <!-- Plan Info -->
      <div style="background-color: ${planBadgeBg}; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 14px; color: ${planBadgeColor};">
          ✅ <strong>Seu plano:</strong> ${planName}
          ${durationText ? `<br><span style="font-size: 13px; opacity: 0.9;">📅 Acesso válido por ${durationText}</span>` : ''}
        </p>
      </div>
      
      <!-- Warning -->
      <div style="background-color: #fff3e0; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 14px; color: #e65100;">
          ⚠️ <strong>Recomendação:</strong> Troque sua senha após o primeiro acesso para maior segurança.
        </p>
      </div>
      
      <p style="font-size: 16px; color: #555555; line-height: 1.6;">
        Qualquer dúvida, entre em contato conosco respondendo este e-mail.
      </p>
      
      <p style="font-size: 16px; color: #333333; margin-top: 30px;">
        Axé! 🙏<br>
        <strong>Equipe Isesemind</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
      <p style="margin: 0; font-size: 12px; color: #999999;">
        Este e-mail foi enviado automaticamente após a confirmação do seu pagamento.
      </p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #999999;">
        © ${new Date().getFullYear()} Isesemind - Memorização dos 256 Odu Ifá
      </p>
    </div>
    
  </div>
</body>
</html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Isesemind <noreply@ileaseifatokun.com.br>",
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logStep("Erro ao enviar e-mail", { error: data });
      return new Response(
        JSON.stringify({ error: data.message || "Erro ao enviar e-mail" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("E-mail enviado com sucesso", { messageId: data?.id });

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Erro no handler", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
