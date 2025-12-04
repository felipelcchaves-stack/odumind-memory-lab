import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Limites de caracteres para truncamento (desktop)
const CHAR_LIMITS = {
  verso: 120,
  context: 150,
  option: 80,
};

// Limites reduzidos para mobile (70% do desktop)
const MOBILE_CHAR_LIMITS = {
  verso: 84,
  context: 105,
  option: 56,
};

// Componente de texto truncável com suporte mobile
function TruncatableText({ 
  text, 
  limit, 
  className = "" 
}: { 
  text: string; 
  limit: number; 
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();
  
  // Aplica limite adaptativo baseado no device
  const adaptiveLimit = isMobile ? Math.floor(limit * 0.7) : limit;
  const shouldTruncate = text.length > adaptiveLimit;
  
  if (!shouldTruncate) {
    return (
      <span className={`break-words whitespace-normal overflow-wrap-anywhere ${className}`}>
        {text}
      </span>
    );
  }
  
  const displayText = isExpanded ? text : text.slice(0, adaptiveLimit) + "...";
  
  return (
    <span className={`break-words whitespace-normal overflow-wrap-anywhere block max-w-full ${className}`}>
      {displayText}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="inline-flex items-center ml-1 text-primary hover:underline text-sm font-medium min-h-[44px] md:min-h-0 touch-manipulation"
      >
        {isExpanded ? (
          <>Ver menos <ChevronUp className="h-3 w-3 ml-0.5" /></>
        ) : (
          <>Ver mais <ChevronDown className="h-3 w-3 ml-0.5" /></>
        )}
      </button>
    </span>
  );
}

interface QuizQuestion {
  oduId: string;
  numero: number;
  nome: string;
  correctAnswer: string;
  options: string[];
  type: "nome" | "verso_para_nome" | "nome_para_verso" | "verso_para_significado" | "aplicacao_pratica";
  versoResumido?: string;
  significado?: string;
  context?: string;
  explanation?: string;
}

interface QuizProps {
  question: QuizQuestion;
  onAnswer: (correct: boolean) => void;
}

const Quiz = memo(function Quiz({ question, onAnswer }: QuizProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
  }, [question]);

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const isCorrect = answer === question.correctAnswer;
    
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 1500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto overflow-hidden">
      <Card className="min-h-[400px] overflow-hidden">
        <CardHeader className="overflow-x-hidden">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="secondary">Quiz</Badge>
            <Badge variant="outline">
              {question.type === "aplicacao_pratica" ? "Aplicação Prática" : 
               question.type === "nome" ? "Nome do Odu" : 
               "Associação"}
            </Badge>
          </div>
          <CardTitle className="text-xl md:text-2xl">
            {question.type === "nome" ? (
              <>Qual é o nome deste Odu?</>
            ) : question.type === "verso_para_nome" ? (
              <>
                <div className="mb-2 text-base font-normal text-muted-foreground">Qual Odu diz:</div>
                <div className="text-base md:text-lg italic">
                  "<TruncatableText text={question.versoResumido || ""} limit={CHAR_LIMITS.verso} />"
                </div>
              </>
            ) : question.type === "nome_para_verso" ? (
              <>Qual é o verso de {question.nome}?</>
            ) : question.type === "verso_para_significado" ? (
              <>
                <div className="mb-2 text-base font-normal text-muted-foreground">O verso:</div>
                <div className="text-base md:text-lg italic mb-3">
                  "<TruncatableText text={question.versoResumido || ""} limit={CHAR_LIMITS.verso} />"
                </div>
                <div className="text-base font-normal">representa qual significado?</div>
              </>
            ) : question.type === "aplicacao_pratica" ? (
              <>
                <div className="mb-2 text-base font-normal text-muted-foreground">Situação:</div>
                <div className="text-base md:text-lg mb-3">
                  <TruncatableText text={question.context || ""} limit={CHAR_LIMITS.context} />
                </div>
                <div className="text-base font-normal">Qual Odu se aplica nesta situação?</div>
              </>
            ) : null}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 overflow-x-hidden">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === question.correctAnswer;
            
            let buttonClass = "justify-start text-left h-auto py-4";
            
            if (showResult && isSelected) {
              buttonClass += isCorrect
                ? " border-green-500 bg-green-50 dark:bg-green-950"
                : " border-destructive bg-destructive/10";
            } else if (showResult && isCorrect) {
              buttonClass += " border-green-500 bg-green-50 dark:bg-green-950";
            }

            return (
              <Button
                key={index}
                variant="outline"
                className={buttonClass}
                onClick={() => !showResult && handleAnswer(option)}
                disabled={showResult}
              >
                <span className="flex-1 text-sm md:text-base">
                  {option.length > CHAR_LIMITS.option ? (
                    <TruncatableText text={option} limit={CHAR_LIMITS.option} />
                  ) : (
                    option
                  )}
                </span>
                {showResult && isSelected && (
                  isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 ml-2 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive ml-2 flex-shrink-0" />
                  )
                )}
                {showResult && !isSelected && isCorrect && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 ml-2 flex-shrink-0" />
                )}
              </Button>
            );
          })}

          {showResult && (
            <div className="mt-6 p-4 rounded-lg bg-muted">
              <p className="text-center text-sm">
                {selectedAnswer === question.correctAnswer ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    ✓ Correto! Continue assim!
                  </span>
                ) : (
                  <span className="text-destructive font-semibold">
                    ✗ Incorreto. A resposta correta é: {question.correctAnswer}
                  </span>
                )}
              </p>
              {question.explanation && (
                <p className="text-center text-xs mt-2 text-muted-foreground">
                  {question.explanation}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default Quiz;
