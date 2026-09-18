import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metrics, demographics, monthlyData, period } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY não configurado');
    }

    // Prepare top states
    const topStates = demographics.states.slice(0, 5).map((s: any) => 
      `${s.estado}: ${s.total} usuários (${((s.total / metrics.totalUsers) * 100).toFixed(1)}%)`
    ).join(', ');

    // Prepare age distribution
    const ageDistribution = demographics.age.map((a: any) => 
      `${a.label}: ${a.total} (${((a.total / metrics.totalUsers) * 100).toFixed(1)}%)`
    ).join(', ');

    // Prepare sex distribution
    const sexDistribution = demographics.sex.map((s: any) => 
      `${s.label}: ${s.total} (${((s.total / metrics.totalUsers) * 100).toFixed(1)}%)`
    ).join(', ');

    // Build comprehensive prompt
    const prompt = `Você é um especialista em marketing digital e análise de dados para SaaS educacional no nicho Yorubá/Ifá.

**CONTEXTO DO NEGÓCIO:**
- Plataforma de memorização dos 256 Odu Ifá
- Método gamificado com spaced repetition
- Público-alvo: estudantes de Yorubá, praticantes de religiões afro-brasileiras
- Objetivo: Crescer base de usuários e aumentar conversões

**MÉTRICAS ATUAIS (${period}):**
- Taxa de Conversão: ${metrics.conversionRate}%
- Retention Rate: ${metrics.retentionRate}%
- Churn Rate: ${metrics.churnRate}%
- MRR (Receita Mensal): R$ ${metrics.mrr.toFixed(2)}
- ARR (Receita Anual): R$ ${metrics.arr.toFixed(2)}
- LTV (Lifetime Value): R$ ${metrics.ltv.toFixed(2)}
- CAC (Custo de Aquisição): ${metrics.cac > 0 ? `R$ ${metrics.cac.toFixed(2)}` : 'Não calculado'}
- Usuários Ativos: ${metrics.activeUsers}
- Total de Usuários: ${metrics.totalUsers}

**DEMOGRAFIA DOS USUÁRIOS:**
Estados (Top 5): ${topStates}
Faixa Etária: ${ageDistribution}
Sexo: ${sexDistribution}

**EVOLUÇÃO MENSAL (últimos meses):**
${monthlyData.map((m: any) => 
  `${m.month}: Conv ${m.metrics.conversionRate}%, Ret ${m.metrics.retentionRate}%, MRR R$ ${m.metrics.mrr}`
).join('\n')}

**ANÁLISE SOLICITADA:**
Com base EXCLUSIVAMENTE nos dados acima, forneça insights estratégicos acionáveis para aumentar conversão e receita:

## 1. 🎯 Onde Anunciar (Top 3-5 Regiões Prioritárias)
- Analise os estados com maior concentração
- Identifique oportunidades não exploradas
- Sugira budget allocation por região

## 2. 👥 Público-Alvo Ideal
- Perfil demográfico prioritário (idade, sexo)
- Personas específicas baseadas nos dados
- Segmentos com maior potencial de conversão

## 3. 📱 Plataformas de Anúncio Recomendadas
- Facebook Ads, Google Ads, Instagram, TikTok, YouTube
- Justifique escolhas baseadas no público
- Estratégia de segmentação específica

## 4. 💬 Mensagens e Abordagens
- Copy específico para cada segmento demográfico
- Tom de voz adequado ao público Yorubá/Afro
- CTAs recomendados

## 5. 🔍 Oportunidades Não Exploradas
- Segmentos com baixa penetração mas alto potencial
- Estados/regiões subutilizadas
- Nichos específicos dentro do mercado

## 6. 🚀 Ações Imediatas (Top 5)
- Ações práticas e implementáveis
- Priorizadas por impacto vs esforço
- Budget sugerido quando aplicável

## 7. ⚠️ Alertas e Riscos
- Identifique métricas preocupantes
- Sinais de alerta nos dados
- Recomendações para mitigação

**FORMATO:**
- Use markdown com emojis
- Seja específico e baseado em dados
- Inclua números sempre que possível
- Mantenha tom profissional mas acessível
- Foque em insights ACIONÁVEIS, não genéricos`;

    console.log('Chamando Lovable AI para gerar insights...');

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-3.8-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em marketing digital e análise de dados para SaaS educacional. Suas análises são baseadas em dados concretos e geram insights acionáveis e específicos.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Créditos de IA insuficientes. Adicione créditos em Settings → Workspace → Usage.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const insights = data.choices[0].message.content;

    console.log('Insights gerados com sucesso');

    return new Response(JSON.stringify({ 
      insights,
      generatedAt: new Date().toISOString(),
      dataUsed: {
        period,
        metricsSnapshot: {
          conversionRate: metrics.conversionRate,
          retentionRate: metrics.retentionRate,
          churnRate: metrics.churnRate,
          mrr: metrics.mrr,
          totalUsers: metrics.totalUsers
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar insights' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
