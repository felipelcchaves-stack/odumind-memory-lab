import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MemorizacaoData {
  id: string;
  user_id: string;
  forca_memoria: number;
  ultima_revisao: string | null;
  revisoes: number;
  // memorizacao.odu_id é uma FK muitos-para-um -> o Supabase embute como
  // objeto único, não array.
  odu: {
    id: string;
    numero: number;
    nome: string;
  } | null;
}

function predictForgetProbability(
  forcaMemoria: number,
  ultimaRevisao: string | null,
  revisoes: number
): number {
  if (!ultimaRevisao) return 1.0;

  const lastDate = new Date(ultimaRevisao);
  const now = new Date();
  const daysSinceReview = Math.max(0, (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  // Curva de Ebbinghaus: R = e^(-t/S)
  // R = retenção, t = tempo, S = força de memória
  const retentionStrength = forcaMemoria * (1 + revisoes * 0.2);
  const forgettingCurve = Math.exp(-daysSinceReview / (retentionStrength / 10));
  
  return 1 - forgettingCurve;
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
          persistSession: false
        }
      }
    );

    // Buscar todos os usuários com Odus memorizados
    const { data: memData, error: memError } = await supabaseClient
      .from('memorizacao')
      .select(`
        id,
        user_id,
        forca_memoria,
        ultima_revisao,
        revisoes,
        proxima_revisao,
        odu (
          id,
          numero,
          nome
        )
      `)
      .eq('status', 'memorizado')
      .not('ultima_revisao', 'is', null);

    if (memError) throw memError;
    if (!memData || memData.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No memorized odus found', checked: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const usersWithRiskOdus = new Map<string, Array<any>>();

    // Analisar cada Odu
    for (const mem of memData as MemorizacaoData[]) {
      if (!mem.odu) continue;

      const odu = mem.odu;
      const forgetProb = predictForgetProbability(
        mem.forca_memoria,
        mem.ultima_revisao,
        mem.revisoes
      );

      // Se probabilidade > 30%, adicionar à lista de risco
      if (forgetProb > 0.3) {
        if (!usersWithRiskOdus.has(mem.user_id)) {
          usersWithRiskOdus.set(mem.user_id, []);
        }
        
        usersWithRiskOdus.get(mem.user_id)?.push({
          odu_id: odu.id,
          odu_numero: odu.numero,
          odu_nome: odu.nome,
          forget_probability: Math.round(forgetProb * 100),
          days_since_review: Math.floor(
            (Date.now() - new Date(mem.ultima_revisao!).getTime()) / (1000 * 60 * 60 * 24)
          )
        });
      }
    }

    // Agendar revisões proativas
    const updates = [];
    for (const [userId, odusAtRisk] of usersWithRiskOdus.entries()) {
      // Ordenar por maior risco
      odusAtRisk.sort((a, b) => b.forget_probability - a.forget_probability);
      
      // Pegar top 5 em risco
      const topRisk = odusAtRisk.slice(0, 5);
      
      // Atualizar próxima revisão para "agora" ou próximas horas
      for (const odu of topRisk) {
        const now = new Date();
        // Agendar revisão baseado no risco
        const hoursUntilReview = odu.forget_probability > 70 ? 0 : 
                                 odu.forget_probability > 50 ? 2 : 6;
        
        now.setHours(now.getHours() + hoursUntilReview);
        
        updates.push(
          supabaseClient
            .from('memorizacao')
            .update({ proxima_revisao: now.toISOString() })
            .eq('user_id', userId)
            .match({ 
              odu_id: odu.odu_id 
            })
        );
      }

      console.log(`User ${userId}: ${topRisk.length} odus at risk scheduled for review`);
    }

    await Promise.all(updates);

    return new Response(
      JSON.stringify({
        message: 'Forgetting risk check completed',
        checked: memData.length,
        usersWithRisk: usersWithRiskOdus.size,
        totalOdusAtRisk: Array.from(usersWithRiskOdus.values()).reduce((sum, arr) => sum + arr.length, 0)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in check-forgetting-risk:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
