import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CurrentPhase {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  cor: string;
  icone: string;
  ordem: number;
  odus_incluidos: number[];
  status: 'in_progress' | 'available' | 'completed';
  completionPercentage: number;
  memorizedCount: number;
  totalCount: number;
}

interface UseCurrentPhaseReturn {
  currentPhase: CurrentPhase | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasStartedJourney: boolean;
  totalPhasesCompleted: number;
}

export function useCurrentPhase(): UseCurrentPhaseReturn {
  const { user } = useAuth();
  const [currentPhase, setCurrentPhase] = useState<CurrentPhase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStartedJourney, setHasStartedJourney] = useState(false);
  const [totalPhasesCompleted, setTotalPhasesCompleted] = useState(0);

  const loadCurrentPhase = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all phases ordered
      const { data: phases, error: phasesError } = await supabase
        .from('learning_phases')
        .select('*')
        .order('ordem', { ascending: true });

      if (phasesError) throw phasesError;

      if (!phases || phases.length === 0) {
        setCurrentPhase(null);
        setLoading(false);
        return;
      }

      // Fetch user's memorization data
      const { data: memorizacao } = await supabase
        .from('memorizacao')
        .select('odu_id, status, forca_memoria, odu:odu_id(numero)')
        .eq('user_id', user.id);

      const memorizedOduNumbers = new Set(
        (memorizacao || [])
          .filter(m => m.status === 'memorizado')
          .map(m => (m.odu as any)?.numero)
          .filter(Boolean)
      );

      const studiedOduNumbers = new Set(
        (memorizacao || [])
          .filter(m => m.status !== 'nao_estudado')
          .map(m => (m.odu as any)?.numero)
          .filter(Boolean)
      );

      // Check if user has started journey (any study at all)
      setHasStartedJourney(studiedOduNumbers.size > 0);

      // Calculate phase progress and find current phase
      let completedCount = 0;
      let foundCurrentPhase: CurrentPhase | null = null;

      for (const phase of phases) {
        const phaseOdus = phase.odus_incluidos || [];
        const memorizedInPhase = phaseOdus.filter(num => memorizedOduNumbers.has(num)).length;
        const completionPercentage = phaseOdus.length > 0 
          ? Math.round((memorizedInPhase / phaseOdus.length) * 100)
          : 0;

        const isCompleted = completionPercentage === 100;
        const hasStarted = phaseOdus.some(num => studiedOduNumbers.has(num));

        if (isCompleted) {
          completedCount++;
        }

        // Find first non-completed phase that's available
        if (!foundCurrentPhase) {
          // Check prerequisites
          let prereqMet = true;
          if (phase.prerequisito_fase_id) {
            const prereqPhase = phases.find(p => p.id === phase.prerequisito_fase_id);
            if (prereqPhase) {
              const prereqOdus = prereqPhase.odus_incluidos || [];
              const prereqMemorized = prereqOdus.filter(num => memorizedOduNumbers.has(num)).length;
              const prereqPercent = prereqOdus.length > 0 
                ? Math.round((prereqMemorized / prereqOdus.length) * 100)
                : 0;
              prereqMet = prereqPercent >= (phase.prerequisito_percentual || 80);
            }
          }

          if (!isCompleted && prereqMet) {
            foundCurrentPhase = {
              id: phase.id,
              nome: phase.nome,
              slug: phase.slug,
              descricao: phase.descricao,
              cor: phase.cor,
              icone: phase.icone,
              ordem: phase.ordem,
              odus_incluidos: phaseOdus,
              status: hasStarted ? 'in_progress' : 'available',
              completionPercentage,
              memorizedCount: memorizedInPhase,
              totalCount: phaseOdus.length,
            };
          }
        }
      }

      setTotalPhasesCompleted(completedCount);

      // If all phases completed, return the last one as completed
      if (!foundCurrentPhase && phases.length > 0) {
        const lastPhase = phases[phases.length - 1];
        const phaseOdus = lastPhase.odus_incluidos || [];
        const memorizedInPhase = phaseOdus.filter(num => memorizedOduNumbers.has(num)).length;

        foundCurrentPhase = {
          id: lastPhase.id,
          nome: lastPhase.nome,
          slug: lastPhase.slug,
          descricao: lastPhase.descricao,
          cor: lastPhase.cor,
          icone: lastPhase.icone,
          ordem: lastPhase.ordem,
          odus_incluidos: phaseOdus,
          status: 'completed',
          completionPercentage: 100,
          memorizedCount: memorizedInPhase,
          totalCount: phaseOdus.length,
        };
      }

      setCurrentPhase(foundCurrentPhase);
    } catch (err) {
      console.error('Error loading current phase:', err);
      setError('Erro ao carregar fase atual');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCurrentPhase();
  }, [loadCurrentPhase]);

  return {
    currentPhase,
    loading,
    error,
    refresh: loadCurrentPhase,
    hasStartedJourney,
    totalPhasesCompleted,
  };
}
