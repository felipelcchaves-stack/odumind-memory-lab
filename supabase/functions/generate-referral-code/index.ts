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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a referral code
    const { data: existing } = await supabaseClient
      .from('referral_program')
      .select('referral_code')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ referral_code: existing.referral_code }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's name from profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('nome')
      .eq('user_id', user.id)
      .single();

    // Generate unique code
    const generateCode = (name: string): string => {
      const cleanName = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 6);
      
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      return `${cleanName}${randomNum}`;
    };

    let referralCode = generateCode(profile?.nome || 'USER');
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure uniqueness
    while (attempts < maxAttempts) {
      const { data: duplicate } = await supabaseClient
        .from('referral_program')
        .select('referral_code')
        .eq('referral_code', referralCode)
        .single();

      if (!duplicate) break;
      
      referralCode = generateCode(profile?.nome || 'USER');
      attempts++;
    }

    // Create referral program entry
    const { data, error } = await supabaseClient
      .from('referral_program')
      .insert({
        user_id: user.id,
        referral_code: referralCode,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar código de indicação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Referral code generated:', referralCode, 'for user:', user.id);

    return new Response(
      JSON.stringify({ referral_code: data.referral_code }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in generate-referral-code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
