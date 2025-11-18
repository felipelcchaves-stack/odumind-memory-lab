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
    // Cliente para autenticação do usuário
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

    // Cliente admin para deletar dados (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

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

    const deletionResults = [];
    
    for (const table of tables) {
      console.log(`Deleting from table: ${table}`);
      const { data, error, count } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', user.id)
        .select();
      
      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        deletionResults.push({ table, success: false, error: error.message });
      } else {
        console.log(`Deleted ${data?.length || 0} rows from ${table}`);
        deletionResults.push({ table, success: true, deletedRows: data?.length || 0 });
      }
    }

    // Resetar campos do perfil
    console.log('Resetting profile fields');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        xp: 0,
        streak: 0,
        last_study_date: null,
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Error resetting profile:', profileError);
      deletionResults.push({ table: 'profiles', success: false, error: profileError.message });
    } else {
      console.log('Profile reset successfully');
      deletionResults.push({ table: 'profiles', success: true, action: 'updated' });
    }

    console.log('Progress reset completed with results:', deletionResults);
    
    const hasErrors = deletionResults.some(r => !r.success);
    
    return new Response(
      JSON.stringify({ 
        success: !hasErrors, 
        message: hasErrors ? 'Progresso parcialmente zerado (alguns erros ocorreram)' : 'Progresso zerado com sucesso',
        details: deletionResults
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
