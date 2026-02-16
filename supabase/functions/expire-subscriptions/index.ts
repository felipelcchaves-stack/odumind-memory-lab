import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Buscar período de graça
    const { data: graceSetting } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'subscription_grace_period_days')
      .maybeSingle();

    const graceDays = graceSetting?.value ? parseInt(graceSetting.value) : 0;
    const cutoffDate = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000).toISOString();

    console.log(`[EXPIRE-SUBS] Grace days: ${graceDays}, cutoff: ${cutoffDate}`);

    // Buscar assinaturas expiradas
    const { data: expiredSubs, error } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, plan_name, current_period_end')
      .eq('status', 'active')
      .eq('payment_gateway', 'guru')
      .not('current_period_end', 'is', null)
      .lt('current_period_end', cutoffDate);

    if (error) {
      console.error('[EXPIRE-SUBS] Error fetching:', error);
      throw error;
    }

    console.log(`[EXPIRE-SUBS] Found ${expiredSubs?.length || 0} expired subscriptions`);

    let expiredCount = 0;
    for (const sub of expiredSubs || []) {
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'expired',
          plan_name: 'Gratuito',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id);

      if (updateError) {
        console.error(`[EXPIRE-SUBS] Error expiring ${sub.id}:`, updateError);
      } else {
        expiredCount++;
        console.log(`[EXPIRE-SUBS] Expired: user=${sub.user_id}, old_plan=${sub.plan_name}, period_end=${sub.current_period_end}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      expired_count: expiredCount,
      grace_days: graceDays,
      checked_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[EXPIRE-SUBS] ERROR:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
