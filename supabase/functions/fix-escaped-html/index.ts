import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OduRecord {
  id: string;
  texto_principal: string | null;
  verso: string | null;
  significado: string | null;
  exemplos_praticos: string | null;
  contexto_historico: string | null;
}

/**
 * Edge Function para limpar caracteres HTML escapados em todos os Odus
 * Executa uma vez para corrigir dados legados no banco
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verifica autenticação (apenas admins)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Autenticação inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verifica se é admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem executar esta função' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔧 Iniciando limpeza de HTML escapado nos Odus...');

    // Busca todos os Odus
    const { data: odus, error: fetchError } = await supabaseClient
      .from('odu')
      .select('id, texto_principal, verso, significado, exemplos_praticos, contexto_historico')
      .returns<OduRecord[]>();

    if (fetchError) {
      throw new Error(`Erro ao buscar Odus: ${fetchError.message}`);
    }

    if (!odus || odus.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum Odu encontrado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📚 Processando ${odus.length} Odus...`);

    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Função para decodificar HTML escapado múltiplas vezes
    const decodeHtmlRecursive = (html: string | null): string | null => {
      if (!html) return html;

      let decoded = html;
      let previousDecoded = '';
      let iterations = 0;
      const maxIterations = 10;

      while (decoded !== previousDecoded && iterations < maxIterations) {
        previousDecoded = decoded;
        decoded = decoded
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&#x27;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/&apos;/g, "'");
        iterations++;
      }

      return decoded;
    };

    // Processa cada Odu
    for (const odu of odus) {
      const updates: Partial<OduRecord> = {};
      let needsUpdate = false;

      // Verifica e decodifica cada campo HTML
      const fieldsToCheck = [
        'texto_principal',
        'verso',
        'significado',
        'exemplos_praticos',
        'contexto_historico'
      ] as const;

      for (const field of fieldsToCheck) {
        const originalValue = odu[field];
        if (originalValue && typeof originalValue === 'string') {
          // Verifica se contém HTML escapado
          if (originalValue.includes('&lt;') || originalValue.includes('&gt;') || 
              originalValue.includes('&amp;') || originalValue.includes('&quot;')) {
            const decodedValue = decodeHtmlRecursive(originalValue);
            if (decodedValue !== originalValue) {
              updates[field] = decodedValue;
              needsUpdate = true;
            }
          }
        }
      }

      if (needsUpdate) {
        console.log(`🔄 Atualizando Odu ${odu.id}...`);
        
        const { error: updateError } = await supabaseClient
          .from('odu')
          .update(updates)
          .eq('id', odu.id);

        if (updateError) {
          const errorMsg = `Erro ao atualizar Odu ${odu.id}: ${updateError.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        } else {
          updatedCount++;
          console.log(`✅ Odu ${odu.id} atualizado com sucesso`);
        }
      } else {
        skippedCount++;
      }
    }

    const summary = {
      total: odus.length,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.length,
      errorDetails: errors
    };

    console.log('📊 Resumo da limpeza:', summary);

    return new Response(
      JSON.stringify({
        message: 'Limpeza concluída',
        summary
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: 'Erro ao processar limpeza de HTML'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
