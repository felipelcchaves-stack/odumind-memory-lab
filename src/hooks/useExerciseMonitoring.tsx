import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type SkipReason = 
  | 'cloze_no_keywords'
  | 'cloze_short_text'
  | 'cloze_empty_verso'
  | 'sentence_order_short'
  | 'drag_drop_no_slots'
  | 'mode_fallback'
  | 'quiz_fallback';

interface ExerciseSkipEvent {
  reason: SkipReason;
  oduId?: string;
  oduNumero?: number;
  oduNome?: string;
  phase?: string;
  attemptedMode?: string;
  fallbackMode?: string;
  additionalInfo?: Record<string, unknown>;
}

export const useExerciseMonitoring = () => {
  const { user } = useAuth();

  const logExerciseSkip = useCallback(async (event: ExerciseSkipEvent) => {
    if (!user?.id) {
      console.warn('[EXERCISE-MONITOR] No user logged in, skipping event log');
      return;
    }

    try {
      const { error } = await supabase
        .from('gamification_logs')
        .insert({
          user_id: user.id,
          tipo_evento: 'exercise_skipped',
          valor: 0,
          detalhes: {
            reason: event.reason,
            odu_id: event.oduId,
            odu_numero: event.oduNumero,
            odu_nome: event.oduNome,
            phase: event.phase,
            attempted_mode: event.attemptedMode,
            fallback_mode: event.fallbackMode,
            timestamp: new Date().toISOString(),
            ...event.additionalInfo
          }
        });

      if (error) {
        console.error('[EXERCISE-MONITOR] Failed to log skip event:', error);
      } else {
        console.log('[EXERCISE-MONITOR] Skip event logged:', event.reason);
      }
    } catch (err) {
      console.error('[EXERCISE-MONITOR] Error logging skip event:', err);
    }
  }, [user?.id]);

  const logModeFallback = useCallback(async (
    attemptedMode: string,
    fallbackMode: string,
    oduInfo: { id?: string; numero?: number; nome?: string },
    phase?: string
  ) => {
    await logExerciseSkip({
      reason: 'mode_fallback',
      oduId: oduInfo.id,
      oduNumero: oduInfo.numero,
      oduNome: oduInfo.nome,
      phase,
      attemptedMode,
      fallbackMode
    });
  }, [logExerciseSkip]);

  const logClozeSkip = useCallback(async (
    reason: 'cloze_no_keywords' | 'cloze_short_text' | 'cloze_empty_verso',
    oduInfo: { id?: string; numero?: number; nome?: string },
    additionalInfo?: Record<string, unknown>
  ) => {
    await logExerciseSkip({
      reason,
      oduId: oduInfo.id,
      oduNumero: oduInfo.numero,
      oduNome: oduInfo.nome,
      additionalInfo
    });
  }, [logExerciseSkip]);

  return {
    logExerciseSkip,
    logModeFallback,
    logClozeSkip
  };
};
