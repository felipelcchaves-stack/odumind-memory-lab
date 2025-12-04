import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export interface TechniqueRequirement {
  id: string;
  name: string;
  requirementType: 'always' | 'odus_memorized' | 'streak' | 'xp';
  requirementValue: number;
  alternativeType?: 'streak' | 'xp';
  alternativeValue?: number;
}

export interface TechniqueProgress {
  techniqueId: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number; // 0-100
  currentValue: number;
  requiredValue: number;
  requirementLabel: string;
}

// Configuração de requisitos por técnica
const TECHNIQUE_REQUIREMENTS: TechniqueRequirement[] = [
  { 
    id: 'spaced-repetition', 
    name: 'Repetição Espaçada',
    requirementType: 'always', 
    requirementValue: 0 
  },
  { 
    id: 'flashcards', 
    name: 'Flashcards Ativos',
    requirementType: 'always', 
    requirementValue: 0 
  },
  { 
    id: 'elaborative-encoding', 
    name: 'Codificação Elaborativa',
    requirementType: 'odus_memorized', 
    requirementValue: 5 
  },
  { 
    id: 'mnemonics', 
    name: 'Mnemônicos',
    requirementType: 'odus_memorized', 
    requirementValue: 10,
    alternativeType: 'streak',
    alternativeValue: 7
  },
  { 
    id: 'memory-palace', 
    name: 'Palácio da Memória',
    requirementType: 'odus_memorized', 
    requirementValue: 20,
    alternativeType: 'xp',
    alternativeValue: 500
  }
];

export function useTechniqueUnlock() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [techniqueProgress, setTechniqueProgress] = useState<TechniqueProgress[]>([]);
  const [userStats, setUserStats] = useState({
    odusMemorizados: 0,
    streak: 0,
    xp: 0
  });

  const fetchProgress = useCallback(async () => {
    if (!user) return;

    try {
      // Buscar progresso de técnicas do usuário
      const { data: progressData, error: progressError } = await supabase
        .from('technique_unlock_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // Buscar estatísticas do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('xp, streak')
        .eq('user_id', user.id)
        .single();

      // Buscar quantidade de Odus memorizados
      const { count: memorizadosCount } = await supabase
        .from('memorizacao')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'memorizado');

      const stats = {
        odusMemorizados: memorizadosCount || 0,
        streak: profileData?.streak || 0,
        xp: profileData?.xp || 0
      };

      setUserStats(stats);

      // Se não há dados de progresso, inicializar para usuários existentes
      if (!progressData || progressData.length === 0) {
        await initializeTechniqueProgress();
        return fetchProgress();
      }

      // Calcular progresso de cada técnica
      const progress: TechniqueProgress[] = TECHNIQUE_REQUIREMENTS.map(req => {
        const dbProgress = progressData.find(p => p.technique_id === req.id);
        const isUnlocked = dbProgress?.unlocked || false;

        // Calcular progresso baseado no requisito
        let currentValue = 0;
        let requiredValue = req.requirementValue;
        let requirementLabel = '';
        let progressPercent = 100;

        if (req.requirementType === 'always') {
          progressPercent = 100;
          requirementLabel = 'Sempre disponível';
        } else if (req.requirementType === 'odus_memorized') {
          currentValue = stats.odusMemorizados;
          requiredValue = req.requirementValue;
          progressPercent = Math.min(100, (currentValue / requiredValue) * 100);
          requirementLabel = `${currentValue}/${requiredValue} Odus memorizados`;

          // Verificar requisito alternativo
          if (req.alternativeType && req.alternativeValue) {
            const altValue = req.alternativeType === 'streak' ? stats.streak : stats.xp;
            const altProgress = Math.min(100, (altValue / req.alternativeValue) * 100);
            
            if (altProgress > progressPercent) {
              currentValue = altValue;
              requiredValue = req.alternativeValue;
              progressPercent = altProgress;
              requirementLabel = req.alternativeType === 'streak' 
                ? `${currentValue}/${requiredValue} dias de streak`
                : `${currentValue}/${requiredValue} XP`;
            }
          }
        }

        return {
          techniqueId: req.id,
          unlocked: isUnlocked,
          unlockedAt: dbProgress?.unlocked_at || null,
          progress: progressPercent,
          currentValue,
          requiredValue,
          requirementLabel
        };
      });

      setTechniqueProgress(progress);

      // Verificar se alguma técnica pode ser desbloqueada
      await checkAndUnlockTechniques(progress, stats, progressData);

    } catch (error) {
      console.error('Error fetching technique progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const initializeTechniqueProgress = async () => {
    if (!user) return;

    try {
      const initialData = TECHNIQUE_REQUIREMENTS.map(req => ({
        user_id: user.id,
        technique_id: req.id,
        unlocked: req.requirementType === 'always',
        unlocked_at: req.requirementType === 'always' ? new Date().toISOString() : null
      }));

      await supabase
        .from('technique_unlock_progress')
        .upsert(initialData, { onConflict: 'user_id,technique_id' });

    } catch (error) {
      console.error('Error initializing technique progress:', error);
    }
  };

  const checkAndUnlockTechniques = async (
    progress: TechniqueProgress[], 
    stats: typeof userStats,
    dbData: any[]
  ) => {
    if (!user) return;

    for (const req of TECHNIQUE_REQUIREMENTS) {
      const currentProgress = progress.find(p => p.techniqueId === req.id);
      const dbRecord = dbData.find(d => d.technique_id === req.id);

      if (currentProgress?.unlocked || dbRecord?.unlocked) continue;

      let shouldUnlock = false;

      if (req.requirementType === 'always') {
        shouldUnlock = true;
      } else if (req.requirementType === 'odus_memorized') {
        shouldUnlock = stats.odusMemorizados >= req.requirementValue;
        
        // Verificar alternativo
        if (!shouldUnlock && req.alternativeType && req.alternativeValue) {
          const altValue = req.alternativeType === 'streak' ? stats.streak : stats.xp;
          shouldUnlock = altValue >= req.alternativeValue;
        }
      }

      if (shouldUnlock) {
        await unlockTechnique(req.id, req.name);
      }
    }
  };

  const unlockTechnique = async (techniqueId: string, techniqueName: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('technique_unlock_progress')
        .update({
          unlocked: true,
          unlocked_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('technique_id', techniqueId);

      if (error) throw error;

      // Celebração
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success(`🎉 Nova técnica desbloqueada: ${techniqueName}!`, {
        duration: 5000
      });

      // Log de gamificação
      await supabase.from('gamification_logs').insert({
        user_id: user.id,
        tipo_evento: 'technique_unlocked',
        valor: 1,
        detalhes: { technique_id: techniqueId, technique_name: techniqueName }
      });

      // Atualizar estado local
      setTechniqueProgress(prev => 
        prev.map(p => 
          p.techniqueId === techniqueId 
            ? { ...p, unlocked: true, unlockedAt: new Date().toISOString() }
            : p
        )
      );

    } catch (error) {
      console.error('Error unlocking technique:', error);
    }
  };

  const isTechniqueUnlocked = (techniqueId: string): boolean => {
    const technique = techniqueProgress.find(t => t.techniqueId === techniqueId);
    return technique?.unlocked ?? false;
  };

  const getTechniqueProgress = (techniqueId: string): TechniqueProgress | undefined => {
    return techniqueProgress.find(t => t.techniqueId === techniqueId);
  };

  const getUnlockedCount = (): number => {
    return techniqueProgress.filter(t => t.unlocked).length;
  };

  const getNextUnlock = (): TechniqueProgress | undefined => {
    return techniqueProgress
      .filter(t => !t.unlocked)
      .sort((a, b) => b.progress - a.progress)[0];
  };

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    loading,
    techniqueProgress,
    userStats,
    isTechniqueUnlocked,
    getTechniqueProgress,
    getUnlockedCount,
    getNextUnlock,
    totalTechniques: TECHNIQUE_REQUIREMENTS.length,
    refetch: fetchProgress
  };
}

export { TECHNIQUE_REQUIREMENTS };
