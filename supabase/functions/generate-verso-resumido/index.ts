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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Validar JWT do usuário com ANON_KEY
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente para validar o usuário (usa ANON_KEY com o token do usuário)
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente admin para operações no banco (usa SERVICE_ROLE_KEY)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar se usuário é admin ou colaborador
    const { data: hasPermission } = await supabaseAdmin.rpc('has_colaborador_role', {
      _user_id: user.id
    });

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin or Colaborador role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { oduId, batchMode } = body;

    console.log('Generate verso resumido request:', { oduId, batchMode });

    let odusToProcess = [];

    if (batchMode) {
      // Buscar todos os Odus sem verso_resumido
      const { data: odus, error: fetchError } = await supabaseAdmin
        .from('odu')
        .select('id, numero, nome, texto_principal, verso, significado')
        .or('verso_resumido.is.null,verso_resumido.eq.')
        .order('numero');

      if (fetchError) {
        console.error('Error fetching odus:', fetchError);
        throw fetchError;
      }

      odusToProcess = odus || [];
      console.log(`Found ${odusToProcess.length} odus to process`);
    } else {
      // Processar apenas um Odu específico
      const { data: odu, error: fetchError } = await supabaseAdmin
        .from('odu')
        .select('id, numero, nome, texto_principal, verso, significado')
        .eq('id', oduId)
        .single();

      if (fetchError) {
        console.error('Error fetching odu:', fetchError);
        throw fetchError;
      }

      odusToProcess = [odu];
    }

    if (odusToProcess.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No odus to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    const errors = [];

    for (const odu of odusToProcess) {
      try {
        console.log(`Processing Odu #${odu.numero} - ${odu.nome}`);

        // Montar o prompt para a IA
        const prompt = `Você é um especialista em Ifá e tradição Yorubá. Crie um verso resumido memorável para o Odu ${odu.nome} (#${odu.numero}).

Informações do Odu:
- Nome: ${odu.nome}
- Texto Principal: ${odu.texto_principal}
${odu.significado ? `- Significado: ${odu.significado}` : ''}
${odu.verso ? `- Verso Completo: ${odu.verso}` : ''}

REGRAS IMPORTANTES:
1. O verso resumido deve ter entre 10 e 150 caracteres
2. Deve ser poético, memorável e representar a essência do Odu
3. Deve ser curto o suficiente para ser facilmente lembrado
4. Deve capturar o significado principal do Odu
5. Use linguagem simples mas evocativa
6. NÃO use aspas no verso

Exemplos de bons versos resumidos:
- "A luz purifica o que estava sujo"
- "Onde há luz, há sombra; onde há dia, há noite"
- "A luz revela o que estava oculto"
- "Mesmo bloqueada, a luz encontra seu caminho"

Retorne APENAS o verso resumido, sem aspas, sem explicações adicionais.`;

        // Chamar a IA
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'Você é um especialista em Ifá e tradição Yorubá. Crie versos resumidos memoráveis e poéticos para os Odu de Ifá.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.8,
            max_tokens: 200,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API error for Odu ${odu.numero}:`, aiResponse.status, errorText);
          
          if (aiResponse.status === 429) {
            errors.push({ odu: odu.numero, error: 'Rate limit exceeded' });
            continue;
          }
          if (aiResponse.status === 402) {
            errors.push({ odu: odu.numero, error: 'Payment required' });
            break; // Para o processamento em batch se não há créditos
          }
          
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        let versoResumido = aiData.choices[0]?.message?.content?.trim() || '';

        // Limpar o verso (remover aspas se houver)
        versoResumido = versoResumido.replace(/^["']|["']$/g, '');

        // Validar tamanho
        if (versoResumido.length < 10) {
          errors.push({ 
            odu: odu.numero, 
            error: 'Generated verse too short',
            generated: versoResumido 
          });
          continue;
        }

        if (versoResumido.length > 150) {
          versoResumido = versoResumido.substring(0, 147) + '...';
        }

        console.log(`Generated verse for #${odu.numero}: "${versoResumido}"`);

        // Atualizar o Odu
        const { error: updateError } = await supabaseAdmin
          .from('odu')
          .update({ verso_resumido: versoResumido })
          .eq('id', odu.id);

        if (updateError) {
          console.error(`Error updating Odu ${odu.numero}:`, updateError);
          errors.push({ odu: odu.numero, error: updateError.message });
          continue;
        }

        results.push({
          numero: odu.numero,
          nome: odu.nome,
          verso_resumido: versoResumido,
          success: true
        });

        // Delay entre requisições para evitar rate limit
        if (batchMode && odusToProcess.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Error processing Odu ${odu.numero}:`, error);
        errors.push({ 
          odu: odu.numero, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const response = {
      success: true,
      processed: results.length,
      total: odusToProcess.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully generated ${results.length} of ${odusToProcess.length} verses`
    };

    console.log('Generation complete:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-verso-resumido:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
