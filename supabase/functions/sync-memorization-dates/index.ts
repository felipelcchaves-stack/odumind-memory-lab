import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MemorizacaoRecord {
  id: string;
  user_id: string;
  odu_id: string;
  revisoes: number;
  ultima_revisao: string | null;
  updated_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('🔄 Iniciando sincronização de datas de memorização...');

    // Buscar registros inconsistentes (revisoes > 0 mas ultima_revisao null)
    const { data: inconsistentRecords, error: fetchError } = await supabaseClient
      .from('memorizacao')
      .select('id, user_id, odu_id, revisoes, ultima_revisao, updated_at')
      .gt('revisoes', 0)
      .is('ultima_revisao', null);

    if (fetchError) {
      console.error('❌ Erro ao buscar registros:', fetchError);
      throw fetchError;
    }

    if (!inconsistentRecords || inconsistentRecords.length === 0) {
      console.log('✅ Nenhum registro inconsistente encontrado.');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum registro inconsistente encontrado',
          recordsFixed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Encontrados ${inconsistentRecords.length} registros inconsistentes`);

    let fixedCount = 0;
    const errors: string[] = [];

    // Corrigir cada registro
    for (const record of inconsistentRecords as MemorizacaoRecord[]) {
      try {
        const { error: updateError } = await supabaseClient
          .from('memorizacao')
          .update({
            ultima_revisao: record.updated_at,
          })
          .eq('id', record.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar registro ${record.id}:`, updateError);
          errors.push(`Erro no registro ${record.id}: ${updateError.message}`);
        } else {
          fixedCount++;
          console.log(`✅ Registro ${record.id} corrigido (ultima_revisao = ${record.updated_at})`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Exceção ao processar registro ${record.id}:`, error);
        errors.push(`Exceção no registro ${record.id}: ${errorMessage}`);
      }
    }

    console.log(`🎉 Sincronização concluída: ${fixedCount}/${inconsistentRecords.length} registros corrigidos`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronização concluída com sucesso`,
        totalRecords: inconsistentRecords.length,
        recordsFixed: fixedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro fatal na sincronização:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
