import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LearningPhase {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  icone: string;
  cor: string;
  ordem: number;
  prerequisito_fase_id: string | null;
  prerequisito_percentual: number;
  odus_incluidos: number[];
  created_at: string;
}

export interface PhaseProgress {
  phase: LearningPhase;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  progress: number;
  odusMemorized: number;
  odusTotal: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface OduWithStatus {
  id: string;
  numero: number;
  nome: string;
  status: 'nao_estudado' | 'estudando' | 'memorizado';
  forca_memoria: number;
}

export function useLearningPhases() {
  const { user } = useAuth();
  const [phases, setPhases] = useState<LearningPhase[]>([]);
  const [phaseProgress, setPhaseProgress] = useState<PhaseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPhases = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load all phases
      const { data: phasesData, error: phasesError } = await supabase
        .from('learning_phases')
        .select('*')
        .order('ordem', { ascending: true });

      if (phasesError) throw phasesError;

      // Load user memorization data
      const { data: memorizacaoData, error: memError } = await supabase
        .from('memorizacao')
        .select('odu_id, status, forca_memoria')
        .eq('user_id', user.id);

      if (memError) throw memError;

      // Load all Odu to map numero -> id
      const { data: odusData, error: odusError } = await supabase
        .from('odu')
        .select('id, numero');

      if (odusError) throw odusError;

      // Create map of numero -> memorization status
      const oduIdToNumero = new Map(odusData?.map(o => [o.id, o.numero]) || []);
      const oduNumeroToId = new Map(odusData?.map(o => [o.numero, o.id]) || []);
      
      const memorizedByNumero = new Map<number, { status: string; forca: number }>();
      memorizacaoData?.forEach(m => {
        const numero = oduIdToNumero.get(m.odu_id);
        if (numero) {
          memorizedByNumero.set(numero, { status: m.status, forca: m.forca_memoria });
        }
      });

      // Calculate progress for each phase
      const progressMap = new Map<string, { memorized: number; total: number; progress: number }>();
      
      phasesData?.forEach(phase => {
        const odusInPhase = phase.odus_incluidos || [];
        const total = odusInPhase.length;
        let memorized = 0;
        
        odusInPhase.forEach((numero: number) => {
          const mem = memorizedByNumero.get(numero);
          if (mem?.status === 'memorizado') {
            memorized++;
          }
        });
        
        const progress = total > 0 ? Math.round((memorized / total) * 100) : 0;
        progressMap.set(phase.id, { memorized, total, progress });
      });

      // Determine status for each phase
      const phaseProgressList: PhaseProgress[] = [];
      
      for (const phase of phasesData || []) {
        const stats = progressMap.get(phase.id) || { memorized: 0, total: 0, progress: 0 };
        let status: 'locked' | 'available' | 'in_progress' | 'completed' = 'locked';
        
        // Check if prerequisite is met
        if (!phase.prerequisito_fase_id) {
          // First phase is always available
          status = 'available';
        } else {
          const prereqStats = progressMap.get(phase.prerequisito_fase_id);
          if (prereqStats && prereqStats.progress >= phase.prerequisito_percentual) {
            status = 'available';
          }
        }
        
        // Check if in progress or completed
        if (status === 'available') {
          if (stats.progress >= 100) {
            status = 'completed';
          } else if (stats.memorized > 0) {
            status = 'in_progress';
          }
        }
        
        phaseProgressList.push({
          phase,
          status,
          progress: stats.progress,
          odusMemorized: stats.memorized,
          odusTotal: stats.total,
          startedAt: null,
          completedAt: null,
        });
      }

      setPhases(phasesData || []);
      setPhaseProgress(phaseProgressList);
    } catch (err) {
      console.error('Error loading learning phases:', err);
      setError('Erro ao carregar fases de aprendizado');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getOdusForPhase = useCallback(async (phaseId: string): Promise<OduWithStatus[]> => {
    if (!user) return [];

    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return [];

    try {
      // Get Odus for this phase
      const { data: odusData, error: odusError } = await supabase
        .from('odu')
        .select('id, numero, nome')
        .in('numero', phase.odus_incluidos)
        .order('numero', { ascending: true });

      if (odusError) throw odusError;

      // Get memorization status
      const oduIds = odusData?.map(o => o.id) || [];
      const { data: memData, error: memError } = await supabase
        .from('memorizacao')
        .select('odu_id, status, forca_memoria')
        .eq('user_id', user.id)
        .in('odu_id', oduIds);

      if (memError) throw memError;

      const memMap = new Map(memData?.map(m => [m.odu_id, m]) || []);

      return (odusData || []).map(odu => {
        const mem = memMap.get(odu.id);
        return {
          id: odu.id,
          numero: odu.numero,
          nome: odu.nome,
          status: (mem?.status as 'nao_estudado' | 'estudando' | 'memorizado') || 'nao_estudado',
          forca_memoria: mem?.forca_memoria || 0,
        };
      });
    } catch (err) {
      console.error('Error loading Odus for phase:', err);
      return [];
    }
  }, [user, phases]);

  const getCurrentPhase = useCallback((): PhaseProgress | null => {
    // Find the first phase that is in_progress, or the first available one
    const inProgress = phaseProgress.find(p => p.status === 'in_progress');
    if (inProgress) return inProgress;
    
    const available = phaseProgress.find(p => p.status === 'available');
    return available || null;
  }, [phaseProgress]);

  const getOverallProgress = useCallback(() => {
    const totalOdus = 256;
    const memorized = phaseProgress.reduce((sum, p) => sum + p.odusMemorized, 0);
    // Avoid counting duplicates (Meji appear in both Oju Odu and family phases)
    const uniqueMemorized = Math.min(memorized, totalOdus);
    return {
      memorized: uniqueMemorized,
      total: totalOdus,
      percentage: Math.round((uniqueMemorized / totalOdus) * 100),
      phasesCompleted: phaseProgress.filter(p => p.status === 'completed').length,
      totalPhases: phaseProgress.length,
    };
  }, [phaseProgress]);

  useEffect(() => {
    loadPhases();
  }, [loadPhases]);

  return {
    phases,
    phaseProgress,
    loading,
    error,
    refresh: loadPhases,
    getOdusForPhase,
    getCurrentPhase,
    getOverallProgress,
  };
}
