import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Check, X, RotateCcw, Lightbulb, Volume2 } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DragDropWordsProps {
  oduName: string;
  oduNumber: number;
  versoResumido: string;
  onComplete: (isCorrect: boolean, score: number) => void;
  onSkip?: () => void;
}

interface WordSlot {
  id: string;
  word: string;
  isGap: boolean;
  originalIndex: number;
}

const DragDropWords: React.FC<DragDropWordsProps> = ({
  oduName,
  oduNumber,
  versoResumido,
  onComplete,
  onSkip
}) => {
  // Parse the verse and create word slots
  const { slots, shuffledWords, correctOrder } = useMemo(() => {
    if (!versoResumido) {
      return { slots: [], shuffledWords: [], correctOrder: [] };
    }

    const words = versoResumido.split(/\s+/).filter(w => w.length > 0);
    
    // Select 3-5 words to be gaps (keywords, usually longer words)
    const significantWords = words
      .map((word, index) => ({ word: word.replace(/[.,;:!?]/g, ''), index, original: word }))
      .filter(w => w.word.length >= 4)
      .slice(0, Math.min(5, Math.max(3, Math.floor(words.length / 4))));

    const gapIndices = new Set(significantWords.map(w => w.index));

    const wordSlots: WordSlot[] = words.map((word, index) => ({
      id: `slot-${index}`,
      word: word,
      isGap: gapIndices.has(index),
      originalIndex: index
    }));

    const gapWords = wordSlots.filter(s => s.isGap);
    const shuffled = [...gapWords].sort(() => Math.random() - 0.5);

    return {
      slots: wordSlots,
      shuffledWords: shuffled,
      correctOrder: gapWords.map(w => w.originalIndex)
    };
  }, [versoResumido]);

  const [availableWords, setAvailableWords] = useState<WordSlot[]>(shuffledWords);
  const [placedWords, setPlacedWords] = useState<Map<number, WordSlot>>(new Map());
  const [isChecked, setIsChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Handle dropping a word into a slot
  const handleDrop = useCallback((slotIndex: number, word: WordSlot) => {
    // Check if there's already a word in the target slot
    const existingWord = placedWords.get(slotIndex);
    
    setPlacedWords(prev => {
      const newMap = new Map(prev);
      
      // Remove from any previous position
      for (const [key, value] of newMap.entries()) {
        if (value.id === word.id) {
          newMap.delete(key);
        }
      }
      
      // Place in new position
      newMap.set(slotIndex, word);
      return newMap;
    });

    // Update available words:
    // 1. Remove the word being placed
    // 2. Return the replaced word to available (if there was one)
    setAvailableWords(prev => {
      let updated = prev.filter(w => w.id !== word.id);
      
      // If there was a word in the slot, return it to available
      if (existingWord && existingWord.id !== word.id) {
        updated = [...updated, existingWord];
      }
      
      return updated;
    });
  }, [placedWords]);

  // Handle removing a word from a slot
  const handleRemove = useCallback((slotIndex: number) => {
    const word = placedWords.get(slotIndex);
    if (word) {
      setPlacedWords(prev => {
        const newMap = new Map(prev);
        newMap.delete(slotIndex);
        return newMap;
      });
      setAvailableWords(prev => [...prev, word]);
    }
  }, [placedWords]);

  // Check answers
  const checkAnswers = useCallback(() => {
    setIsChecked(true);
    setAttempts(prev => prev + 1);

    const gapSlots = slots.filter(s => s.isGap);
    let correct = 0;

    gapSlots.forEach(slot => {
      const placed = placedWords.get(slot.originalIndex);
      if (placed && placed.originalIndex === slot.originalIndex) {
        correct++;
      }
    });

    const score = Math.round((correct / gapSlots.length) * 100);
    const isFullyCorrect = score === 100;

    if (isFullyCorrect || attempts >= 2) {
      setTimeout(() => {
        // Score 0-100 passed to onComplete (same signature as ClozeExercise)
        onComplete(isFullyCorrect, score);
      }, 1500);
    }
  }, [slots, placedWords, attempts, onComplete]);

  // Reset the exercise
  const handleReset = useCallback(() => {
    setAvailableWords(shuffledWords);
    setPlacedWords(new Map());
    setIsChecked(false);
    setShowHint(false);
  }, [shuffledWords]);

  // Get hint - show first letter of next empty gap
  const getHint = useCallback(() => {
    setShowHint(true);
  }, []);

  // Check if a placed word is correct
  const isWordCorrect = (slotIndex: number): boolean | null => {
    if (!isChecked) return null;
    const placed = placedWords.get(slotIndex);
    if (!placed) return false;
    return placed.originalIndex === slotIndex;
  };

  const allGapsFilled = slots.filter(s => s.isGap).every(s => placedWords.has(s.originalIndex));
  const allCorrect = isChecked && slots.filter(s => s.isGap).every(s => isWordCorrect(s.originalIndex) === true);

  if (!versoResumido || slots.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Este Odu não possui verso resumido.</p>
          <Button onClick={onSkip} className="mt-4">Pular</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="outline" className="mb-2">Arraste e Solte</Badge>
            <CardTitle className="text-xl">
              {oduNumber}. {oduName}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={getHint}
              disabled={showHint || isChecked}
              title="Dica"
            >
              <Lightbulb className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              title="Recomeçar"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Instructions */}
        <p className="text-sm text-muted-foreground text-center">
          Arraste as palavras para as posições corretas no verso
        </p>

        {/* Verse with gaps */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex flex-wrap gap-2 items-center justify-center leading-relaxed">
            {slots.map((slot, index) => {
              if (!slot.isGap) {
                return (
                  <span key={slot.id} className="text-foreground">
                    {slot.word}
                  </span>
                );
              }

              const placed = placedWords.get(slot.originalIndex);
              const correctStatus = isWordCorrect(slot.originalIndex);

              return (
                <motion.div
                  key={slot.id}
                  className={cn(
                    "min-w-[80px] h-10 rounded-lg border-2 border-dashed flex items-center justify-center transition-all",
                    placed 
                      ? correctStatus === true
                        ? "border-green-500 bg-green-500/10"
                        : correctStatus === false
                          ? "border-destructive bg-destructive/10"
                          : "border-primary bg-primary/10"
                      : "border-muted-foreground/30 bg-muted/50",
                    !placed && !isChecked && "hover:border-primary hover:bg-primary/5"
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const wordId = e.dataTransfer.getData('text/plain');
                    const word = [...availableWords, ...Array.from(placedWords.values())].find(w => w.id === wordId);
                    if (word) {
                      handleDrop(slot.originalIndex, word);
                    }
                  }}
                  onClick={() => !isChecked && placed && handleRemove(slot.originalIndex)}
                  whileHover={{ scale: placed ? 1.02 : 1 }}
                >
                  {placed ? (
                    <div className="flex items-center gap-1 px-3">
                      <span className="font-medium">{placed.word}</span>
                      {correctStatus === true && <Check className="h-4 w-4 text-green-500" />}
                      {correctStatus === false && <X className="h-4 w-4 text-destructive" />}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      {showHint ? slot.word[0].toUpperCase() + '...' : '___'}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Available words to drag */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Palavras disponíveis:</p>
          <div className="flex flex-wrap gap-2 justify-center min-h-[50px] p-4 bg-muted/20 rounded-lg border border-dashed border-border">
            <AnimatePresence mode="popLayout">
              {availableWords.map((word) => (
                <motion.div
                  key={word.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  draggable
                  onDragStart={(e: any) => {
                    e.dataTransfer.setData('text/plain', word.id);
                  }}
                  className={cn(
                    "px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-grab active:cursor-grabbing",
                    "flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow",
                    "select-none"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <GripVertical className="h-4 w-4 opacity-50" />
                  <span className="font-medium">{word.word}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {availableWords.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Todas as palavras foram colocadas
              </p>
            )}
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {isChecked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "p-4 rounded-lg text-center",
                allCorrect 
                  ? "bg-green-500/10 border border-green-500/30" 
                  : "bg-amber-500/10 border border-amber-500/30"
              )}
            >
              {allCorrect ? (
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Perfeito! Todas as palavras estão corretas!</span>
                </div>
              ) : (
                <div className="text-amber-600 dark:text-amber-400">
                  <span>Algumas palavras estão incorretas. </span>
                  {attempts < 3 && <span>Tente novamente!</span>}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex justify-center gap-3">
          {onSkip && (
            <Button variant="outline" onClick={onSkip}>
              Pular
            </Button>
          )}
          
          {!isChecked ? (
            <Button 
              onClick={checkAnswers}
              disabled={!allGapsFilled}
              className="min-w-[120px]"
            >
              Verificar
            </Button>
          ) : !allCorrect && attempts < 3 ? (
            <Button onClick={() => setIsChecked(false)}>
              Tentar Novamente
            </Button>
          ) : null}
        </div>

        {/* Attempts counter */}
        {attempts > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Tentativa {attempts}/3
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DragDropWords;
