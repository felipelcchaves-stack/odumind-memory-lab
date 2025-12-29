import { useState, memo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RotateCcw, Sparkles } from "lucide-react";
import MemorizationStatusBadge from "@/components/MemorizationStatusBadge";
import MilestoneCelebration from "@/components/MilestoneCelebration";
import useMilestoneDetection from "@/hooks/useMilestoneDetection";
import { SafeHtmlRenderer } from "@/components/SafeHtmlRenderer";
import { ProtectedContent } from "@/components/ProtectedContent";
import { useContentProtection } from "@/hooks/useContentProtection";

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
  // Use centralized content protection
  useContentProtection();

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
    <ProtectedContent>
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
        className={`min-h-[400px] max-h-[calc(100vh-220px)] overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
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
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between mb-2">
            {!hideNumber && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
                #{numero}
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <MemorizationStatusBadge status={status as 'nao_estudado' | 'estudando' | 'memorizado'} />
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
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold break-words hyphens-auto">{nome}</CardTitle>
          
          {currentRevisoes > 0 && !isMemorized && (
            <Badge 
              variant="outline" 
              className={`mt-2 w-fit ${getStrengthBg(currentStrength)} ${getStrengthColor(currentStrength)}`}
            >
              Você sabe: {currentStrength}%
            </Badge>
          )}
        </CardHeader>

        <CardContent className="pt-2 flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-400px)] md:h-[calc(100vh-380px)]">
            <div className="pr-3 space-y-4">
              {/* Significado - agora dentro do scroll */}
              {significado && (
                <div className="p-3 md:p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">💡 Significado:</p>
                  <SafeHtmlRenderer
                    html={significado}
                    className="font-medium text-sm prose prose-sm dark:prose-invert max-w-none break-words"
                  />
                </div>
              )}

              {!isFlipped ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-base mb-4">
                    Clique para revelar o conteúdo
                  </p>
                  <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <RotateCcw className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {versoResumido && (
                    <div className="bg-primary/10 dark:bg-primary/5 rounded-lg p-3 md:p-4 border-l-4 border-primary">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary animate-pulse flex-shrink-0" />
                        <h4 className="font-semibold text-sm">Verso para Memorização:</h4>
                      </div>
                      <p className="text-sm md:text-base italic font-medium break-words">"{versoResumido}"</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Texto Principal:</h4>
                    <SafeHtmlRenderer
                      html={texto}
                      className="text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere"
                    />
                  </div>

                  {verso && (
                    <div>
                      <h4 className="font-semibold mb-2">Verso Completo:</h4>
                      <SafeHtmlRenderer
                        html={verso}
                        className="border-l-4 border-primary pl-4 italic text-muted-foreground prose prose-sm dark:prose-invert max-w-none break-words"
                      />
                    </div>
                  )}

                  {/* Progress indicator */}
                  <div className={`p-3 rounded-lg ${getStrengthBg(currentStrength)}`}>
                    <div className="flex items-center justify-between text-sm flex-wrap gap-2">
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
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {isFlipped && (
        <div className="mt-6 space-y-3 pb-4">
          <p className="text-center text-sm text-muted-foreground">
            Quão fácil foi memorizar este Odu?
          </p>
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <Button
              variant="outline"
              size="lg"
              className="h-12 md:h-10 text-sm border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onRate(1)}
            >
              Difícil
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 md:h-10 text-sm border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
              onClick={() => onRate(3)}
            >
              Médio
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 md:h-10 text-sm border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
              onClick={() => onRate(5)}
            >
              Fácil
            </Button>
          </div>
        </div>
      )}
      </div>
    </ProtectedContent>
  );
});

export default Flashcard;