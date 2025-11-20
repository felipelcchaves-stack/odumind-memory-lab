import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CLEANUP] Iniciando limpeza de sessões abandonadas...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Executar função de limpeza
    const { error } = await supabase.rpc('cleanup_abandoned_sessions');

    if (error) {
      console.error('[CLEANUP] Erro ao limpar sessões:', error);
      throw error;
    }

    // Contar quantas sessões foram limpas
    const { count } = await supabase
      .from('study_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('auto_finalized', true)
      .gte('ended_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    console.log(`[CLEANUP] Sessões finalizadas automaticamente nas últimas 24h: ${count || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sessões abandonadas limpas com sucesso',
        cleaned_sessions: count || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[CLEANUP] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
