import { useState, memo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RotateCcw, Sparkles } from "lucide-react";
import MemorizationStatusBadge from "@/components/MemorizationStatusBadge";
import MilestoneCelebration from "@/components/MilestoneCelebration";
import useMilestoneDetection from "@/hooks/useMilestoneDetection";
import { SafeHtmlRenderer } from "@/components/SafeHtmlRenderer";

interface FlashcardProps {
  numero: number;
  nome: string;
  texto: string;
  verso?: string | null;
  versoResumido?: string | null;
  significado?: string | null;
  onRate: (difficulty: number) => void;
  currentRevisoes?: number;
  currentStrength?: number;
  status?: string;
  hideNumber?: boolean;
}

const Flashcard = memo(function Flashcard({ 
  numero, 
  nome, 
  texto, 
  verso,
  versoResumido,
  significado,
  onRate,
  currentRevisoes = 0,
  currentStrength = 0,
  status = "nao_estudado",
  hideNumber = false
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Milestone detection
  const { currentMilestone, clearMilestone } = useMilestoneDetection({
    currentRevisoes,
    currentStrength,
    status
  });

  // Calculate what the new values will be after this review
  const nextRevisoes = currentRevisoes + 1;
  const isMemorized = status === "memorizado";

  // Determine strength color
  const getStrengthColor = (strength: number) => {
    if (strength >= 61) return "text-green-600 dark:text-green-400";
    if (strength >= 31) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getStrengthBg = (strength: number) => {
    if (strength >= 61) return "bg-green-100 dark:bg-green-900/20";
    if (strength >= 31) return "bg-yellow-100 dark:bg-yellow-900/20";
    return "bg-red-100 dark:bg-red-900/20";
  };

  useEffect(() => {
    if (isMemorized && isFlipped) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isMemorized, isFlipped]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Milestone Celebration */}
      {currentMilestone && (
        <MilestoneCelebration 
          milestone={currentMilestone}
          oduName={`#${numero} ${nome}`}
          onComplete={clearMilestone}
        />
      )}

      {showCelebration && !currentMilestone && (
        <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/20 animate-fade-in">
          <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400 animate-pulse" />
          <AlertDescription className="text-green-700 dark:text-green-300 font-medium">
            🎉 Parabéns! Este Odu está memorizado!
          </AlertDescription>
        </Alert>
      )}

      <Card 
        className={`min-h-[400px] cursor-pointer transition-all hover:shadow-lg ${
          currentMilestone ? 'animate-scale-in' : ''
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
        }}
      >
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            {!hideNumber && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
                #{numero}
              </Badge>
            )}
            <MemorizationStatusBadge status={status as 'nao_estudado' | 'estudando' | 'memorizado'} />
          </div>
          <CardTitle className="text-2xl font-bold mb-4">{nome}</CardTitle>
          
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              {currentRevisoes > 0 && !isMemorized && (
                  <Badge 
                    variant="outline" 
                    className={`${getStrengthBg(currentStrength)} ${getStrengthColor(currentStrength)}`}
                  >
                    Você sabe: {currentStrength}%
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

          <div className="text-sm text-muted-foreground mt-4">
            Clique para revelar o conteúdo completo
          </div>
          
          {significado && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">💡 Significado:</p>
              <SafeHtmlRenderer
                html={significado}
                className="font-medium text-sm prose prose-sm dark:prose-invert max-w-none"
              />
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {!isFlipped ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                Clique para revelar o conteúdo
              </p>
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <RotateCcw className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {versoResumido && (
                <div className="bg-primary/10 dark:bg-primary/5 rounded-lg p-4 border-l-4 border-primary mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <h4 className="font-semibold text-sm">Verso para Memorização:</h4>
                  </div>
                  <p className="text-base italic font-medium">"{versoResumido}"</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Texto Principal:</h4>
              <SafeHtmlRenderer
                html={texto}
                className="text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
              />
              </div>

              {verso && (
                <div>
                  <h4 className="font-semibold mb-2">Verso Completo:</h4>
              <SafeHtmlRenderer
                html={verso}
                className="border-l-4 border-primary pl-4 italic text-muted-foreground prose prose-sm dark:prose-invert"
              />
                </div>
              )}

              {/* Progress indicator */}
              <div className={`p-3 rounded-lg ${getStrengthBg(currentStrength)}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${getStrengthColor(currentStrength)}`}>
                    {currentStrength >= 61 ? "🟢 Você domina bem" : currentStrength >= 31 ? "🟡 Progredindo" : "🔴 Começando"}
                  </span>
                  <span className={`${getStrengthColor(currentStrength)}`}>
                    {currentRevisoes > 0 ? `Você sabe ${currentStrength}%` : "Primeira vez"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isFlipped && (
        <div className="mt-6 space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Quão fácil foi memorizar este Odu?
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onRate(1)}
            >
              Difícil
            </Button>
            <Button
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
              onClick={() => onRate(3)}
            >
              Médio
            </Button>
            <Button
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
              onClick={() => onRate(5)}
            >
              Fácil
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

export default Flashcard;