import { useEffect, useState } from 'react';
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DashboardTourProps {
  run: boolean;
  onComplete: () => void;
}

export function DashboardTour({ run, onComplete }: DashboardTourProps) {
  const { user } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = [
    {
      target: '[data-tour="action-card"]',
      content: 'Este é seu guia principal! Aqui você vê exatamente o que fazer agora: se tem Odu para revisar ou se pode explorar novos conteúdos.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '[data-tour="progress-card"]',
      content: 'Acompanhe seu progresso em tempo real! Veja quantos Odu você já memorizou, quantos está estudando e quantos ainda faltam.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="stats-cards"]',
      content: 'Suas estatísticas importantes: revisões do dia, força da memória, streak (dias consecutivos) e pontos de estudo (XP).',
      placement: 'bottom',
    },
    {
      target: '[data-tour="daily-guide"]',
      content: 'Seu guia diário permanente! Aqui você sempre verá as tarefas recomendadas para hoje, como revisar Odu, explorar rituais ou praticar rezas.',
      placement: 'top',
    },
    {
      target: '[data-tour="content-categories"]',
      content: 'Explore todo o conteúdo! Além dos 256 Odu Ifá, você tem acesso a Rituais, Rezas e Invocações da tradição Yorubá.',
      placement: 'top',
    },
    {
      target: '[data-tour="header-nav"]',
      content: 'Use o menu superior para navegar entre Dashboard, Biblioteca, Técnicas de Memorização e muito mais!',
      placement: 'bottom',
    },
    {
      target: '[data-tour="theme-toggle"]',
      content: 'Prefere tema escuro ou claro? Clique aqui para alternar o tema do aplicativo.',
      placement: 'bottom',
    },
  ];

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, action, index, type } = data;

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Avança para próximo step
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      // Tour finalizado ou pulado
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('user_id', user?.id);

        if (status === STATUS.FINISHED) {
          toast.success('🎉 Tour completado! Agora você conhece todas as funcionalidades!');
        }
        
        onComplete();
      } catch (error) {
        console.error('Error completing tour:', error);
        onComplete();
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      disableScrolling={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: 'hsl(var(--background))',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '8px',
          padding: '20px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: '10px',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        open: 'Abrir',
        skip: 'Pular Tour',
      }}
    />
  );
}
