import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Pause, Play, Trophy, Clock, TrendingUp, Target } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SessionControlsProps {
  onEndSession: () => void;
  onPauseSession: () => void;
  isPaused: boolean;
  sessionStats: {
    cardsStudied: number;
    totalCards: number;
    correctAnswers: number;
    wrongAnswers: number;
    startTime: number;
  };
  sessionRounds: number;
  isSessionActive: boolean;
}

export function SessionControls({
  onEndSession,
  onPauseSession,
  isPaused,
  sessionStats,
  sessionRounds,
  isSessionActive
}: SessionControlsProps) {
  const isMobile = useIsMobile();
  const sessionDuration = Date.now() - sessionStats.startTime;
  const minutes = Math.floor(sessionDuration / 60000);
  const accuracyRate = sessionStats.totalCards > 0 
    ? Math.round((sessionStats.correctAnswers / sessionStats.totalCards) * 100)
    : 0;

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSessionActive) return null;

  // Mobile Layout - Single bottom bar
  if (isMobile) {
    return (
      <>
        {/* Mobile bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-50 p-3 safe-area-inset-bottom">
          <div className="flex items-center justify-between gap-2">
            {/* Compact stats */}
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-primary" />
                {sessionStats.totalCards}
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3 text-green-500" />
                {accuracyRate}%
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-orange-500" />
                {formatTime(sessionDuration)}
              </span>
            </div>
            
            {/* Control buttons */}
            <div className="flex gap-2">
              <Button
                variant={isPaused ? "default" : "outline"}
                size="sm"
                onClick={onPauseSession}
                className="h-9 w-9 p-0"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onEndSession}
                className="h-9 w-9 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Pause overlay - Mobile optimized */}
        {isPaused && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <Card className="max-w-sm w-full mx-4">
              <CardContent className="p-6 text-center space-y-4">
                <div className="text-5xl mb-2">⏸️</div>
                <h2 className="text-xl font-bold">Sessão Pausada</h2>
                <p className="text-sm text-muted-foreground">
                  Descanse um pouco e volte quando estiver pronto!
                </p>
                <div className="grid grid-cols-3 gap-3 py-3">
                  <div>
                    <div className="text-xl font-bold text-primary">{sessionStats.totalCards}</div>
                    <div className="text-xs text-muted-foreground">Cards</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-500">{accuracyRate}%</div>
                    <div className="text-xs text-muted-foreground">Acerto</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-500">{minutes}min</div>
                    <div className="text-xs text-muted-foreground">Tempo</div>
                  </div>
                </div>
                <Button onClick={onPauseSession} size="lg" className="w-full">
                  <Play className="mr-2 h-4 w-4" />
                  Continuar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  }

  // Desktop Layout - Original
  return (
    <>
      {/* Floating control buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        <Button
          variant={isPaused ? "default" : "outline"}
          size="lg"
          className="shadow-lg"
          onClick={onPauseSession}
        >
          {isPaused ? (
            <>
              <Play className="mr-2 h-4 w-4" />
              Retomar
            </>
          ) : (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pausar
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          className="shadow-lg"
          onClick={onEndSession}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Finalizar
        </Button>
      </div>

      {/* Stats overlay card */}
      <Card className="fixed bottom-4 left-4 z-50 max-w-xs bg-background/95 backdrop-blur">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-medium">Cards: {sessionStats.totalCards}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-green-500" />
            <span className="font-medium">Acerto: {accuracyRate}%</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Rodadas: {sessionRounds + 1}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="font-medium">{formatTime(sessionDuration)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center space-y-4">
              <div className="text-6xl mb-4">⏸️</div>
              <h2 className="text-2xl font-bold">Sessão Pausada</h2>
              <p className="text-muted-foreground">
                Descanse um pouco e volte quando estiver pronto!
              </p>
              <div className="grid grid-cols-3 gap-4 py-4">
                <div>
                  <div className="text-2xl font-bold text-primary">{sessionStats.totalCards}</div>
                  <div className="text-xs text-muted-foreground">Cards</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">{accuracyRate}%</div>
                  <div className="text-xs text-muted-foreground">Acerto</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-500">{minutes}min</div>
                  <div className="text-xs text-muted-foreground">Tempo</div>
                </div>
              </div>
              <Button onClick={onPauseSession} size="lg" className="w-full">
                <Play className="mr-2 h-4 w-4" />
                Continuar Estudando
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
