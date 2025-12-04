import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PhaseCard } from '@/components/PhaseCard';
import { FamilyOduGrid } from '@/components/FamilyOduGrid';
import { Crown, Map, Trophy, Sparkles } from 'lucide-react';
import { PhaseProgress, OduWithStatus } from '@/hooks/useLearningPhases';

interface LearningJourneyProps {
  phaseProgress: PhaseProgress[];
  loading: boolean;
  overallProgress: {
    memorized: number;
    total: number;
    percentage: number;
    phasesCompleted: number;
    totalPhases: number;
  };
  onPhaseSelect: (phaseId: string) => void;
  selectedPhase: PhaseProgress | null;
  selectedPhaseOdus: OduWithStatus[];
  loadingOdus: boolean;
  onStartStudy: (phaseSlug: string) => void;
  onStartReview: (phaseSlug: string) => void;
}

export function LearningJourney({
  phaseProgress,
  loading,
  overallProgress,
  onPhaseSelect,
  selectedPhase,
  selectedPhaseOdus,
  loadingOdus,
  onStartStudy,
  onStartReview,
}: LearningJourneyProps) {
  
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Separate Oju Odu and families
  const ojuOdu = phaseProgress.find(p => p.phase.slug === 'oju-odu');
  const families = phaseProgress.filter(p => p.phase.slug !== 'oju-odu');

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Seu Caminho de Ifá</CardTitle>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Trophy className="h-3 w-3" />
              {overallProgress.phasesCompleted}/{overallProgress.totalPhases} fases
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso Geral</span>
              <span className="font-semibold">
                {overallProgress.memorized} de {overallProgress.total} Odu ({overallProgress.percentage}%)
              </span>
            </div>
            <Progress value={overallProgress.percentage} className="h-3" />
            
            {overallProgress.percentage === 100 ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Sparkles className="h-4 w-4" />
                <span>Parabéns! Você é um Mestre dos 256 Odu!</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Continue estudando para memorizar todos os 256 Odu de Ifá
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Phase 1: Oju Odu */}
      {ojuOdu && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Fase 1: Fundamentos</h2>
          </div>
          <PhaseCard
            phaseProgress={ojuOdu}
            onClick={() => onPhaseSelect(ojuOdu.phase.id)}
            isExpanded={selectedPhase?.phase.id === ojuOdu.phase.id}
          />
          
          {/* Show Odu grid when selected */}
          {selectedPhase?.phase.id === ojuOdu.phase.id && (
            <Card className="mt-3">
              <CardContent className="pt-4">
              <FamilyOduGrid
                  phaseProgress={ojuOdu}
                  odus={selectedPhaseOdus}
                  loading={loadingOdus}
                  onStartStudy={() => onStartStudy(ojuOdu.phase.slug)}
                  onStartReview={() => onStartReview(ojuOdu.phase.slug)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Phase 2: Families */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Fase 2: Famílias dos Odu</h2>
          <Badge variant="outline" className="text-xs">
            16 famílias
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Após dominar os fundamentos, explore cada família de Odu com suas combinações.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {families.map((familyProgress) => (
            <div key={familyProgress.phase.id}>
              <PhaseCard
                phaseProgress={familyProgress}
                onClick={() => onPhaseSelect(familyProgress.phase.id)}
                isExpanded={selectedPhase?.phase.id === familyProgress.phase.id}
              />
            </div>
          ))}
        </div>

        {/* Show Odu grid for selected family */}
        {selectedPhase && selectedPhase.phase.slug !== 'oju-odu' && (
          <Card className="mt-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <CardContent className="pt-4">
            <FamilyOduGrid
                phaseProgress={selectedPhase}
                odus={selectedPhaseOdus}
                loading={loadingOdus}
                onStartStudy={() => onStartStudy(selectedPhase.phase.slug)}
                onStartReview={() => onStartReview(selectedPhase.phase.slug)}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mastery Section */}
      <Card className={cn(
        'border-2 border-dashed',
        overallProgress.percentage === 100 
          ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/20' 
          : 'border-muted'
      )}>
        <CardContent className="flex items-center justify-center py-8 text-center">
          <div>
            <Trophy className={cn(
              'h-12 w-12 mx-auto mb-3',
              overallProgress.percentage === 100 ? 'text-yellow-500' : 'text-muted-foreground/50'
            )} />
            <h3 className="font-semibold text-lg mb-1">
              {overallProgress.percentage === 100 ? 'Mestria Alcançada!' : 'Fase Final: Mestria'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {overallProgress.percentage === 100 
                ? 'Você completou a memorização de todos os 256 Odu de Ifá. Axé!'
                : 'Complete todas as fases para se tornar um Mestre dos 256 Odu de Ifá.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
