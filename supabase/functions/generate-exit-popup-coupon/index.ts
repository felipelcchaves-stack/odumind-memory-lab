import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CouponRequest {
  email: string;
  source?: string;
}

function generateCouponCode(prefix: string = "ISESE"): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, source = "exit_popup" }: CouponRequest = await req.json();

    if (!email || !email.includes("@")) {
      console.error("Invalid email provided:", email);
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing coupon request for email:", email, "source:", source);

    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get exit popup settings for discount percentage
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("key, value")
      .in("key", ["exit_popup_discount_percent"]);

    const discountPercent = parseInt(
      settings?.find(s => s.key === "exit_popup_discount_percent")?.value || "20"
    );

    // Check if email already has a coupon from this source
    const { data: existingCoupon } = await supabaseAdmin
      .from("discount_coupons")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("source", source)
      .eq("is_active", true)
      .single();

    let coupon;

    if (existingCoupon) {
      console.log("Existing coupon found for email:", existingCoupon.code);
      coupon = existingCoupon;
    } else {
      // Generate unique coupon code
      let code = generateCouponCode();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const { data: existingCode } = await supabaseAdmin
          .from("discount_coupons")
          .select("id")
          .eq("code", code)
          .single();

        if (!existingCode) break;
        
        code = generateCouponCode();
        attempts++;
      }

      // Set expiration to 7 days from now
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 7);

      // Create new coupon
      const { data: newCoupon, error: createError } = await supabaseAdmin
        .from("discount_coupons")
        .insert({
          code,
          discount_percent: discountPercent,
          max_uses: 1,
          email: email.toLowerCase(),
          source,
          valid_until: validUntil.toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating coupon:", createError);
        throw new Error("Erro ao criar cupom");
      }

      coupon = newCoupon;
      console.log("New coupon created:", coupon.code);
    }

    // Send email with coupon using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey) {
      const validUntilDate = new Date(coupon.valid_until);
      const formattedDate = validUntilDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <tr>
              <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #0c0a09 0%, #1c1917 100%);">
                <h1 style="color: #fbbf24; margin: 0; font-size: 28px;">Isesemind</h1>
                <p style="color: #a1a1aa; margin-top: 8px; font-size: 14px;">Memorização dos 256 Odu Ifá</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px;">
                <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">🎁 Seu desconto exclusivo!</h2>
                <p style="color: #52525b; line-height: 1.6; margin-bottom: 30px;">
                  Olá! Você solicitou um cupom de desconto especial. Use o código abaixo para garantir 
                  <strong>${discountPercent}% OFF</strong> na sua assinatura:
                </p>
                
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px dashed #f59e0b; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
                  <p style="color: #92400e; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Seu código de desconto</p>
                  <p style="color: #78350f; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 3px;">${coupon.code}</p>
                </div>
                
                <p style="color: #71717a; font-size: 14px; margin-bottom: 20px;">
                  ⏰ <strong>Válido até:</strong> ${formattedDate}
                </p>
                
                <a href="https://isesemind.ifatokun.com.br/auth?tab=signup"
                   style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Criar Minha Conta Agora
                </a>
                
                <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e4e4e7;">
                  <h3 style="color: #18181b; font-size: 18px; margin-bottom: 15px;">Por que memorizar os Odu?</h3>
                  <ul style="color: #52525b; line-height: 1.8; padding-left: 20px; margin: 0;">
                    <li>📚 Acesso aos 256 Odu Ifá completos</li>
                    <li>🧠 Algoritmo de repetição espaçada personalizado</li>
                    <li>🎯 Memorize em até 14 dias</li>
                    <li>📊 Acompanhe seu progresso em tempo real</li>
                  </ul>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background-color: #fafafa; text-align: center;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} Isesemind. Todos os direitos reservados.<br>
                  Este email foi enviado porque você solicitou um cupom de desconto.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Isesemind <noreply@isesemind.ifatokun.com.br>",
            to: [email],
            subject: `🎁 Seu cupom de ${discountPercent}% de desconto está aqui!`,
            html: emailHtml,
          }),
        });

        if (response.ok) {
          console.log("Email sent successfully to:", email);
        } else {
          const errorData = await response.text();
          console.error("Error sending email:", errorData);
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Não falha a requisição se o email não for enviado
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        code: coupon.code,
        discount: discountPercent,
        validUntil: coupon.valid_until,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error in generate-exit-popup-coupon:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao gerar cupom" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
