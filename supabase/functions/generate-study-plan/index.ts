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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's study schedule
    const { data: schedule } = await supabase
      .from('study_schedule')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('dia_semana', { ascending: true });

    if (!schedule || schedule.length === 0) {
      throw new Error('Nenhum horário de estudo configurado');
    }

    // Get user's learning profile
    const { data: profile } = await supabase
      .from('user_learning_profile')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get user's current progress
    const { data: progress } = await supabase
      .from('memorizacao')
      .select('status')
      .eq('user_id', user.id);

    const totalOdus = 256;
    const odusMemorizados = progress?.filter(p => p.status === 'memorizado').length || 0;
    const odusEstudando = progress?.filter(p => p.status === 'estudando').length || 0;
    const odusRestantes = totalOdus - odusMemorizados;

    // Calculate total weekly study time
    const totalMinutosSemanais = schedule.reduce((acc, s) => acc + s.duracao_minutos, 0);
    const sessoesSemanais = schedule.length;

    // Build AI prompt
    const systemPrompt = `Você é um especialista em planejamento de estudos e memorização, especializado no método de repetição espaçada para os 256 Odu de Ifá.

Seu objetivo é criar um plano de estudos personalizado e realista baseado na disponibilidade do usuário.

REGRAS IMPORTANTES:
1. Use o método de repetição espaçada (SuperMemo 2)
2. Novos Odus: primeira exposição precisa de 3-4 revisões nas primeiras 2 semanas
3. Odus em estudo: precisam de revisões periódicas
4. Considere o perfil de aprendizagem do usuário
5. Seja realista: não sobrecarregue o aluno
6. Priorize consistência sobre intensidade
7. Reserve tempo para revisões de Odus já memorizados

FORMATO DE RESPOSTA (JSON):
{
  "estimativa_dias": number,
  "sessoes_por_semana": number,
  "novos_odus_por_sessao": number,
  "revisoes_por_sessao": number,
  "observacoes": string[],
  "cronograma_semanal": [
    {
      "dia": string,
      "horario": string,
      "atividade": string,
      "duracao_minutos": number
    }
  ]
}`;

    const userPrompt = `SITUAÇÃO ATUAL DO ALUNO:
- Odus memorizados: ${odusMemorizados}
- Odus em estudo: ${odusEstudando}
- Odus restantes: ${odusRestantes}

PERFIL DE APRENDIZAGEM:
- Aprendiz rápido: ${profile?.fast_learner ? 'Sim' : 'Não'}
- Precisa de reforço: ${profile?.needs_reinforcement ? 'Sim' : 'Não'}
- Acurácia média: ${profile?.average_accuracy || 0}%
- Tempo ideal de sessão: ${profile?.optimal_session_time || 20} minutos

DISPONIBILIDADE SEMANAL:
Total de minutos por semana: ${totalMinutosSemanais}
Sessões por semana: ${sessoesSemanais}
Horários disponíveis:
${schedule.map(s => {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return `- ${dias[s.dia_semana]}: ${s.hora_inicio} às ${s.hora_fim} (${s.duracao_minutos} min)`;
}).join('\n')}

TAREFA:
Crie um plano de estudos realista para o aluno memorizar os ${odusRestantes} Odus restantes. 
Considere que cada Odu novo precisa ser revisado pelo menos 4 vezes nas primeiras semanas.
Estime quantos dias levará para completar a memorização de todos os 256 Odus.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Créditos insuficientes na IA. Contate o suporte.');
      }
      throw new Error('Erro ao gerar plano com IA');
    }

    const aiData = await aiResponse.json();
    const planoGerado = JSON.parse(aiData.choices[0].message.content);

    // Save the generated plan
    const dataInicio = new Date();
    const dataFimEstimada = new Date();
    dataFimEstimada.setDate(dataFimEstimada.getDate() + planoGerado.estimativa_dias);

    // Deactivate previous plans
    await supabase
      .from('study_plan')
      .update({ ativo: false })
      .eq('user_id', user.id);

    // Insert new plan
    const { data: newPlan, error: planError } = await supabase
      .from('study_plan')
      .insert({
        user_id: user.id,
        plano_completo: planoGerado,
        estimativa_dias: planoGerado.estimativa_dias,
        data_inicio: dataInicio.toISOString().split('T')[0],
        data_fim_estimada: dataFimEstimada.toISOString().split('T')[0],
        ativo: true
      })
      .select()
      .single();

    if (planError) throw planError;

    return new Response(
      JSON.stringify({
        success: true,
        plano: newPlan
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating study plan:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
