import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Map, Crown, ChevronRight, Trophy } from 'lucide-react';
import { useLearningPhases } from '@/hooks/useLearningPhases';
import { cn } from '@/lib/utils';

export function CaminhoIfaMiniMap() {
  const navigate = useNavigate();
  const { phaseProgress, loading, getCurrentPhase, getOverallProgress } = useLearningPhases();
  
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const currentPhase = getCurrentPhase();
  const overallProgress = getOverallProgress();
  const completedPhases = phaseProgress.filter(p => p.status === 'completed').length;

  return (
    <Card className="overflow-hidden" data-tour="caminho-ifa">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Caminho de Ifá</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {completedPhases}/{phaseProgress.length} fases
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso Total</span>
            <span className="font-medium">{overallProgress.percentage}%</span>
          </div>
          <Progress value={overallProgress.percentage} className="h-2" />
        </div>

        {/* Current Phase */}
        {currentPhase && (
          <div 
            className={cn(
              'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md',
              currentPhase.status === 'in_progress' 
                ? 'bg-primary/5 border-primary/20' 
                : 'bg-muted/50 border-border'
            )}
            onClick={() => navigate(`/caminho-ifa?fase=${currentPhase.phase.slug}`)}
          >
            <div className="flex items-center gap-2 mb-2">
              {currentPhase.phase.ordem === 1 ? (
                <Crown className="h-4 w-4 text-amber-500" />
              ) : (
                <Trophy className="h-4 w-4 text-primary" />
              )}
              <span className="font-medium text-sm">{currentPhase.phase.nome}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {currentPhase.odusMemorized}/{currentPhase.odusTotal} Odu
              </span>
              <Progress value={currentPhase.progress} className="h-1.5 w-20" />
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => navigate('/caminho-ifa')}
        >
          Ver Caminho Completo
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
