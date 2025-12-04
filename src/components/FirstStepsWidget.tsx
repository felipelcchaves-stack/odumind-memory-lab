import { CheckCircle, Circle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useCurrentPhase } from '@/hooks/useCurrentPhase';

interface FirstStepsWidgetProps {
  hasCompletedFirstStudy: boolean;
  onStartStudy: () => void;
}

export function FirstStepsWidget({ hasCompletedFirstStudy, onStartStudy }: FirstStepsWidgetProps) {
  const navigate = useNavigate();
  const { currentPhase, hasStartedJourney, totalPhasesCompleted } = useCurrentPhase();

  // Navega para o Caminho de Ifá ao clicar em "Começar"
  const handleStartJourney = () => {
    navigate('/caminho-ifa');
  };

  return (
    <Card className="border-primary shadow-medium bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          👋 Bem-vindo! Seus Primeiros Passos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span className="font-medium">1. Cadastro completo ✓</span>
          </div>
          
          <div className={`flex items-center gap-3 p-2 rounded-lg ${hasStartedJourney ? 'bg-background/50' : 'bg-primary/10'}`}>
            {hasStartedJourney ? (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={hasStartedJourney ? 'font-medium' : 'font-semibold'}>
              2. Iniciar o Caminho de Ifá
            </span>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            {totalPhasesCompleted > 0 ? (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <span>3. Completar primeira fase</span>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span>4. Explorar Rituais e Rezas</span>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span>5. Configurar sua meta diária</span>
          </div>
        </div>

        {!hasStartedJourney ? (
          <Button 
            size="lg" 
            className="w-full mt-4 text-lg font-semibold" 
            onClick={handleStartJourney}
          >
            🚀 Iniciar Caminho de Ifá
          </Button>
        ) : (
          <div className="space-y-2 mt-4">
            {/* Fase atual */}
            {currentPhase && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Sua Fase Atual
                </div>
                <p className="font-semibold">{currentPhase.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {currentPhase.completionPercentage}% concluído
                </p>
              </div>
            )}
            
            <Button 
              className="w-full"
              onClick={() => currentPhase 
                ? navigate(`/study?fase=${currentPhase.slug}`)
                : navigate('/caminho-ifa')
              }
            >
              📚 Continuar Estudando
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/caminho-ifa')}
              >
                🗺️ Ver Caminho
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/biblioteca-yoruba')}
              >
                📖 Biblioteca
              </Button>
            </div>
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => navigate('/biblioteca-yoruba?tab=rituais')}
            >
              🕯️ Explorar Rituais
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
