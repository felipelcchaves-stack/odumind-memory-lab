import React, { useState, useEffect, memo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Lightbulb,
  GripVertical,
  ListOrdered,
  SkipForward
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { ProtectedContent } from "@/components/ProtectedContent";
import { useContentProtection } from "@/hooks/useContentProtection";

interface SentenceOrderExerciseProps {
  numero: number;
  nome: string;
  versoResumido: string;
  onComplete: (isCorrect: boolean, score: number) => void;
  onSkip?: () => void; // Nova prop para skip externo
}

interface Sentence {
  id: string;
  text: string;
  originalIndex: number;
}

function splitIntoSentences(text: string): string[] {
  // Split by common sentence delimiters while keeping meaningful chunks
  const sentences = text
    .split(/(?<=[.!?;])\s+|(?<=,)\s+(?=[A-Z])|(?:\n+)/)
    .map(s => s.trim())
    .filter(s => s.length > 3); // Filter out very short fragments
  
  // If we get too few sentences, try splitting by commas
  if (sentences.length < 3) {
    const bySemicolon = text.split(/[;,]/).map(s => s.trim()).filter(s => s.length > 3);
    if (bySemicolon.length >= 3) return bySemicolon;
  }
  
  // If still too few, split by spaces into chunks
  if (sentences.length < 3) {
    const words = text.split(/\s+/);
    const chunkSize = Math.ceil(words.length / 4);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    return chunks.filter(c => c.length > 0);
  }
  
  return sentences;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Ensure it's actually shuffled
  if (JSON.stringify(shuffled) === JSON.stringify(array)) {
    return shuffleArray(array);
  }
  return shuffled;
}

export const SentenceOrderExercise = memo(function SentenceOrderExercise({
  numero,
  nome,
  versoResumido,
  onComplete,
  onSkip
}: SentenceOrderExerciseProps) {
  // Use centralized content protection
  useContentProtection();
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!versoResumido) return;
    
    const sentenceTexts = splitIntoSentences(versoResumido);
    const original = sentenceTexts.map((text, idx) => `sentence-${idx}`);
    setOriginalOrder(original);
    
    const sentenceObjects: Sentence[] = sentenceTexts.map((text, idx) => ({
      id: `sentence-${idx}`,
      text,
      originalIndex: idx
    }));
    
    setSentences(shuffleArray(sentenceObjects));
    setIsSubmitted(false);
    setIsCorrect(false);
    setAttempts(0);
    setHintsUsed(0);
    setShowHint(false);
  }, [versoResumido]);

  const handleReorder = useCallback((newOrder: Sentence[]) => {
    if (!isSubmitted) {
      setSentences(newOrder);
    }
  }, [isSubmitted]);

  const moveSentence = useCallback((index: number, direction: 'up' | 'down') => {
    if (isSubmitted) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sentences.length) return;
    
    const newSentences = [...sentences];
    [newSentences[index], newSentences[newIndex]] = [newSentences[newIndex], newSentences[index]];
    setSentences(newSentences);
  }, [sentences, isSubmitted]);

  const handleSubmit = useCallback(() => {
    const currentOrder = sentences.map(s => s.id);
    const correct = JSON.stringify(currentOrder) === JSON.stringify(originalOrder);
    
    setIsSubmitted(true);
    setIsCorrect(correct);
    setAttempts(prev => prev + 1);
    
    if (correct) {
      // Calculate score: 100% base, -10% per hint, -15% per wrong attempt
      const hintPenalty = hintsUsed * 10;
      const attemptPenalty = (attempts) * 15;
      const score = Math.max(0, 100 - hintPenalty - attemptPenalty);
      
      setTimeout(() => {
        onComplete(true, score);
      }, 2000);
    }
  }, [sentences, originalOrder, attempts, hintsUsed, onComplete]);

  const handleRetry = useCallback(() => {
    setIsSubmitted(false);
    setIsCorrect(false);
  }, []);

  const handleGiveUp = useCallback(() => {
    // Show correct order
    const correctSentences = [...sentences].sort((a, b) => a.originalIndex - b.originalIndex);
    setSentences(correctSentences);
    setIsSubmitted(true);
    setIsCorrect(false);
    
    setTimeout(() => {
      onComplete(false, 0);
    }, 3000);
  }, [sentences, onComplete]);

  const handleShowHint = useCallback(() => {
    setShowHint(true);
    setHintsUsed(prev => prev + 1);
    setTimeout(() => setShowHint(false), 4000);
  }, []);

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip(); // Usar handler externo se disponível
    } else {
      onComplete(false, 0);
    }
  }, [onSkip, onComplete]);

  const getPositionStatus = useCallback((sentence: Sentence, index: number) => {
    if (!isSubmitted) return 'neutral';
    return sentence.originalIndex === index ? 'correct' : 'wrong';
  }, [isSubmitted]);

  if (sentences.length < 2) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center text-muted-foreground">
          Texto muito curto para exercício de ordenação.
        </CardContent>
      </Card>
    );
  }

  return (
    <ProtectedContent>
      <Card className="w-full max-w-2xl mx-auto border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-primary" />
            Ordenar Frases
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            {numero}. {nome}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Arraste ou use as setas para organizar as frases na ordem correta do verso
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Hint display */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
            >
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <Lightbulb className="inline h-4 w-4 mr-1" />
                <strong>Dica:</strong> A primeira frase é "{sentences.find(s => s.originalIndex === 0)?.text.substring(0, 30)}..."
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sentences list */}
        <Reorder.Group 
          axis="y" 
          values={sentences} 
          onReorder={handleReorder}
          className="space-y-2"
        >
          {sentences.map((sentence, index) => {
            const status = getPositionStatus(sentence, index);
            
            return (
              <Reorder.Item
                key={sentence.id}
                value={sentence}
                drag={!isSubmitted}
                className={`
                  flex items-center gap-2 p-3 rounded-lg border-2 transition-all
                  ${!isSubmitted ? 'cursor-grab active:cursor-grabbing hover:border-primary/50 bg-card' : 'pointer-events-none'}
                  ${status === 'correct' ? 'border-green-500 bg-green-500/10' : ''}
                  ${status === 'wrong' ? 'border-red-500 bg-red-500/10' : ''}
                  ${status === 'neutral' ? 'border-border' : ''}
                `}
              >
                {/* Drag handle */}
                {!isSubmitted && (
                  <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}

                {/* Position number */}
                <span className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${status === 'correct' ? 'bg-green-500 text-white' : ''}
                  ${status === 'wrong' ? 'bg-red-500 text-white' : ''}
                  ${status === 'neutral' ? 'bg-muted text-muted-foreground' : ''}
                `}>
                  {index + 1}
                </span>

                {/* Sentence text */}
                <span className="flex-1 text-sm">
                  {sentence.text}
                </span>

                {/* Status icon */}
                {isSubmitted && (
                  status === 'correct' 
                    ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}

                {/* Arrow buttons (mobile-friendly) */}
                {!isSubmitted && (
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveSentence(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveSentence(index, 'down')}
                      disabled={index === sentences.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        {/* Result message */}
        <AnimatePresence>
          {isSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`
                p-4 rounded-lg text-center
                ${isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}
              `}
            >
              {isCorrect ? (
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">
                    Ordem correta! +{Math.max(0, 100 - hintsUsed * 10 - (attempts - 1) * 15)} pontos
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                  <span className="font-semibold">
                    {attempts >= 3 ? 'Ordem correta mostrada acima' : 'Algumas frases estão fora de ordem'}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          {!isSubmitted ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
              >
                <SkipForward className="h-4 w-4 mr-1" />
                Pular
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowHint}
                disabled={hintsUsed >= 2}
              >
                <Lightbulb className="h-4 w-4 mr-1" />
                Dica ({2 - hintsUsed})
              </Button>
              <Button onClick={handleSubmit} className="min-w-[120px]">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Verificar
              </Button>
            </>
          ) : !isCorrect ? (
            <>
              <Button variant="outline" onClick={handleGiveUp}>
                Ver Resposta
              </Button>
              <Button onClick={handleRetry}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Tentar Novamente
              </Button>
            </>
          ) : null}
        </div>

        {/* Progress info */}
        <div className="text-center text-xs text-muted-foreground">
          Tentativas: {attempts} | Dicas usadas: {hintsUsed}/2
        </div>
      </CardContent>
      </Card>
    </ProtectedContent>
  );
});
