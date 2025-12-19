import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RenewalOfferRequest {
  userId: string;
  userName: string;
  userEmail: string;
  planName: string;
  originalValue: number;
  discountPercent?: number;
  expiresAt: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-RENEWAL-OFFER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    logStep("Admin verified", { adminId: userData.user.id });

    const body: RenewalOfferRequest = await req.json();
    const { userId, userName, userEmail, planName, originalValue, discountPercent = 15, expiresAt } = body;

    logStep("Request received", { userId, userEmail, planName, discountPercent });

    // Generate unique coupon code
    const couponCode = `RENOVA${Date.now().toString(36).toUpperCase()}`;
    const discountedValue = originalValue * (1 - discountPercent / 100);
    const couponExpiresAt = new Date();
    couponExpiresAt.setDate(couponExpiresAt.getDate() + 7); // 7 days to use

    // Create coupon in discount_coupons table
    const { data: couponData, error: couponError } = await supabase
      .from('discount_coupons')
      .insert({
        code: couponCode,
        discount_percent: discountPercent,
        max_uses: 1,
        valid_until: couponExpiresAt.toISOString(),
        email: userEmail,
        source: 'renewal_offer'
      })
      .select()
      .single();

    if (couponError) {
      logStep("Error creating coupon", { error: couponError.message });
      throw new Error(`Failed to create coupon: ${couponError.message}`);
    }

    logStep("Coupon created", { couponCode, couponId: couponData.id });

    // Create renewal offer record
    const { data: offerData, error: offerError } = await supabase
      .from('renewal_offers')
      .insert({
        user_id: userId,
        coupon_id: couponData.id,
        offer_type: 'renewal',
        discount_percent: discountPercent,
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: couponExpiresAt.toISOString(),
        plan_name: planName,
        original_value: originalValue,
        email_sent_to: userEmail
      })
      .select()
      .single();

    if (offerError) {
      logStep("Error creating offer record", { error: offerError.message });
      throw new Error(`Failed to create offer record: ${offerError.message}`);
    }

    logStep("Offer record created", { offerId: offerData.id });

    // Format dates for email
    const expiresAtFormatted = new Date(expiresAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const couponExpiresFormatted = couponExpiresAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎁 Oferta Especial de Renovação</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Olá <strong>${userName}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Percebemos que sua assinatura do plano <strong>${planName}</strong> expira em <strong>${expiresAtFormatted}</strong>.
              </p>
              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                Como agradecimento pela sua jornada conosco, preparamos uma oferta exclusiva para você continuar sua evolução no estudo dos Odu Ifá:
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 25px; text-align: center;">
                    <p style="margin: 0 0 10px; color: #92400e; font-size: 18px; font-weight: bold;">
                      🏷️ ${discountPercent}% DE DESCONTO
                    </p>
                    <p style="margin: 0 0 15px; color: #78350f; font-size: 14px;">
                      De <span style="text-decoration: line-through;">R$ ${originalValue.toFixed(2).replace('.', ',')}</span> por apenas
                    </p>
                    <p style="margin: 0 0 15px; color: #78350f; font-size: 36px; font-weight: bold;">
                      R$ ${discountedValue.toFixed(2).replace('.', ',')}
                    </p>
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      Use o cupom: <strong style="font-size: 18px; letter-spacing: 2px;">${couponCode}</strong>
                    </p>
                  </td>
                </tr>
              </table>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td style="text-align: center;">
                    <a href="https://isesemind.com.br/assinatura" 
                       style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                      Renovar Agora →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; text-align: center;">
                ⏰ Esta oferta expira em <strong>${couponExpiresFormatted}</strong>
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 30px; background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; color: #374151; font-size: 14px; font-weight: bold;">
                      O que você continua tendo acesso:
                    </p>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                      <li>📖 Todos os 256 Odu Ifá</li>
                      <li>🧠 Sistema de memorização inteligente</li>
                      <li>📊 Acompanhamento de progresso</li>
                      <li>🎯 Flashcards e quizzes</li>
                      <li>🏆 Gamificação e conquistas</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                Isesemind - Memorização dos 256 Odu Ifá
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Se você não deseja receber estas ofertas, ignore este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Isesemind <noreply@isesemind.com.br>",
        to: [userEmail],
        subject: `🎁 ${discountPercent}% OFF na sua renovação, ${userName}!`,
        html: emailHtml
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      logStep("Error sending email", { status: emailResponse.status, error: errorData });
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    logStep("Email sent", { emailId: emailResult.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Oferta enviada com sucesso!",
        couponCode,
        offerId: offerData.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
