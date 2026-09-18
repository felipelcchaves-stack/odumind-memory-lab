import { supabase } from "@/integrations/supabase/client";

// Helper para converter dados do banco para UserLearningProfile
function mapToUserLearningProfile(data: any): UserLearningProfile {
  return {
    ...data,
    learning_curve_data: Array.isArray(data.learning_curve_data) 
      ? data.learning_curve_data 
      : []
  };
}

export interface UserLearningProfile {
  id?: string;
  user_id: string;
  fast_learner: boolean;
  needs_reinforcement: boolean;
  optimal_session_time: number;
  weak_odus: string[];
  best_study_hour?: number;
  average_accuracy: number;
  average_speed: number;
  learning_curve_data: Array<{ date: string; accuracy: number; speed: number }>;
}

export interface MemorizationRecord {
  id: string;
  odu_id: string;
  revisoes: number;
  forca_memoria: number;
  status: string;
  proxima_revisao: string | null;
  ultima_revisao: string | null;
  marked_difficult: boolean;
  consecutive_correct: number;
  consecutive_wrong: number;
  total_study_time: number;
  last_response_time: number;
  facilidade: number;
  intervalo: number;
}

export interface StudyBlock {
  targetCards: number;
  duration: number;
  intensity: 'light' | 'medium' | 'intense';
  breakAfter: boolean;
}

export interface SessionMetrics {
  consecutiveCorrect: number;
  consecutiveWrong: number;
  totalCards: number;
  correctAnswers: number;
  wrongAnswers: number;
  averageResponseTime: number;
  sessionStartTime: Date;
}

// Calcular perfil de aprendizagem baseado em histórico
export async function calculateLearningProfile(userId: string): Promise<UserLearningProfile | null> {
  try {
    // Buscar perfil existente
    const { data: profile } = await supabase
      .from('user_learning_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      // Criar perfil inicial
      const { data: newProfile } = await supabase
        .from('user_learning_profile')
        .insert({
          user_id: userId,
          fast_learner: false,
          needs_reinforcement: false,
          optimal_session_time: 20,
          weak_odus: [],
          average_accuracy: 0,
          average_speed: 0,
          learning_curve_data: []
        })
        .select()
        .single();

      return newProfile ? mapToUserLearningProfile(newProfile) : null;
    }

    // Buscar dados de memorização para análise
    const { data: memData } = await supabase
      .from('memorizacao')
      .select('forca_memoria, revisoes, marked_difficult, odu_id')
      .eq('user_id', userId);

    if (memData && memData.length > 0) {
      // Calcular estatísticas
      const avgStrength = memData.reduce((sum, m) => sum + m.forca_memoria, 0) / memData.length;
      const avgRevisoes = memData.reduce((sum, m) => sum + m.revisoes, 0) / memData.length;
      const difficultOdus = memData.filter(m => m.marked_difficult).map(m => m.odu_id);

      // Determinar se é fast learner (memoriza com poucas revisões)
      const fastLearner = avgRevisoes < 2.5 && avgStrength > 60;
      
      // Determinar se precisa reforço (muitas revisões, baixa retenção)
      const needsReinforcement = avgRevisoes > 4 || avgStrength < 50;

      // Atualizar perfil
      const { data: updatedProfile } = await supabase
        .from('user_learning_profile')
        .update({
          fast_learner: fastLearner,
          needs_reinforcement: needsReinforcement,
          weak_odus: difficultOdus,
        })
        .eq('user_id', userId)
        .select()
        .single();

      return updatedProfile ? mapToUserLearningProfile(updatedProfile) : null;
    }

    return mapToUserLearningProfile(profile);
  } catch (error) {
    console.error('Error calculating learning profile:', error);
    return null;
  }
}

// Calcular próximo intervalo adaptativo (melhoria do SM-2)
export function calculateAdaptiveInterval(
  currentFacilidade: number,
  currentIntervalo: number,
  qualidade: number,
  userProfile: UserLearningProfile | null,
  revisoes: number
): { novaFacilidade: number; novoIntervalo: number } {
  // SM-2 base
  let ef = currentFacilidade + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02));
  ef = Math.max(1.3, ef);

  let intervalo: number;
  if (qualidade < 3) {
    intervalo = 1;
  } else {
    if (currentIntervalo === 0) {
      intervalo = 1;
    } else if (currentIntervalo === 1) {
      intervalo = 6;
    } else {
      intervalo = Math.ceil(currentIntervalo * ef);
    }
  }

  // Ajustes adaptativos baseados no perfil
  if (userProfile) {
    // Fast learner: aumenta intervalo se aprendeu bem
    if (userProfile.fast_learner && qualidade >= 4 && revisoes >= 2) {
      intervalo = Math.ceil(intervalo * 1.4);
    }

    // Needs reinforcement: diminui intervalo para mais revisões
    if (userProfile.needs_reinforcement && revisoes < 5) {
      intervalo = Math.ceil(intervalo * 0.7);
    }
  }

  return { novaFacilidade: ef, novoIntervalo: intervalo };
}

// Prever probabilidade de esquecimento (Curva de Ebbinghaus)
export function predictForgetProbability(
  forcaMemoria: number,
  ultimaRevisao: Date | string | null,
  revisoes: number
): number {
  if (!ultimaRevisao) return 1.0;

  const lastDate = typeof ultimaRevisao === 'string' ? new Date(ultimaRevisao) : ultimaRevisao;
  const now = new Date();
  const daysSinceReview = Math.max(0, (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  // Curva de esquecimento exponencial
  const decayRate = 1 / (1 + Math.exp(-0.05 * daysSinceReview));
  const baseForgetProb = (100 - forcaMemoria) / 100;

  // Revisar mais = menor probabilidade de esquecer
  const revisionFactor = Math.max(0.5, 1 - (revisoes * 0.1));

  return baseForgetProb * decayRate * revisionFactor;
}

// Priorizar Odus para revisão inteligente
export async function prioritizeOdusForReview(
  userId: string,
  availableOdus: any[],
  userProfile: UserLearningProfile | null
): Promise<any[]> {
  try {
    // Buscar dados de memorização
    const { data: memData } = await supabase
      .from('memorizacao')
      .select('*')
      .eq('user_id', userId);

    if (!memData) return availableOdus;

    // Criar mapa de prioridades
    const priorityMap = new Map();

    for (const odu of availableOdus) {
      const mem = memData.find(m => m.odu_id === odu.id);
      let priority = 50; // prioridade base

      if (mem) {
        // Baixa força de memória = alta prioridade
        if (mem.forca_memoria < 50) priority += 30;
        else if (mem.forca_memoria < 70) priority += 15;

        // Marcado como difícil = alta prioridade
        if (mem.marked_difficult) priority += 25;

        // Não revisado há muito tempo = alta prioridade
        const forgetProb = predictForgetProbability(
          mem.forca_memoria,
          mem.ultima_revisao,
          mem.revisoes
        );
        if (forgetProb > 0.5) priority += 35;
        else if (forgetProb > 0.3) priority += 20;

        // Odu fraco do perfil = alta prioridade
        if (userProfile?.weak_odus.includes(odu.id)) {
          priority += 20;
        }

        // Muitas revisões erradas consecutivas = alta prioridade
        if (mem.consecutive_wrong >= 2) priority += 15;
      }

      priorityMap.set(odu.id, priority);
    }

    // Ordenar por prioridade
    return availableOdus.sort((a, b) => 
      (priorityMap.get(b.id) || 0) - (priorityMap.get(a.id) || 0)
    );
  } catch (error) {
    console.error('Error prioritizing odus:', error);
    return availableOdus;
  }
}

// Criar mix intercalado de cards (70% revisão, 20% novo, 10% manutenção)
export async function createInterleavedMix(
  userId: string,
  allOdus: any[]
): Promise<any[]> {
  try {
    const { data: memData } = await supabase
      .from('memorizacao')
      .select('*')
      .eq('user_id', userId);

    // Separar em categorias
    const needReview = allOdus.filter(odu => {
      const mem = memData?.find(m => m.odu_id === odu.id);
      return mem && mem.status !== 'memorizado' && mem.forca_memoria < 70;
    });

    const newOdus = allOdus.filter(odu => {
      const mem = memData?.find(m => m.odu_id === odu.id);
      return !mem || mem.revisoes === 0;
    });

    const maintenance = allOdus.filter(odu => {
      const mem = memData?.find(m => m.odu_id === odu.id);
      // Usa o mesmo limiar (60) que promove um Odu para 'memorizado' em
      // StudySession.tsx - com 70 aqui, um Odu memorizado com força entre
      // 60-69 não caía em nenhum dos três grupos e sumia da fila de estudo.
      return mem && mem.status === 'memorizado' && mem.forca_memoria >= 60;
    });

    // Calcular quantidades (até 100 cards total)
    const maxCards = 100;
    const reviewCount = Math.min(Math.ceil(maxCards * 0.7), needReview.length);
    const newCount = Math.min(Math.ceil(maxCards * 0.2), newOdus.length);
    const maintenanceCount = Math.min(Math.ceil(maxCards * 0.1), maintenance.length);

    // Selecionar e misturar
    const selected = [
      ...needReview.slice(0, reviewCount),
      ...newOdus.slice(0, newCount),
      ...maintenance.slice(0, maintenanceCount)
    ];

    // Shuffle para interleaving
    return selected.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error('Error creating interleaved mix:', error);
    return allOdus.slice(0, 100);
  }
}

// Determinar bloco de estudo adaptativo
export function determineStudyBlock(metrics: SessionMetrics): StudyBlock {
  const { consecutiveWrong, correctAnswers, totalCards, averageResponseTime } = metrics;
  const accuracyRate = totalCards > 0 ? correctAnswers / totalCards : 1;

  // Estudando com dificuldade
  if (accuracyRate < 0.6 || consecutiveWrong >= 3) {
    return {
      targetCards: 15,
      duration: 10,
      intensity: 'light',
      breakAfter: true
    };
  }

  // Performance mediana
  if (accuracyRate < 0.8) {
    return {
      targetCards: 25,
      duration: 15,
      intensity: 'medium',
      breakAfter: false
    };
  }

  // Performance excelente
  return {
    targetCards: 40,
    duration: 25,
    intensity: 'intense',
    breakAfter: false
  };
}
