import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LearningPath {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  icone: string;
  cor: string;
  imagem_url: string | null;
  ordem: number;
  ativo: boolean;
  requer_assinatura: boolean;
  total_conteudos: number;
  created_at: string;
}

export interface LearningPathWithProgress extends LearningPath {
  userProgress: {
    totalContent: number;
    memorized: number;
    studying: number;
    percentage: number;
  };
  isLocked: boolean;
}

export function useAllLearningPaths() {
  const { user } = useAuth();
  const [activePaths, setActivePaths] = useState<LearningPathWithProgress[]>([]);
  const [comingSoonPaths, setComingSoonPaths] = useState<LearningPathWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPaths = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all learning paths (both active and inactive)
      const { data: pathsData, error: pathsError } = await supabase
        .from('learning_paths')
        .select('*')
        .order('ordem', { ascending: true });

      if (pathsError) throw pathsError;

      // If user is logged in, load their progress
      let progressMap = new Map<string, { memorized: number; studying: number }>();
      let hasActiveSubscription = false;

      if (user) {
        // Check subscription status
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('status, plan_name')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        hasActiveSubscription = subData?.status === 'active' || subData?.plan_name === 'Gratuito';

        // For Caminho de Ifá, get progress from memorizacao table
        const { data: memData } = await supabase
          .from('memorizacao')
          .select('status')
          .eq('user_id', user.id);

        if (memData) {
          const ifaPath = pathsData?.find(p => p.slug === 'caminho-ifa');
          if (ifaPath) {
            const memorized = memData.filter(m => m.status === 'memorizado').length;
            const studying = memData.filter(m => m.status === 'estudando').length;
            progressMap.set(ifaPath.id, { memorized, studying });
          }
        }

        // For other paths, get progress from user_path_content_progress
        const { data: pathProgressData } = await supabase
          .from('user_path_content_progress')
          .select('path_id, status')
          .eq('user_id', user.id);

        if (pathProgressData) {
          pathProgressData.forEach(p => {
            const current = progressMap.get(p.path_id) || { memorized: 0, studying: 0 };
            if (p.status === 'memorizado') {
              current.memorized++;
            } else if (p.status === 'estudando') {
              current.studying++;
            }
            progressMap.set(p.path_id, current);
          });
        }
      }

      // Map paths with progress
      const pathsWithProgress: LearningPathWithProgress[] = (pathsData || []).map(path => {
        const progress = progressMap.get(path.id) || { memorized: 0, studying: 0 };
        const totalContent = path.total_conteudos || 0;
        const percentage = totalContent > 0 ? Math.round((progress.memorized / totalContent) * 100) : 0;

        return {
          ...path,
          userProgress: {
            totalContent,
            memorized: progress.memorized,
            studying: progress.studying,
            percentage,
          },
          isLocked: path.requer_assinatura && !hasActiveSubscription,
        };
      });

      // Separate active and coming soon paths
      setActivePaths(pathsWithProgress.filter(p => p.ativo));
      setComingSoonPaths(pathsWithProgress.filter(p => !p.ativo));
    } catch (err) {
      console.error('Error loading learning paths:', err);
      setError('Erro ao carregar caminhos de aprendizado');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getPathBySlug = useCallback((slug: string): LearningPathWithProgress | undefined => {
    return [...activePaths, ...comingSoonPaths].find(p => p.slug === slug);
  }, [activePaths, comingSoonPaths]);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  return {
    paths: activePaths, // Backwards compatibility
    activePaths,
    comingSoonPaths,
    loading,
    error,
    refresh: loadPaths,
    getPathBySlug,
  };
}
