import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Circle, Clock, BookOpen, Play } from 'lucide-react';
import { OduWithStatus, PhaseProgress } from '@/hooks/useLearningPhases';

interface FamilyOduGridProps {
  phaseProgress: PhaseProgress;
  odus: OduWithStatus[];
  loading?: boolean;
  onStartStudy?: () => void;
}

const statusConfig = {
  nao_estudado: {
    icon: Circle,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    label: 'Não estudado',
  },
  estudando: {
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    label: 'Estudando',
  },
  memorizado: {
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
    label: 'Memorizado',
  },
};

export function FamilyOduGrid({ phaseProgress, odus, loading, onStartStudy }: FamilyOduGridProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const { phase, progress, odusMemorized, odusTotal } = phaseProgress;

  // Count by status
  const counts = {
    nao_estudado: odus.filter(o => o.status === 'nao_estudado').length,
    estudando: odus.filter(o => o.status === 'estudando').length,
    memorizado: odus.filter(o => o.status === 'memorizado').length,
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{phase.nome}</h3>
          <p className="text-sm text-muted-foreground">
            {phase.descricao}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Object.entries(counts).map(([status, count]) => {
              const config = statusConfig[status as keyof typeof statusConfig];
              return (
                <Badge key={status} variant="outline" className={cn('text-xs', config.color)}>
                  <config.icon className="h-3 w-3 mr-1" />
                  {count}
                </Badge>
              );
            })}
          </div>
          
          {onStartStudy && (
            <Button onClick={onStartStudy} size="sm" className="gap-2">
              <Play className="h-4 w-4" />
              Estudar Fase
            </Button>
          )}
        </div>
      </div>

      {/* Grid of Odus */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {odus.map((odu) => {
          const config = statusConfig[odu.status];
          const StatusIcon = config.icon;
          
          return (
            <button
              key={odu.id}
              onClick={() => navigate(`/odu/${odu.id}`)}
              className={cn(
                'relative p-3 rounded-lg border text-left transition-all duration-200',
                'hover:shadow-md hover:scale-105 hover:border-primary/50',
                config.bg,
                'border-border'
              )}
            >
              {/* Status icon */}
              <StatusIcon className={cn('absolute top-1 right-1 h-4 w-4', config.color)} />
              
              {/* Odu number */}
              <span className="text-xs text-muted-foreground">#{odu.numero}</span>
              
              {/* Odu name */}
              <p className="font-medium text-sm truncate mt-0.5" title={odu.nome}>
                {odu.nome}
              </p>
              
              {/* Memory strength indicator */}
              {odu.status !== 'nao_estudado' && (
                <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full transition-all duration-300',
                      odu.status === 'memorizado' ? 'bg-green-500' : 'bg-yellow-500'
                    )}
                    style={{ width: `${odu.forca_memoria}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 pt-2 border-t border-border/50">
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <config.icon className={cn('h-3.5 w-3.5', config.color)} />
            <span>{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
