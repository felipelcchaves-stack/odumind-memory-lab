import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useCurrentPhase } from '@/hooks/useCurrentPhase';
import { MapPin, Loader2 } from 'lucide-react';

interface ActionCardProps {
  reviewCount: number;
  hasReviews: boolean;
}

export function ActionCard({ reviewCount, hasReviews }: ActionCardProps) {
  const navigate = useNavigate();
  const { currentPhase, hasStartedJourney, loading, totalPhasesCompleted } = useCurrentPhase();

  const handleMainAction = () => {
    if (!hasStartedJourney) {
      // Usuário nunca estudou - ir para Caminho de Ifá
      navigate('/caminho-ifa');
      return;
    }

    if (hasReviews && currentPhase) {
      // Tem revisões pendentes - estudar na fase atual
      navigate(`/study?fase=${currentPhase.slug}`);
      return;
    }

    if (currentPhase && currentPhase.status !== 'completed') {
      // Fase em progresso - continuar
      navigate(`/study?fase=${currentPhase.slug}`);
      return;
    }

    // Todas as fases completas ou sem fase - ir para Caminho
    navigate('/caminho-ifa');
  };

  const getButtonLabel = () => {
    if (!hasStartedJourney) {
      return '🚀 Iniciar Caminho de Ifá';
    }
    if (hasReviews) {
      return `📖 Revisar ${reviewCount} Odu`;
    }
    if (currentPhase && currentPhase.status !== 'completed') {
      return '📚 Continuar Estudando';
    }
    return '🗺️ Ver Caminho de Ifá';
  };

  const getMessage = () => {
    if (!hasStartedJourney) {
      return 'Comece sua jornada estruturada de memorização dos 256 Odu de Ifá!';
    }
    if (hasReviews) {
      return (
        <>
          Você tem <span className="text-primary font-bold text-4xl">{reviewCount}</span> Odu para revisar hoje!
        </>
      );
    }
    if (currentPhase && currentPhase.status !== 'completed') {
      return (
        <>
          🎉 Revisões em dia! Continue avançando na fase{' '}
          <span className="font-semibold">{currentPhase.nome}</span>
        </>
      );
    }
    return '🏆 Parabéns! Você completou todas as fases disponíveis!';
  };

  if (loading) {
    return (
      <Card className="border-4 border-primary shadow-2xl bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="pt-8 pb-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando seu progresso...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-4 border-primary shadow-2xl bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="pt-8 pb-8 text-center">
        <h2 className="text-3xl font-bold mb-4">
          📚 O Que Fazer Agora?
        </h2>

        {/* Fase Atual Badge */}
        {currentPhase && hasStartedJourney && (
          <div className="flex justify-center mb-4">
            <Badge variant="secondary" className="text-sm px-4 py-2">
              <MapPin className="h-4 w-4 mr-2" />
              Fase Atual: {currentPhase.nome} ({currentPhase.completionPercentage}%)
            </Badge>
          </div>
        )}
        
        <p className="text-xl mb-6">
          {getMessage()}
        </p>

        <Button 
          size="lg" 
          className="text-2xl px-12 py-8 h-auto font-bold"
          onClick={handleMainAction}
        >
          {getButtonLabel()}
        </Button>

        {/* Botão secundário para ver caminho completo */}
        {hasStartedJourney && (
          <Button 
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={() => navigate('/caminho-ifa')}
          >
            🗺️ Ver Mapa Completo do Caminho
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
