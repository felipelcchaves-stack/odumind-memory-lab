import Joyride, { TooltipRenderProps } from 'react-joyride';
import { useProductTour } from '@/hooks/useProductTour';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

function CustomTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  skipProps,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="bg-card text-card-foreground rounded-xl shadow-2xl border border-border p-6 max-w-md"
    >
      <div className="flex justify-between items-start mb-4">
        {step.title && (
          <h3 className="text-xl font-bold">{step.title}</h3>
        )}
        <button
          {...closeProps}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="mb-6 text-foreground/90">
        {step.content}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {index + 1} / {12}
        </div>

        <div className="flex gap-2">
          {index > 0 && (
            <Button
              {...backProps}
              variant="outline"
              size="sm"
            >
              Anterior
            </Button>
          )}
          
          {continuous && (
            <Button
              {...primaryProps}
              size="sm"
              className="bg-gradient-primary"
            >
              {index === 11 ? 'Finalizar' : 'Próximo'}
            </Button>
          )}

          {index === 0 && (
            <Button
              {...skipProps}
              variant="ghost"
              size="sm"
            >
              Pular Tour
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductTour() {
  const { run, steps, stepIndex, handleJoyrideCallback, loading } = useProductTour();
  const { theme } = useTheme();

  if (loading) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      tooltipComponent={CustomTooltip}
      styles={{
        options: {
          primaryColor: theme === 'dark' ? '#9b87f5' : '#8B5CF6',
          zIndex: 10000,
        },
        overlay: {
          backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
        },
        spotlight: {
          borderRadius: '12px',
        },
      }}
      locale={{
        back: 'Anterior',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular',
      }}
    />
  );
}
