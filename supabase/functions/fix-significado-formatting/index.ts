import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Formata o campo significado adicionando quebras de linha antes de "Ifá diz"
 * Garante que sempre haja DUAS quebras de linha antes de "Ifá diz"
 */
function formatSignificado(text: string | null): string | null {
  if (!text || typeof text !== 'string') return null;
  
  const trimmed = text.trim();
  if (!trimmed) return null;
  
  // Detecta se é HTML ou texto puro
  const isHtml = /<[^>]+>/.test(trimmed);
  
  // Padrão para detectar variações de "Ifá diz"
  const ifaDizVariants = '(Ifá\\s+diz|Ifa\\s+diz|IFÁ\\s+diz|IFA\\s+diz)';
  
  let result = trimmed;
  
  if (isHtml) {
    // Para HTML: garantir <br><br> antes de "Ifá diz"
    
    // ETAPA 1: Normalizar - converter qualquer combinação de <br> antes de "Ifá diz" para marcador
    result = result.replace(
      new RegExp(`(<br\\s*\\/?>\\s*)+${ifaDizVariants}`, 'gi'),
      '{{BREAK_MARKER}}$1'
    );
    
    // ETAPA 2: Adicionar marcador onde não há nenhuma quebra antes de "Ifá diz"
    result = result.replace(
      new RegExp(`(?<!>)(?<!{{BREAK_MARKER}})${ifaDizVariants}`, 'gi'),
      '{{BREAK_MARKER}}$1'
    );
    
    // ETAPA 3: Substituir todos os marcadores por <br><br>
    result = result.replace(/{{BREAK_MARKER}}/g, '<br><br>');
    
  } else {
    // Para texto puro: garantir \n\n antes de "Ifá diz"
    
    // ETAPA 1: Normalizar - converter qualquer quantidade de \n antes de "Ifá diz" para marcador
    result = result.replace(
      new RegExp(`\\n+${ifaDizVariants}`, 'gi'),
      '{{BREAK_MARKER}}$1'
    );
    
    // ETAPA 2: Adicionar marcador onde não há nenhuma quebra antes de "Ifá diz"
    result = result.replace(
      new RegExp(`(?<!\\n)(?<!{{BREAK_MARKER}})${ifaDizVariants}`, 'gi'),
      '{{BREAK_MARKER}}$1'
    );
    
    // ETAPA 3: Substituir todos os marcadores por \n\n
    result = result.replace(/{{BREAK_MARKER}}/g, '\n\n');
  }
  
  // Limpar quebras duplicadas no início do texto
  result = result.replace(/^(<br\s*\/?\>\s*)+/i, '');
  result = result.replace(/^\n+/, '');
  
  return result.trim();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[FIX-SIGNIFICADO] Iniciando correção em massa...');

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[FIX-SIGNIFICADO] Token não fornecido');
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Cliente com token do usuário para verificar permissões
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verificar usuário
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('[FIX-SIGNIFICADO] Usuário não autenticado:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin ou colaborador
    const { data: hasRole, error: roleError } = await supabaseUser.rpc('has_colaborador_role', { _user_id: user.id });
    if (roleError || !hasRole) {
      console.error('[FIX-SIGNIFICADO] Sem permissão:', { userId: user.id, roleError });
      return new Response(
        JSON.stringify({ error: 'Sem permissão para executar esta ação' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[FIX-SIGNIFICADO] Usuário autorizado:', user.email);

    // Cliente admin para fazer as atualizações
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todos os Odus com significado não-nulo
    const { data: odus, error: fetchError } = await supabaseAdmin
      .from('odu')
      .select('id, numero, nome, significado')
      .not('significado', 'is', null);

    if (fetchError) {
      console.error('[FIX-SIGNIFICADO] Erro ao buscar Odus:', fetchError);
      throw fetchError;
    }

    console.log(`[FIX-SIGNIFICADO] Encontrados ${odus?.length || 0} Odus com significado`);

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const odu of odus || []) {
      const original = odu.significado;
      const formatted = formatSignificado(original);

      // Só atualiza se houve mudança
      if (formatted !== original && formatted !== null) {
        console.log(`[FIX-SIGNIFICADO] Atualizando Odu #${odu.numero} - diferença detectada`);
        
        const { error: updateError } = await supabaseAdmin
          .from('odu')
          .update({ significado: formatted })
          .eq('id', odu.id);

        if (updateError) {
          console.error(`[FIX-SIGNIFICADO] Erro ao atualizar Odu #${odu.numero}:`, updateError);
          errors.push(`Odu #${odu.numero} (${odu.nome}): ${updateError.message}`);
        } else {
          console.log(`[FIX-SIGNIFICADO] ✅ Odu #${odu.numero} atualizado`);
          updated++;
        }
      } else {
        skipped++;
      }
    }

    console.log(`[FIX-SIGNIFICADO] Concluído: ${updated} atualizados, ${skipped} sem mudanças, ${errors.length} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Formatação concluída: ${updated} Odu(s) atualizado(s), ${skipped} sem mudanças`,
        updated,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        total: odus?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    console.error('[FIX-SIGNIFICADO] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
