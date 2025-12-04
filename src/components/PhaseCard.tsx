import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle2, Play, ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { PhaseProgress } from '@/hooks/useLearningPhases';

interface PhaseCardProps {
  phaseProgress: PhaseProgress;
  onClick: () => void;
  isExpanded?: boolean;
}

const colorMap: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', accent: 'bg-amber-500' },
  red: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', accent: 'bg-red-500' },
  slate: { bg: 'bg-slate-50 dark:bg-slate-950/30', border: 'border-slate-200 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300', accent: 'bg-slate-500' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', accent: 'bg-blue-500' },
  stone: { bg: 'bg-stone-50 dark:bg-stone-950/30', border: 'border-stone-200 dark:border-stone-700', text: 'text-stone-700 dark:text-stone-300', accent: 'bg-stone-500' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300', accent: 'bg-yellow-500' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-200 dark:border-cyan-800', text: 'text-cyan-700 dark:text-cyan-300', accent: 'bg-cyan-500' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', accent: 'bg-orange-500' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', accent: 'bg-rose-500' },
  zinc: { bg: 'bg-zinc-50 dark:bg-zinc-950/30', border: 'border-zinc-200 dark:border-zinc-700', text: 'text-zinc-700 dark:text-zinc-300', accent: 'bg-zinc-500' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300', accent: 'bg-violet-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', accent: 'bg-emerald-500' },
  lime: { bg: 'bg-lime-50 dark:bg-lime-950/30', border: 'border-lime-200 dark:border-lime-800', text: 'text-lime-700 dark:text-lime-300', accent: 'bg-lime-500' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200 dark:border-sky-800', text: 'text-sky-700 dark:text-sky-300', accent: 'bg-sky-500' },
  green: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', accent: 'bg-green-500' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', accent: 'bg-teal-500' },
  fuchsia: { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/30', border: 'border-fuchsia-200 dark:border-fuchsia-800', text: 'text-fuchsia-700 dark:text-fuchsia-300', accent: 'bg-fuchsia-500' },
};

export function PhaseCard({ phaseProgress, onClick, isExpanded }: PhaseCardProps) {
  const { phase, status, progress, odusMemorized, odusTotal } = phaseProgress;
  const colors = colorMap[phase.cor] || colorMap.slate;
  
  // Get the icon dynamically
  const IconComponent = (LucideIcons as any)[phase.icone] || LucideIcons.Circle;
  
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 p-4 transition-all duration-300 cursor-pointer',
        colors.bg,
        colors.border,
        isLocked && 'opacity-60 grayscale cursor-not-allowed',
        !isLocked && 'hover:shadow-lg hover:scale-[1.02]',
        isExpanded && 'ring-2 ring-primary'
      )}
      onClick={!isLocked ? onClick : undefined}
    >
      {/* Status indicator */}
      <div className="absolute -top-2 -right-2">
        {isLocked && (
          <div className="rounded-full bg-muted p-1.5">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {isCompleted && (
          <div className="rounded-full bg-green-500 p-1.5">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
        )}
        {isInProgress && (
          <div className={cn('rounded-full p-1.5', colors.accent)}>
            <Play className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('rounded-lg p-2', colors.accent, 'text-white')}>
          <IconComponent className="h-6 w-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn('font-semibold text-base truncate', colors.text)}>
              {phase.nome}
            </h3>
            <Badge variant="outline" className={cn('text-xs', colors.text, colors.border)}>
              {phase.ordem === 1 ? 'Fundamentos' : `Fase ${phase.ordem}`}
            </Badge>
          </div>
          
          {phase.descricao && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {phase.descricao}
            </p>
          )}

          {/* Progress bar */}
          {!isLocked && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {odusMemorized} de {odusTotal} Odu
                </span>
                <span className={cn('font-medium', colors.text)}>{progress}%</span>
              </div>
              <Progress 
                value={progress} 
                className={cn('h-2', isCompleted && '[&>div]:bg-green-500')}
              />
            </div>
          )}

          {/* Locked message */}
          {isLocked && (
            <p className="text-xs text-muted-foreground mt-2">
              Complete a fase anterior para desbloquear
            </p>
          )}
        </div>

        {/* Arrow */}
        {!isLocked && (
          <ChevronRight className={cn('h-5 w-5 mt-1', colors.text)} />
        )}
      </div>
    </div>
  );
}
