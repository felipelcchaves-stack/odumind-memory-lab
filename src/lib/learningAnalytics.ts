import { supabase } from "@/integrations/supabase/client";

export interface LearningInsights {
  bestTime?: string;
  learningCurve: Array<{ date: string; score: number }>;
  averageTimePerOdu: number;
  retentionRate: number;
  totalStudyTime: number;
  weeklyProgress: number;
  strongestAreas: string[];
  weakestAreas: string[];
  recommendations: string[];
}

export interface UnlockProgress {
  currentLimit: number;
  nextUnlock: number;
  requirementType: 'mastery' | 'streak' | 'xp' | 'upgrade';
  requirementValue: number;
  currentProgress: number;
  progressPercentage: number;
}

// Calcular insights de aprendizagem
export async function calculateLearningInsights(userId: string): Promise<LearningInsights> {
  try {
    // Buscar sessões de estudo
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    // Buscar dados de memorização
    const { data: memData } = await supabase
      .from('memorizacao')
      .select('*, odu:odu_id(*)')
      .eq('user_id', userId);

    // Buscar perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const insights: LearningInsights = {
      learningCurve: [],
      averageTimePerOdu: 0,
      retentionRate: 0,
      totalStudyTime: 0,
      weeklyProgress: 0,
      strongestAreas: [],
      weakestAreas: [],
      recommendations: []
    };

    // Calcular curva de aprendizado
    if (sessions && sessions.length > 0) {
      const hourMap = new Map<number, { total: number; correct: number }>();
      
      sessions.forEach(session => {
        const date = new Date(session.created_at);
        const hour = date.getHours();
        
        if (!hourMap.has(hour)) {
          hourMap.set(hour, { total: 0, correct: 0 });
        }
        
        const stats = hourMap.get(hour)!;
        stats.total += session.total_cards || 0;
        stats.correct += session.correct_answers || 0;
      });

      // Encontrar melhor horário
      let bestHour = 0;
      let bestAccuracy = 0;
      
      hourMap.forEach((stats, hour) => {
        const accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
        if (accuracy > bestAccuracy && stats.total >= 5) {
          bestAccuracy = accuracy;
          bestHour = hour;
        }
      });

      if (bestAccuracy > 0) {
        insights.bestTime = `${bestHour}:00 - ${bestHour + 1}:00`;
      }

      // Curva de aprendizado (últimos 7 dias)
      const last7Days = sessions.slice(0, 7).reverse();
      insights.learningCurve = last7Days.map(session => ({
        date: new Date(session.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        score: session.total_cards > 0 ? Math.round((session.correct_answers / session.total_cards) * 100) : 0
      }));

      // Tempo total de estudo (em minutos)
      insights.totalStudyTime = sessions.reduce((sum, s) => {
        if (s.started_at && s.ended_at) {
          const diff = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
          return sum + diff / (1000 * 60);
        }
        return sum;
      }, 0);
    }

    // Calcular métricas de memorização
    if (memData && memData.length > 0) {
      const memorized = memData.filter(m => m.status === 'memorizado');
      const totalRevisoes = memData.reduce((sum, m) => sum + m.revisoes, 0);
      
      insights.retentionRate = (memorized.length / memData.length) * 100;
      insights.averageTimePerOdu = totalRevisoes > 0 ? memData.length / totalRevisoes : 0;

      // Identificar áreas fortes e fracas (por força de memória)
      const strong = memData.filter(m => m.forca_memoria >= 80).map(m => m.odu?.nome || '').filter(Boolean);
      const weak = memData.filter(m => m.forca_memoria < 50 || m.marked_difficult).map(m => m.odu?.nome || '').filter(Boolean);
      
      insights.strongestAreas = strong.slice(0, 3);
      insights.weakestAreas = weak.slice(0, 3);
    }

    // Progresso semanal
    if (profile) {
      insights.weeklyProgress = profile.xp || 0;
    }

    // Gerar recomendações
    insights.recommendations = generateRecommendations(insights, memData || []);

    return insights;
  } catch (error) {
    console.error('Error calculating learning insights:', error);
    return {
      learningCurve: [],
      averageTimePerOdu: 0,
      retentionRate: 0,
      totalStudyTime: 0,
      weeklyProgress: 0,
      strongestAreas: [],
      weakestAreas: [],
      recommendations: []
    };
  }
}

// Gerar recomendações personalizadas
function generateRecommendations(insights: LearningInsights, memData: any[]): string[] {
  const recs: string[] = [];

  // Melhor horário
  if (insights.bestTime) {
    recs.push(`💡 Você aprende melhor entre ${insights.bestTime}. Considere estudar nesse horário.`);
  }

  // Taxa de retenção
  if (insights.retentionRate < 60) {
    recs.push('📚 Sua taxa de retenção está baixa. Tente revisar com mais frequência.');
  } else if (insights.retentionRate >= 85) {
    recs.push('🎯 Excelente taxa de retenção! Continue com essa consistência.');
  }

  // Áreas fracas
  if (insights.weakestAreas.length > 0) {
    recs.push(`⚠️ Foque mais atenção em: ${insights.weakestAreas.slice(0, 2).join(', ')}`);
  }

  // Tempo de estudo
  if (insights.totalStudyTime < 30) {
    recs.push('⏱️ Tente estudar pelo menos 30 minutos por semana para melhores resultados.');
  }

  // Odus marcados como difíceis
  const difficultCount = memData.filter(m => m.marked_difficult).length;
  if (difficultCount > 5) {
    recs.push(`🎓 ${difficultCount} Odus marcados como difíceis. Considere usar técnicas mnemônicas.`);
  }

  return recs;
}

// Calcular progresso de desbloqueio
export async function calculateUnlockProgress(userId: string): Promise<UnlockProgress> {
  try {
    // Buscar progresso de desbloqueio
    const { data: progress } = await supabase
      .from('unlock_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Buscar dados para cálculo de progresso
    const { data: memData } = await supabase
      .from('memorizacao')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'memorizado');

    const { data: profile } = await supabase
      .from('profiles')
      .select('streak, xp')
      .eq('user_id', userId)
      .single();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plan_name')
      .eq('user_id', userId)
      .single();

    let currentProgress = 0;
    const requirementType = progress?.unlock_requirement_type as 'mastery' | 'streak' | 'xp' | 'upgrade';
    const requirementValue = progress?.unlock_requirement_value || 5;

    // Calcular progresso baseado no tipo de requisito
    switch (requirementType) {
      case 'mastery':
        currentProgress = memData?.length || 0;
        break;
      case 'streak':
        currentProgress = profile?.streak || 0;
        break;
      case 'xp':
        currentProgress = profile?.xp || 0;
        break;
      case 'upgrade':
        currentProgress = subscription?.status === 'active' ? 1 : 0;
        break;
    }

    const progressPercentage = Math.min(100, (currentProgress / requirementValue) * 100);

    // Se completou o requisito, atualizar para próximo nível
    if (currentProgress >= requirementValue && requirementType !== 'upgrade') {
      await updateToNextUnlockLevel(userId, progress!);
    }

    return {
      currentLimit: progress?.current_limit || 5,
      nextUnlock: progress?.next_unlock || 10,
      requirementType,
      requirementValue,
      currentProgress,
      progressPercentage
    };
  } catch (error) {
    console.error('Error calculating unlock progress:', error);
    return {
      currentLimit: 5,
      nextUnlock: 10,
      requirementType: 'mastery',
      requirementValue: 5,
      currentProgress: 0,
      progressPercentage: 0
    };
  }
}

// Atualizar para próximo nível de desbloqueio
async function updateToNextUnlockLevel(userId: string, currentProgress: any) {
  const unlockRules = [
    { currentLimit: 5, nextUnlock: 10, requirementType: 'mastery', requirementValue: 5 },
    { currentLimit: 10, nextUnlock: 20, requirementType: 'streak', requirementValue: 7 },
    { currentLimit: 20, nextUnlock: 50, requirementType: 'xp', requirementValue: 500 },
    { currentLimit: 50, nextUnlock: 256, requirementType: 'upgrade', requirementValue: 1 }
  ];

  const currentIndex = unlockRules.findIndex(r => r.currentLimit === currentProgress.current_limit);
  if (currentIndex >= 0 && currentIndex < unlockRules.length - 1) {
    const nextRule = unlockRules[currentIndex + 1];
    
    await supabase
      .from('unlock_progress')
      .update({
        current_limit: nextRule.currentLimit,
        next_unlock: nextRule.nextUnlock,
        unlock_requirement_type: nextRule.requirementType,
        unlock_requirement_value: nextRule.requirementValue
      })
      .eq('user_id', userId);
  }
}

// Iniciar sessão de estudo
export async function startStudySession(userId: string, mode: string = 'normal'): Promise<string> {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: userId,
      session_mode: mode,
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

// Finalizar sessão de estudo
export async function endStudySession(
  sessionId: string,
  totalCards: number,
  correctAnswers: number,
  wrongAnswers: number,
  averageResponseTime: number
) {
  await supabase
    .from('study_sessions')
    .update({
      ended_at: new Date().toISOString(),
      total_cards: totalCards,
      correct_answers: correctAnswers,
      wrong_answers: wrongAnswers,
      average_response_time: averageResponseTime
    })
    .eq('id', sessionId);
}
