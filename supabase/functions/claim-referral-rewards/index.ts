import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Database access runs with the service role ONLY. The caller's JWT is used just to identify
    // them: passing it as the client's Authorization header (as before) made every query run as the
    // student, which depended on the "Users can update/insert their own subscription" policies that
    // let any student give themselves a paid plan (dropped in 20261009120000).
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[CLAIM-REWARDS] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CLAIM-REWARDS] Processing rewards for user:', user.id);

    // Get unclaimed rewards
    const { data: unclaimedRewards, error: rewardsError } = await supabaseClient
      .from('referral_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('claimed', false)
      .eq('reward_type', 'premium_days');

    if (rewardsError) {
      console.error('[CLAIM-REWARDS] Error fetching rewards:', rewardsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar recompensas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!unclaimedRewards || unclaimedRewards.length === 0) {
      console.log('[CLAIM-REWARDS] No unclaimed rewards found');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Nenhuma recompensa pendente',
          days_added: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark the rewards as claimed FIRST, only those still unclaimed, so two calls at the same time
    // cannot both apply the same days. They are released again below if the subscription write fails.
    const { data: claimedRewards, error: claimError } = await supabaseClient
      .from('referral_rewards')
      .update({ claimed: true })
      .in('id', unclaimedRewards.map(r => r.id))
      .eq('claimed', false)
      .select('*');

    if (claimError) {
      console.error('[CLAIM-REWARDS] Error marking rewards as claimed:', claimError);
      return new Response(
        JSON.stringify({ error: 'Erro ao aplicar benefícios' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!claimedRewards || claimedRewards.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma recompensa pendente', days_added: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const rewardIds = claimedRewards.map(r => r.id);
    const releaseRewards = async () => {
      const { error } = await supabaseClient.from('referral_rewards').update({ claimed: false }).in('id', rewardIds);
      if (error) console.error('[CLAIM-REWARDS] Error releasing rewards:', error);
    };

    // Calculate total days from reward descriptions (e.g., "7 dias Premium grátis")
    const totalDays = claimedRewards.reduce((total, reward) => {
      const match = reward.reward_description.match(/(\d+)\s*dias?/i);
      return total + (match ? parseInt(match[1]) : 0);
    }, 0);

    console.log('[CLAIM-REWARDS] Total days to add:', totalDays);

    // Get current subscription
    const { data: currentSub, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('[CLAIM-REWARDS] Error fetching subscription:', subError);
      await releaseRewards();
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar assinatura' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const daysToAdd = totalDays;
    let newPeriodEnd: Date;

    if (!currentSub || currentSub.plan_name === 'Gratuito' || currentSub.status === 'free') {
      // User is on free plan - create/update to Premium
      newPeriodEnd = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      
      console.log('[CLAIM-REWARDS] Upgrading free user to Premium until:', newPeriodEnd);

      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan_name: 'Premium',
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
          updated_at: now.toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) {
        console.error('[CLAIM-REWARDS] Error updating subscription:', updateError);
        await releaseRewards();
        return new Response(
          JSON.stringify({ error: 'Erro ao aplicar benefícios' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // User has paid plan - extend current_period_end
      const currentEnd = currentSub.current_period_end 
        ? new Date(currentSub.current_period_end)
        : now;
      
      newPeriodEnd = new Date(currentEnd.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      
      console.log('[CLAIM-REWARDS] Extending paid subscription from', currentEnd, 'to', newPeriodEnd);

      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .update({
          current_period_end: newPeriodEnd.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', currentSub.id);

      if (updateError) {
        console.error('[CLAIM-REWARDS] Error extending subscription:', updateError);
        await releaseRewards();
        return new Response(
          JSON.stringify({ error: 'Erro ao estender assinatura' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[CLAIM-REWARDS] Successfully claimed rewards:', rewardIds.length, 'rewards,', totalDays, 'days added');

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalDays} dias Premium adicionados à sua conta!`,
        days_added: totalDays,
        new_period_end: newPeriodEnd.toISOString(),
        rewards_claimed: rewardIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[CLAIM-REWARDS] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
