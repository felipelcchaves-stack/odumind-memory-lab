import { CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

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

  return (
    <Card className="border-2 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-700">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          📅 Seu Guia de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          onClick={() => reviewCount > 0 ? navigate('/study') : navigate('/biblioteca-yoruba')}
        >
          {reviewCount > 0 ? '🚀 Começar Revisões' : '📚 Explorar Conteúdo'}
        </Button>
      </CardContent>
    </Card>
  );
}
