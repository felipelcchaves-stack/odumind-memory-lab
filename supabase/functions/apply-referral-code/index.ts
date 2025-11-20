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
    const { referral_code } = await req.json();

    if (!referral_code) {
      return new Response(
        JSON.stringify({ error: 'Código de indicação é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already used a referral code
    const { data: alreadyUsed } = await supabaseClient
      .from('referral_usage')
      .select('id')
      .eq('referred_user_id', user.id)
      .single();

    if (alreadyUsed) {
      return new Response(
        JSON.stringify({ error: 'Você já usou um código de indicação' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find referral program by code
    const { data: referralProgram, error: findError } = await supabaseClient
      .from('referral_program')
      .select('user_id, referral_code')
      .eq('referral_code', referral_code.toUpperCase())
      .single();

    if (findError || !referralProgram) {
      console.error('Referral code not found:', findError);
      return new Response(
        JSON.stringify({ error: 'Código de indicação inválido' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Can't use your own referral code
    if (referralProgram.user_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Você não pode usar seu próprio código' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create referral usage record
    const { error: usageError } = await supabaseClient
      .from('referral_usage')
      .insert({
        referrer_id: referralProgram.user_id,
        referred_user_id: user.id,
        referral_code: referral_code.toUpperCase(),
        reward_type: 'premium_days',
        reward_value: 7,
        status: 'pending',
      });

    if (usageError) {
      console.error('Usage insert error:', usageError);
      return new Response(
        JSON.stringify({ error: 'Erro ao aplicar código de indicação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update referral program stats
    const { error: updateError } = await supabaseClient
      .from('referral_program')
      .update({
        total_referrals: supabaseClient.rpc('increment', { x: 1 }),
      })
      .eq('user_id', referralProgram.user_id);

    if (updateError) {
      console.error('Stats update error:', updateError);
    }

    // Create rewards for both users (7 days for new user)
    const { error: rewardError } = await supabaseClient
      .from('referral_rewards')
      .insert({
        user_id: user.id,
        reward_type: 'premium_days',
        reward_description: '7 dias Premium grátis por usar código de indicação',
        expires_at: null,
        claimed: false,
      });

    if (rewardError) {
      console.error('Reward insert error:', rewardError);
    }

    console.log('Referral code applied:', referral_code, 'by user:', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Código aplicado com sucesso! Você ganhou 7 dias Premium grátis.',
        reward: {
          type: 'premium_days',
          value: 7,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in apply-referral-code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
