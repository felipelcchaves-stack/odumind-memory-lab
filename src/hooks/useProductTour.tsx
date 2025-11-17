import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Step, CallBackProps, STATUS } from 'react-joyride';
import { toast } from 'sonner';

const TOUR_VERSION = '1.0';

export const tourSteps: Step[] = [
  // Dashboard Steps
  {
    target: '[data-tour="welcome"]',
    content: 'Bem-vindo ao SaaS de Memorização Yoruba! 🎉 Vamos fazer um tour rápido para você conhecer as principais funcionalidades da plataforma.',
    title: 'Bem-vindo!',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="stats-cards"]',
    content: 'Aqui você vê seu XP total, sequência de dias estudados (streak) e sua meta diária de estudos.',
    title: 'Acompanhe seu Progresso 📊',
    placement: 'bottom',
  },
  {
    target: '[data-tour="progress-bar"]',
    content: 'Acompanhe quantos Odu você já memorizou, está estudando e ainda precisa aprender.',
    title: 'Progresso nos 256 Odu Ifá',
    placement: 'top',
  },
  {
    target: '[data-tour="daily-reviews"]',
    content: 'O sistema usa spaced repetition para otimizar sua memorização. Faça suas revisões diárias!',
    title: 'Revisões Diárias 🔄',
    placement: 'right',
  },
  {
    target: '[data-tour="badges"]',
    content: 'Ganhe badges especiais conforme avança na memorização dos Odu!',
    title: 'Conquistas e Badges 🏆',
    placement: 'left',
  },
  {
    target: '[data-tour="study-button"]',
    content: 'Clique aqui para iniciar uma sessão de estudo personalizada.',
    title: 'Comece a Estudar!',
    placement: 'bottom',
  },
  // Odu Library Steps
  {
    target: '[data-tour="odu-library"]',
    content: 'Aqui estão todos os 256 Odu Ifá organizados e prontos para estudo.',
    title: 'Biblioteca de Odu 📚',
    placement: 'bottom',
  },
  {
    target: '[data-tour="search-bar"]',
    content: 'Pesquise Odu por nome, número ou tags relacionadas.',
    title: 'Busca Inteligente 🔍',
    placement: 'bottom',
  },
  {
    target: '[data-tour="odu-card"]',
    content: 'Clique em qualquer Odu para ver detalhes, estudar ou fazer revisões.',
    title: 'Detalhes do Odu',
    placement: 'right',
  },
  // Navigation Steps
  {
    target: '[data-tour="nav-menu"]',
    content: 'Acesse todas as funcionalidades: Dashboard, Biblioteca, Palácio da Memória, e mais.',
    title: 'Menu de Navegação 🧭',
    placement: 'bottom',
  },
  {
    target: '[data-tour="user-menu"]',
    content: 'Configure suas preferências, ajuste sua meta diária e veja suas estatísticas.',
    title: 'Seu Perfil ⚙️',
    placement: 'bottom-start',
  },
  {
    target: '[data-tour="theme-toggle"]',
    content: 'Alterne entre modo claro e escuro conforme sua preferência.',
    title: 'Tema Personalizável 🌓',
    placement: 'bottom',
  },
];

export function useProductTour() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load tour progress from Supabase
  useEffect(() => {
    const loadTourProgress = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_tour_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('tour_version', TOUR_VERSION)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          // First time user - show tour
          setRun(true);
          setTourCompleted(false);
        } else {
          setTourCompleted(data.tour_completed);
          setStepIndex(data.current_step || 0);
          setRun(!data.tour_completed);
        }
      } catch (error) {
        console.error('Error loading tour progress:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTourProgress();
  }, [user]);

  // Save tour progress
  const saveTourProgress = useCallback(async (step: number, completed: boolean = false) => {
    if (!user) return;

    try {
      const progressData = {
        user_id: user.id,
        tour_version: TOUR_VERSION,
        current_step: step,
        tour_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('user_tour_progress')
        .upsert(progressData, {
          onConflict: 'user_id,tour_version',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving tour progress:', error);
    }
  }, [user]);

  // Handle Joyride callback
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, index, type, action } = data;

    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      setTourCompleted(true);
      saveTourProgress(index, true);
    } else if (type === 'step:after') {
      const nextStepIndex = index + (action === 'prev' ? -1 : 1);
      setStepIndex(nextStepIndex);
      saveTourProgress(nextStepIndex, false);

      // Navigate to Odu Library when reaching step 6
      if (nextStepIndex === 6 && action === 'next') {
        navigate('/odu');
      }
      // Navigate back to Dashboard when going back from step 6
      if (index === 6 && action === 'prev') {
        navigate('/dashboard');
      }
    }
  }, [navigate, saveTourProgress]);

  // Start tour
  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
    setTourCompleted(false);
    navigate('/dashboard');
  }, [navigate]);

  // Reset tour
  const resetTour = useCallback(async () => {
    if (!user) {
      toast.error('Usuário não encontrado');
      return;
    }
    
    try {
      toast.loading('Reiniciando tour...', { id: 'reset-tour' });
      
      const { error } = await supabase
        .from('user_tour_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('tour_version', TOUR_VERSION);

      if (error) throw error;

      toast.success('Tour reiniciado! Começando...', { id: 'reset-tour' });
      
      // Dar um pequeno delay para o toast aparecer
      setTimeout(() => {
        startTour();
      }, 500);
    } catch (error) {
      console.error('Error resetting tour:', error);
      toast.error('Erro ao reiniciar tour', { id: 'reset-tour' });
    }
  }, [user, startTour]);

  // Skip tour
  const skipTour = useCallback(() => {
    setRun(false);
    setTourCompleted(true);
    saveTourProgress(stepIndex, true);
  }, [stepIndex, saveTourProgress]);

  return {
    run,
    steps: tourSteps,
    stepIndex,
    startTour,
    resetTour,
    skipTour,
    handleJoyrideCallback,
    tourCompleted,
    loading,
  };
}
