import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

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
    <div className="w-full max-w-2xl mx-auto">
      <Card className="min-h-[400px]">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Badge variant="secondary">Quiz</Badge>
            <Badge variant="outline">
              {question.type === "aplicacao_pratica" ? "Aplicação Prática" : 
               question.type === "nome" ? "Nome do Odu" : 
               "Associação"}
            </Badge>
          </div>
          <CardTitle className="text-2xl">
            {question.type === "nome" ? (
              <>Qual é o nome deste Odu?</>
            ) : question.type === "verso_para_nome" ? (
              <>
                <div className="mb-2 text-base font-normal text-muted-foreground">Qual Odu diz:</div>
                <div className="text-lg italic">"{question.versoResumido}"</div>
              </>
            ) : question.type === "nome_para_verso" ? (
              <>Qual é o verso de {question.nome}?</>
            ) : question.type === "verso_para_significado" ? (
              <>
                <div className="mb-2 text-base font-normal text-muted-foreground">O verso:</div>
                <div className="text-lg italic mb-3">"{question.versoResumido}"</div>
                <div className="text-base font-normal">representa qual significado?</div>
              </>
            ) : null}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
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
                <span className="flex-1">{option}</span>
                {showResult && isSelected && (
                  isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 ml-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive ml-2" />
                  )
                )}
                {showResult && !isSelected && isCorrect && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 ml-2" />
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
