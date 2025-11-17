import { useState, memo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RotateCcw, Sparkles } from "lucide-react";

interface FlashcardProps {
  numero: number;
  nome: string;
  texto: string;
  verso?: string | null;
  onRate: (difficulty: number) => void;
  currentRevisoes?: number;
  currentStrength?: number;
  status?: string;
}

const Flashcard = memo(function Flashcard({ 
  numero, 
  nome, 
  texto, 
  verso, 
  onRate,
  currentRevisoes = 0,
  currentStrength = 0,
  status = "nao_estudado"
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

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
      {showCelebration && (
        <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/20">
          <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-700 dark:text-green-300 font-medium">
            🎉 Parabéns! Este Odu está memorizado!
          </AlertDescription>
        </Alert>
      )}

      <Card 
        className="min-h-[400px] cursor-pointer transition-all hover:shadow-lg"
        onClick={() => setIsFlipped(!isFlipped)}
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
        }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                #{numero}
              </Badge>
              {currentRevisoes > 0 && (
                <Badge 
                  variant="outline" 
                  className={`${getStrengthBg(currentStrength)} ${getStrengthColor(currentStrength)}`}
                >
                  Revisão {nextRevisoes}/3 • {currentStrength}%
                </Badge>
              )}
              {isMemorized && (
                <Badge variant="success" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Memorizado
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
          <CardTitle className="text-2xl mt-4">{nome}</CardTitle>
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
              <div>
                <h4 className="font-semibold mb-2">Texto Principal:</h4>
                <p className="text-foreground leading-relaxed">{texto}</p>
              </div>

              {verso && (
                <div>
                  <h4 className="font-semibold mb-2">Verso:</h4>
                  <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                    {verso}
                  </blockquote>
                </div>
              )}

              {/* Progress indicator */}
              <div className={`p-3 rounded-lg ${getStrengthBg(currentStrength)}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${getStrengthColor(currentStrength)}`}>
                    {currentStrength >= 61 ? "🟢 Forte" : currentStrength >= 31 ? "🟡 Progredindo" : "🔴 Iniciante"}
                  </span>
                  <span className={`${getStrengthColor(currentStrength)}`}>
                    {currentRevisoes > 0 ? `${currentRevisoes} revisões feitas` : "Primeira vez"}
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