import { useState, useEffect, memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Sparkles, HelpCircle, RotateCcw, Eye, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClozeExerciseProps {
  numero: number;
  nome: string;
  versoResumido: string;
  significado?: string | null;
  onAnswer: (isCorrect: boolean, score: number) => void;
  hideNumber?: boolean;
}

interface Gap {
  word: string;
  index: number;
  userInput: string;
  isCorrect: boolean | null;
  showHint: boolean;
}

// Função para extrair palavras-chave do texto (palavras importantes para memorização)
function extractKeywords(text: string): string[] {
  // Remove pontuação e divide em palavras
  const words = text.replace(/[.,;:!?"""''()]/g, '').split(/\s+/).filter(w => w.length > 0);
  
  // Filtra palavras significativas (>= 3 caracteres, não são artigos/preposições comuns)
  const stopWords = ['que', 'para', 'com', 'uma', 'dos', 'das', 'por', 'como', 'mais', 'seu', 'sua', 'seus', 'suas', 'ele', 'ela', 'eles', 'elas', 'este', 'esta', 'esse', 'essa', 'isso', 'aqui', 'ali', 'onde', 'quando', 'porque', 'assim', 'então', 'também', 'ainda', 'sempre', 'nunca', 'muito', 'pouco', 'não', 'sim', 'ser', 'ter', 'foi', 'são', 'tem', 'está', 'era', 'vai', 'vem'];
  
  // Critério relaxado: >= 3 caracteres
  let keywords = words.filter(word => 
    word.length >= 3 && 
    !stopWords.includes(word.toLowerCase()) &&
    !/^\d+$/.test(word) // Não é só número
  );
  
  // FALLBACK 1: Se não encontrou keywords, usar as maiores palavras do texto
  if (keywords.length === 0) {
    keywords = words
      .filter(w => w.length >= 2 && !/^\d+$/.test(w))
      .sort((a, b) => b.length - a.length)
      .slice(0, 3);
  }
  
  // FALLBACK 2: Se ainda não tiver nada, usar qualquer palavra com mais de 1 caractere
  if (keywords.length === 0 && words.length > 0) {
    keywords = words.filter(w => w.length > 1).slice(0, 2);
  }
  
  // Seleciona até 3 palavras-chave aleatórias para criar lacunas
  const shuffled = keywords.sort(() => Math.random() - 0.5);
  // Garantir pelo menos 1 lacuna, máximo 3
  const count = Math.min(3, Math.max(1, keywords.length));
  return shuffled.slice(0, count);
}

// Gera texto com lacunas marcadas
function createClozeText(text: string, keywords: string[]): { displayText: string; gaps: Gap[] } {
  let displayText = text;
  const gaps: Gap[] = [];
  let gapIndex = 0;
  
  keywords.forEach(keyword => {
    // Cria regex case-insensitive para encontrar a palavra
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    const match = displayText.match(regex);
    
    if (match) {
      const placeholder = `___GAP_${gapIndex}___`;
      displayText = displayText.replace(regex, placeholder);
      gaps.push({
        word: match[0], // Mantém o case original
        index: gapIndex,
        userInput: '',
        isCorrect: null,
        showHint: false
      });
      gapIndex++;
    }
  });
  
  return { displayText, gaps };
}

const ClozeExercise = memo(function ClozeExercise({
  numero,
  nome,
  versoResumido,
  significado,
  onAnswer,
  hideNumber = false
}: ClozeExerciseProps) {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [displayText, setDisplayText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [wasRevealed, setWasRevealed] = useState(false);
  
  // Inicializa o exercício
  useEffect(() => {
    if (!versoResumido || versoResumido.trim().length === 0) {
      // Verso vazio - notificar e pular (usuário precisa ver feedback)
      console.log('⚠️ [ClozeExercise] verso_resumido vazio, usando fallback');
      setDisplayText('');
      setGaps([]);
      setIsSubmitted(true);
      setShowResult(true);
      // Aumentado para 2s para dar tempo de ler o feedback
      setTimeout(() => onAnswer(true, 50), 2000);
      return;
    }
    
    const keywords = extractKeywords(versoResumido);
    console.log('🔍 [ClozeExercise] Keywords extraídas:', keywords, 'do texto:', versoResumido.slice(0, 50));
    
    const { displayText: text, gaps: newGaps } = createClozeText(versoResumido, keywords);
    
    // Se não conseguiu criar lacunas, mostrar fallback com feedback visual
    if (newGaps.length === 0) {
      console.log('⚠️ [ClozeExercise] Não conseguiu criar lacunas, usando fallback');
      setDisplayText(versoResumido);
      setGaps([]);
      setIsSubmitted(true);
      setShowResult(true);
      // Aumentado para 2.5s para dar tempo de ler o feedback
      setTimeout(() => onAnswer(true, 50), 2500);
      return;
    }
    
    console.log('✅ [ClozeExercise] Exercício criado com', newGaps.length, 'lacunas');
    setDisplayText(text);
    setGaps(newGaps);
    setIsSubmitted(false);
    setShowResult(false);
    setAttempts(0);
    setWasRevealed(false);
  }, [versoResumido, onAnswer]);
  
  // Atualiza input de uma lacuna
  const handleInputChange = (index: number, value: string) => {
    if (isSubmitted) return;
    
    setGaps(prev => prev.map(gap => 
      gap.index === index ? { ...gap, userInput: value } : gap
    ));
  };
  
  // Mostra dica (primeira letra)
  const handleShowHint = (index: number) => {
    setGaps(prev => prev.map(gap => 
      gap.index === index ? { ...gap, showHint: true } : gap
    ));
  };
  
  // Verifica as respostas
  const handleSubmit = () => {
    const updatedGaps = gaps.map(gap => ({
      ...gap,
      isCorrect: gap.userInput.toLowerCase().trim() === gap.word.toLowerCase().trim()
    }));
    
    setGaps(updatedGaps);
    setIsSubmitted(true);
    setAttempts(prev => prev + 1);
    
    const correctCount = updatedGaps.filter(g => g.isCorrect).length;
    const allCorrect = correctCount === updatedGaps.length;
    
    // Se acertou tudo ou já tentou 2 vezes, mostra resultado
    if (allCorrect || attempts >= 1) {
      setShowResult(true);
      
      // Calcula pontuação (0-100)
      const baseScore = (correctCount / updatedGaps.length) * 100;
      const hintsUsed = updatedGaps.filter(g => g.showHint).length;
      const hintPenalty = hintsUsed * 10;
      const attemptPenalty = attempts * 15;
      const finalScore = Math.max(0, baseScore - hintPenalty - attemptPenalty);
      
      // Delay para mostrar feedback visual
      setTimeout(() => {
        onAnswer(allCorrect, finalScore);
      }, 2000);
    }
  };
  
  // Permite tentar novamente se errou
  const handleRetry = () => {
    setIsSubmitted(false);
    setGaps(prev => prev.map(gap => ({
      ...gap,
      userInput: gap.isCorrect ? gap.userInput : '',
      isCorrect: gap.isCorrect ? true : null
    })));
  };
  
  // Revela todas as respostas (com penalidade)
  const handleReveal = () => {
    setGaps(prev => prev.map(gap => ({
      ...gap,
      userInput: gap.word,
      isCorrect: true,
      showHint: true
    })));
    setIsSubmitted(true);
    setShowResult(true);
    setWasRevealed(true);
    
    // Pontuação reduzida por revelar (30% do máximo = 30 XP)
    setTimeout(() => {
      onAnswer(true, 30);
    }, 2000);
  };
  
  // Pula o exercício (0 XP)
  const handleSkip = () => {
    onAnswer(false, 0);
  };
  
  // Renderiza o texto com inputs nas lacunas
  const renderClozeText = () => {
    const parts = displayText.split(/(___GAP_\d+___)/);
    
    return (
      <div className="text-lg leading-relaxed">
        {parts.map((part, i) => {
          const gapMatch = part.match(/___GAP_(\d+)___/);
          
          if (gapMatch) {
            const gapIndex = parseInt(gapMatch[1]);
            const gap = gaps.find(g => g.index === gapIndex);
            
            if (!gap) return null;
            
            return (
              <span key={i} className="inline-flex items-center gap-1 mx-1">
                <span className="relative">
                  <Input
                    type="text"
                    value={gap.userInput}
                    onChange={(e) => handleInputChange(gapIndex, e.target.value)}
                    disabled={isSubmitted && gap.isCorrect === true}
                    placeholder={gap.showHint ? `${gap.word[0]}...` : '________'}
                    className={cn(
                      "w-32 h-8 text-center text-base font-medium inline-block",
                      isSubmitted && gap.isCorrect === true && "border-green-500 bg-green-50 dark:bg-green-900/20",
                      isSubmitted && gap.isCorrect === false && "border-destructive bg-destructive/10"
                    )}
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSubmitted) {
                        handleSubmit();
                      }
                    }}
                  />
                  {isSubmitted && gap.isCorrect !== null && (
                    <span className="absolute -right-6 top-1/2 -translate-y-1/2">
                      {gap.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </span>
                  )}
                </span>
                {!isSubmitted && !gap.showHint && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-1"
                    onClick={() => handleShowHint(gapIndex)}
                    title="Ver dica"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </span>
            );
          }
          
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };
  
  const correctCount = gaps.filter(g => g.isCorrect === true).length;
  const allCorrect = correctCount === gaps.length && gaps.length > 0;
  const someWrong = gaps.some(g => g.isCorrect === false);
  
  // Se não há lacunas e já está mostrando resultado, exibir mensagem de fallback
  if (gaps.length === 0 && showResult) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card className="min-h-[300px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              {!hideNumber && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
                  #{numero}
                </Badge>
              )}
              <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                <Sparkles className="h-3 w-3 mr-1" />
                Complete a Frase
              </Badge>
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold">{nome}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-muted-foreground mb-2">Texto muito curto para exercício de lacunas.</p>
              {versoResumido && (
                <p className="font-medium italic">"{versoResumido}"</p>
              )}
              <p className="text-sm text-muted-foreground mt-4">Passando para o próximo exercício...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="min-h-[400px]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            {!hideNumber && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
                #{numero}
              </Badge>
            )}
            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
              <Sparkles className="h-3 w-3 mr-1" />
              Complete a Frase
            </Badge>
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold">{nome}</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Significado como contexto */}
          {significado && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">💡 Significado:</p>
              <p className="font-medium text-sm">{significado}</p>
            </div>
          )}
          
          {/* Instrução */}
          <div className="text-center text-sm text-muted-foreground">
            Complete as lacunas com as palavras corretas do verso:
          </div>
          
          {/* Área do exercício */}
          <ScrollArea className="max-h-[250px]">
            <div className="p-4 bg-primary/5 rounded-lg border-2 border-dashed border-primary/20">
              {renderClozeText()}
            </div>
          </ScrollArea>
          
          {/* Feedback de resultado */}
          {showResult && (
            <div className={cn(
              "p-4 rounded-lg text-center",
              wasRevealed 
                ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-500"
                : allCorrect 
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-500" 
                  : "bg-amber-50 dark:bg-amber-900/20 border border-amber-500"
            )}>
              {wasRevealed ? (
                <div className="space-y-2">
                  <Eye className="h-8 w-8 mx-auto text-amber-500" />
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    Respostas reveladas
                  </p>
                  <p className="text-sm text-muted-foreground">
                    +30 XP (penalidade por revelar)
                  </p>
                </div>
              ) : allCorrect ? (
                <div className="space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" />
                  <p className="font-semibold text-green-700 dark:text-green-300">
                    Excelente! Todas as palavras estão corretas!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    Você acertou {correctCount} de {gaps.length} palavras
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Respostas corretas: {gaps.map(g => `"${g.word}"`).join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Mostrar respostas erradas após tentativa */}
          {isSubmitted && someWrong && !showResult && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive font-medium mb-2">
                Algumas palavras estão incorretas. Tente novamente!
              </p>
              <div className="flex flex-wrap gap-2">
                {gaps.filter(g => g.isCorrect === false).map(gap => (
                  <Badge key={gap.index} variant="outline" className="border-destructive text-destructive">
                    Lacuna {gap.index + 1}: você escreveu "{gap.userInput || '(vazio)'}"
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Botões de ação */}
          {!showResult && (
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              {/* Botão Pular - sempre visível antes de mostrar resultado */}
              <Button 
                onClick={handleSkip}
                variant="ghost"
                className="min-w-[100px]"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Pular
              </Button>
              
              {!isSubmitted ? (
                <>
                  {/* Botão Revelar */}
                  <Button 
                    onClick={handleReveal}
                    variant="outline"
                    className="min-w-[120px]"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Revelar
                  </Button>
                  
                  {/* Botão Verificar */}
                  <Button 
                    onClick={handleSubmit}
                    className="min-w-[120px]"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verificar
                  </Button>
                </>
              ) : someWrong ? (
                <>
                  {/* Botão Revelar (após tentar e errar) */}
                  <Button 
                    onClick={handleReveal}
                    variant="outline"
                    className="min-w-[120px]"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Revelar
                  </Button>
                  
                  {/* Botão Tentar Novamente */}
                  <Button 
                    onClick={handleRetry}
                    className="min-w-[150px]"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Tentar Novamente
                  </Button>
                </>
              ) : null}
            </div>
          )}
          
          {/* Progresso das lacunas */}
          <div className="flex justify-center gap-2">
            {gaps.map((gap, i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-3 rounded-full border-2 transition-colors",
                  gap.isCorrect === true && "bg-green-500 border-green-500",
                  gap.isCorrect === false && "bg-destructive border-destructive",
                  gap.isCorrect === null && gap.userInput ? "border-primary bg-primary/20" : "border-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default ClozeExercise;
