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
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Find pending referral usage for this user
    const { data: referralUsage, error: findError } = await supabaseClient
      .from('referral_usage')
      .select('*')
      .eq('referred_user_id', user_id)
      .eq('status', 'pending')
      .single();

    if (findError || !referralUsage) {
      console.log('No pending referral found for user:', user_id);
      return new Response(
        JSON.stringify({ message: 'Nenhuma indicação pendente encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update referral usage to converted
    const { error: updateError } = await supabaseClient
      .from('referral_usage')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
      })
      .eq('id', referralUsage.id);

    if (updateError) {
      console.error('Error updating referral usage:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar status de indicação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update referral program stats (conversions)
    const { data: currentProgram } = await supabaseClient
      .from('referral_program')
      .select('successful_conversions, total_earned_days')
      .eq('user_id', referralUsage.referrer_id)
      .single();

    const { error: statsError } = await supabaseClient
      .from('referral_program')
      .update({
        successful_conversions: (currentProgram?.successful_conversions || 0) + 1,
        total_earned_days: (currentProgram?.total_earned_days || 0) + 30,
      })
      .eq('user_id', referralUsage.referrer_id);

    if (statsError) {
      console.error('Error updating stats:', statsError);
    }

    // Create reward for referrer (30 days + badge)
    const { error: rewardError } = await supabaseClient
      .from('referral_rewards')
      .insert({
        user_id: referralUsage.referrer_id,
        reward_type: 'premium_days_conversion',
        reward_description: '30 dias Premium grátis por conversão de indicação + Badge Embaixador',
        expires_at: null,
        claimed: false,
      });

    if (rewardError) {
      console.error('Error creating reward:', rewardError);
    }

    // Award badge "Embaixador do Ifá" (if exists)
    const { data: badge } = await supabaseClient
      .from('badges')
      .select('id')
      .eq('code', 'embaixador_ifa')
      .single();

    if (badge) {
      const { error: badgeError } = await supabaseClient
        .from('user_badges')
        .insert({
          user_id: referralUsage.referrer_id,
          badge_id: badge.id,
        })
        .select()
        .single();

      if (badgeError && badgeError.code !== '23505') { // Ignore duplicate key error
        console.error('Error awarding badge:', badgeError);
      }
    }

    console.log('Referral conversion processed for user:', user_id, 'referrer:', referralUsage.referrer_id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Conversão processada com sucesso',
        reward: {
          referrer_id: referralUsage.referrer_id,
          premium_days: 30,
          badge_awarded: !!badge,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in check-referral-conversion:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
