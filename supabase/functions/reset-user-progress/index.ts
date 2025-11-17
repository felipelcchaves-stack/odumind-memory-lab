import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Verificar autenticação
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }), 
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Resetting progress for user: ${user.id}`);

    // Deletar todos os dados de progresso do usuário
    const tables = [
      'memorizacao',
      'gamification_logs',
      'conquistas',
      'user_badges',
      'study_sessions',
      'elaborative_notes',
      'mnemonics',
      'memory_palace',
      'unlock_progress',
      'user_learning_profile',
    ];

    for (const table of tables) {
      console.log(`Deleting from table: ${table}`);
      const { error } = await supabaseClient
        .from(table)
        .delete()
        .eq('user_id', user.id);
      
      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        throw error;
      }
    }

    // Resetar campos do perfil
    console.log('Resetting profile fields');
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        xp: 0,
        streak: 0,
        last_study_date: null,
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Error resetting profile:', profileError);
      throw profileError;
    }

    console.log('Progress reset successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Progresso zerado com sucesso' 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in reset-user-progress:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
