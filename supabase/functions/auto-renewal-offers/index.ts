import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-RENEWAL-OFFERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Automated renewal offers check started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get automation settings from app_settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'auto_renewal_enabled',
        'auto_renewal_days_before',
        'auto_renewal_discount_percent'
      ]);

    const settingsMap = settings?.reduce((acc: Record<string, string>, s) => {
      acc[s.key] = s.value ?? '';
      return acc;
    }, {}) || {};

    const isEnabled = settingsMap['auto_renewal_enabled'] === 'true';
    const daysBefore = parseInt(settingsMap['auto_renewal_days_before'] || '7', 10);
    const discountPercent = parseInt(settingsMap['auto_renewal_discount_percent'] || '15', 10);

    logStep("Settings loaded", { isEnabled, daysBefore, discountPercent });

    if (!isEnabled) {
      logStep("Auto renewal offers is disabled");
      return new Response(
        JSON.stringify({ success: true, message: "Auto renewal is disabled", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate target date range
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + daysBefore);
    
    // Find subscriptions expiring around the target date (within 1 day range)
    const startRange = new Date(targetDate);
    startRange.setHours(0, 0, 0, 0);
    const endRange = new Date(targetDate);
    endRange.setHours(23, 59, 59, 999);

    logStep("Looking for subscriptions expiring", { 
      daysBefore, 
      targetDate: targetDate.toISOString(),
      range: { start: startRange.toISOString(), end: endRange.toISOString() }
    });

    // Get subscriptions expiring in the target range
    const { data: expiringSubscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        user_id,
        plan_name,
        current_period_end,
        stripe_subscription_id
      `)
      .in('status', ['active', 'trialing'])
      .neq('plan_name', 'free')
      .gte('current_period_end', startRange.toISOString())
      .lte('current_period_end', endRange.toISOString());

    if (subError) {
      throw new Error(`Error fetching subscriptions: ${subError.message}`);
    }

    logStep("Found expiring subscriptions", { count: expiringSubscriptions?.length || 0 });

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions expiring", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user IDs that already have pending/sent offers
    const userIds = expiringSubscriptions.map(s => s.user_id);
    const { data: existingOffers } = await supabase
      .from('renewal_offers')
      .select('user_id')
      .in('user_id', userIds)
      .in('status', ['sent', 'opened'])
      .gte('expires_at', now.toISOString());

    const usersWithOffers = new Set(existingOffers?.map(o => o.user_id) || []);
    logStep("Users already with offers", { count: usersWithOffers.size });

    // Filter out users that already have offers
    const subscriptionsToProcess = expiringSubscriptions.filter(
      s => !usersWithOffers.has(s.user_id)
    );

    logStep("Subscriptions to process", { count: subscriptionsToProcess.length });

    // Get user details (emails) using admin API
    const { data: userEmails } = await supabase.rpc('get_user_emails', {
      user_ids: subscriptionsToProcess.map(s => s.user_id)
    });

    const emailMap = new Map(userEmails?.map((u: { user_id: string; email: string }) => [u.user_id, u.email]) || []);

    // Get profile names
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, nome')
      .in('user_id', subscriptionsToProcess.map(s => s.user_id));

    const nameMap = new Map(profiles?.map(p => [p.user_id, p.nome]) || []);

    // Plan prices (same as in advancedAnalytics.ts)
    const planPrices: Record<string, number> = {
      'Premium': 49.90,
      'Profissional': 99.90,
      'Familia': 129.90,
      'premium_yearly': 499.90,
      'profissional_yearly': 999.90
    };

    let sentCount = 0;
    const errors: string[] = [];

    // Process each subscription
    for (const subscription of subscriptionsToProcess) {
      const userEmail = emailMap.get(subscription.user_id);
      const userName = nameMap.get(subscription.user_id) || 'Estudante';
      const originalValue = planPrices[subscription.plan_name] || 49.90;

      if (!userEmail) {
        logStep("No email found for user", { userId: subscription.user_id });
        continue;
      }

      try {
        // Generate unique coupon code
        const couponCode = `AUTO${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        const discountedValue = originalValue * (1 - discountPercent / 100);
        const couponExpiresAt = new Date();
        couponExpiresAt.setDate(couponExpiresAt.getDate() + 14); // 14 days to use

        // Create coupon
        const { data: couponData, error: couponError } = await supabase
          .from('discount_coupons')
          .insert({
            code: couponCode,
            discount_percent: discountPercent,
            max_uses: 1,
            valid_until: couponExpiresAt.toISOString(),
            email: userEmail,
            source: 'auto_renewal'
          })
          .select()
          .single();

        if (couponError) {
          throw new Error(`Coupon creation failed: ${couponError.message}`);
        }

        // Create renewal offer record
        const { error: offerError } = await supabase
          .from('renewal_offers')
          .insert({
            user_id: subscription.user_id,
            coupon_id: couponData.id,
            offer_type: 'auto_renewal',
            discount_percent: discountPercent,
            status: 'sent',
            sent_at: new Date().toISOString(),
            expires_at: couponExpiresAt.toISOString(),
            plan_name: subscription.plan_name,
            original_value: originalValue,
            email_sent_to: userEmail
          });

        if (offerError) {
          throw new Error(`Offer record creation failed: ${offerError.message}`);
        }

        // Format dates for email
        const expiresAtFormatted = new Date(subscription.current_period_end!).toLocaleDateString('pt-BR', {
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
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎁 Sua Renovação com Desconto Especial</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Olá <strong>${userName}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Sua assinatura do plano <strong>${subscription.plan_name}</strong> expira em <strong>${expiresAtFormatted}</strong>.
              </p>
              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                Preparamos um desconto exclusivo para você continuar sua jornada de memorização dos Odu Ifá:
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
                      Renovar com Desconto →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; text-align: center;">
                ⏰ Esta oferta expira em <strong>${couponExpiresFormatted}</strong>
              </p>
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
          throw new Error(`Email sending failed: ${errorData}`);
        }

        sentCount++;
        logStep("Offer sent successfully", { userId: subscription.user_id, email: userEmail, couponCode });

      } catch (err: any) {
        logStep("Error processing subscription", { userId: subscription.user_id, error: err.message });
        errors.push(`${subscription.user_id}: ${err.message}`);
      }
    }

    logStep("Processing complete", { sent: sentCount, errors: errors.length });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${subscriptionsToProcess.length} subscriptions`,
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
