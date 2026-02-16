import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-EXPIRING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Target: subscriptions expiring in exactly 3 days
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    const startRange = new Date(targetDate);
    startRange.setHours(0, 0, 0, 0);
    const endRange = new Date(targetDate);
    endRange.setHours(23, 59, 59, 999);

    logStep("Looking for subscriptions expiring around", { date: targetDate.toISOString() });

    const { data: expiringSubs, error: subError } = await supabase
      .from('subscriptions')
      .select('user_id, plan_name, current_period_end')
      .in('status', ['active', 'trialing'])
      .not('current_period_end', 'is', null)
      .gte('current_period_end', startRange.toISOString())
      .lte('current_period_end', endRange.toISOString());

    if (subError) throw new Error(`Fetch error: ${subError.message}`);

    logStep("Found expiring subscriptions", { count: expiringSubs?.length || 0 });

    if (!expiringSubs || expiringSubs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions expiring in 3 days", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = expiringSubs.map(s => s.user_id);

    // Get emails and profiles
    const [emailsResult, profilesResult] = await Promise.all([
      supabase.rpc('get_user_emails', { user_ids: userIds }),
      supabase.from('profiles').select('user_id, nome').in('user_id', userIds),
    ]);

    const emailMap = new Map(emailsResult.data?.map((u: any) => [u.user_id, u.email]) || []);
    const nameMap = new Map(profilesResult.data?.map((p: any) => [p.user_id, p.nome]) || []);

    let sentCount = 0;

    for (const sub of expiringSubs) {
      const email = emailMap.get(sub.user_id);
      const nome = nameMap.get(sub.user_id) || 'Estudante';
      if (!email) continue;

      const expiresFormatted = new Date(sub.current_period_end!).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:40px 20px;">
      <table role="presentation" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:40px 30px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:26px;">⏰ Sua Assinatura Expira em 3 Dias</h1>
        </td></tr>
        <tr><td style="padding:40px 30px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;">Olá <strong>${nome}</strong>,</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;">
            Sua assinatura do plano <strong>${sub.plan_name}</strong> expira em <strong>${expiresFormatted}</strong>.
          </p>
          <p style="color:#374151;font-size:16px;line-height:1.6;">
            Não perca seu progresso de memorização dos Odu Ifá! Renove agora para continuar sua jornada sem interrupções.
          </p>
          <table role="presentation" style="width:100%;margin:30px 0;"><tr><td style="text-align:center;">
            <a href="https://isesemind.com.br/assinatura" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;text-decoration:none;padding:15px 40px;border-radius:8px;font-size:16px;font-weight:bold;">
              Renovar Agora →
            </a>
          </td></tr></table>
          <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:20px;margin-top:20px;">
            <p style="margin:0;color:#92400e;font-size:14px;">
              💡 <strong>Dica:</strong> Após a expiração, seu acesso será limitado ao plano gratuito e você perderá acesso aos conteúdos premium.
            </p>
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:25px 30px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 10px;color:#6b7280;font-size:14px;">Isesemind - Memorização dos 256 Odu Ifá</p>
          <p style="margin:0;color:#9ca3af;font-size:12px;">Se não deseja receber estes avisos, ignore este email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Isesemind <noreply@isesemind.com.br>",
            to: [email],
            subject: `⏰ ${nome}, sua assinatura expira em 3 dias!`,
            html: emailHtml,
          }),
        });

        if (!res.ok) throw new Error(await res.text());
        sentCount++;
        logStep("Email sent", { userId: sub.user_id });
      } catch (err: any) {
        logStep("Email error", { userId: sub.user_id, error: err.message });
      }
    }

    logStep("Done", { sent: sentCount });

    return new Response(
      JSON.stringify({ success: true, sent: sentCount }),
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
