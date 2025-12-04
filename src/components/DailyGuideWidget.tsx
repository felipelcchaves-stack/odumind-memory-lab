import { CheckCircle, Circle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useCurrentPhase } from '@/hooks/useCurrentPhase';

interface DailyGuideWidgetProps {
  reviewCount: number;
  hasStudiedToday: boolean;
  hasExploredRitual: boolean;
  hasPracticedPrayer: boolean;
}

export function DailyGuideWidget({ 
  reviewCount, 
  hasStudiedToday, 
  hasExploredRitual, 
  hasPracticedPrayer 
}: DailyGuideWidgetProps) {
  const navigate = useNavigate();
  const { currentPhase, hasStartedJourney, loading } = useCurrentPhase();

  const getMainCTA = () => {
    if (!hasStartedJourney) {
      return {
        label: '🚀 Iniciar Jornada',
        action: () => navigate('/caminho-ifa'),
      };
    }

    if (reviewCount > 0 && currentPhase) {
      return {
        label: `📖 Revisar ${reviewCount} Odu`,
        action: () => navigate(`/study?fase=${currentPhase.slug}`),
      };
    }

    if (currentPhase && currentPhase.status !== 'completed') {
      return {
        label: `📚 Continuar: ${currentPhase.nome}`,
        action: () => navigate(`/study?fase=${currentPhase.slug}`),
      };
    }

    return {
      label: '🗺️ Ver Caminho de Ifá',
      action: () => navigate('/caminho-ifa'),
    };
  };

  const mainCTA = getMainCTA();

  return (
    <Card className="border-2 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-700">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          📅 Seu Guia de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fase Atual */}
        {currentPhase && !loading && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              Fase Atual
            </div>
            <p className="font-semibold text-foreground">{currentPhase.nome}</p>
            <p className="text-sm text-muted-foreground">
              {currentPhase.memorizedCount}/{currentPhase.totalCount} Odus ({currentPhase.completionPercentage}%)
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            {hasStudiedToday && reviewCount === 0 ? (
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-base font-medium">
              {reviewCount > 0 ? `Revisar ${reviewCount} Odu` : 'Todas as revisões em dia!'}
            </span>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            {hasExploredRitual ? (
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-base">Explorar 1 novo Ritual</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
            {hasPracticedPrayer ? (
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-base">Praticar 1 Reza</span>
          </div>
        </div>

        <Button 
          size="lg" 
          className="w-full text-lg font-semibold" 
          onClick={mainCTA.action}
          disabled={loading}
        >
          {mainCTA.label}
        </Button>

        {hasStartedJourney && (
          <Button 
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate('/caminho-ifa')}
          >
            🗺️ Ver Mapa do Caminho
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
