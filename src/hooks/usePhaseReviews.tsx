import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PhaseReview {
  oduId: string;
  oduNumero: number;
  oduNome: string;
  proximaRevisao: string;
  forcaMemoria: number;
}

interface UsePhaseReviewsReturn {
  pendingReviews: number;
  reviewOdus: PhaseReview[];
  nextReviewDate: Date | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function usePhaseReviews(phaseSlug?: string): UsePhaseReviewsReturn {
  const { user } = useAuth();
  const [pendingReviews, setPendingReviews] = useState(0);
  const [reviewOdus, setReviewOdus] = useState<PhaseReview[]>([]);
  const [nextReviewDate, setNextReviewDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const now = new Date().toISOString();

      // Get phase Odus if phaseSlug provided
      let phaseOduNumbers: number[] | null = null;
      
      if (phaseSlug) {
        const { data: phase } = await supabase
          .from('learning_phases')
          .select('odus_incluidos')
          .eq('slug', phaseSlug)
          .single();

        if (phase) {
          phaseOduNumbers = phase.odus_incluidos;
        }
      }

      // Fetch memorization records with pending reviews
      let query = supabase
        .from('memorizacao')
        .select(`
          id,
          odu_id,
          proxima_revisao,
          forca_memoria,
          odu:odu_id(id, numero, nome)
        `)
        .eq('user_id', user.id)
        .lte('proxima_revisao', now)
        .not('proxima_revisao', 'is', null);

      const { data: reviews, error } = await query;

      if (error) throw error;

      // Filter by phase if needed
      let filteredReviews = reviews || [];
      if (phaseOduNumbers && phaseOduNumbers.length > 0) {
        filteredReviews = filteredReviews.filter(r => 
          phaseOduNumbers!.includes((r.odu as any)?.numero)
        );
      }

      // Map to PhaseReview format
      const mappedReviews: PhaseReview[] = filteredReviews.map(r => ({
        oduId: r.odu_id,
        oduNumero: (r.odu as any)?.numero || 0,
        oduNome: (r.odu as any)?.nome || '',
        proximaRevisao: r.proxima_revisao || '',
        forcaMemoria: r.forca_memoria,
      })).sort((a, b) => a.oduNumero - b.oduNumero);

      setPendingReviews(mappedReviews.length);
      setReviewOdus(mappedReviews);

      // Get next review date (from reviews not yet due)
      let nextQuery = supabase
        .from('memorizacao')
        .select('proxima_revisao, odu:odu_id(numero)')
        .eq('user_id', user.id)
        .gt('proxima_revisao', now)
        .order('proxima_revisao', { ascending: true })
        .limit(1);

      const { data: nextReviewData } = await nextQuery;

      if (nextReviewData && nextReviewData.length > 0) {
        // Filter by phase if needed
        if (phaseOduNumbers && phaseOduNumbers.length > 0) {
          const filtered = nextReviewData.filter(r =>
            phaseOduNumbers!.includes((r.odu as any)?.numero)
          );
          if (filtered.length > 0) {
            setNextReviewDate(new Date(filtered[0].proxima_revisao!));
          } else {
            setNextReviewDate(null);
          }
        } else {
          setNextReviewDate(new Date(nextReviewData[0].proxima_revisao!));
        }
      } else {
        setNextReviewDate(null);
      }
    } catch (err) {
      console.error('Error loading phase reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [user, phaseSlug]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  return {
    pendingReviews,
    reviewOdus,
    nextReviewDate,
    loading,
    refresh: loadReviews,
  };
}

// Hook para obter revisões globais (todas as fases)
export function useGlobalReviews() {
  return usePhaseReviews();
}
