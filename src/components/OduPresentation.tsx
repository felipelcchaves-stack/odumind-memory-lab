import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, BookOpen, Clock, ArrowRight, Eye } from "lucide-react";
import { SafeHtmlRenderer } from "@/components/SafeHtmlRenderer";
import { motion, AnimatePresence } from "framer-motion";

interface OduPresentationProps {
  numero: number;
  nome: string;
  texto_principal: string;
  verso?: string | null;
  verso_resumido?: string | null;
  significado?: string | null;
  contexto_historico?: string | null;
  onComplete: () => void;
  minReadingTime?: number; // seconds
}

export default function OduPresentation({
  numero,
  nome,
  texto_principal,
  verso,
  verso_resumido,
  significado,
  contexto_historico,
  onComplete,
  minReadingTime = 30
}: OduPresentationProps) {
  const [timeRemaining, setTimeRemaining] = useState(minReadingTime);
  const [canProceed, setCanProceed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      setCanProceed(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setCanProceed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const progress = ((minReadingTime - timeRemaining) / minReadingTime) * 100;

  const handleComplete = useCallback(() => {
    setIsExiting(true);
    // Small delay for exit animation
    setTimeout(() => {
      onComplete();
    }, 300);
  }, [onComplete]);

  return (
    <AnimatePresence mode="wait">
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-3xl mx-auto"
        >
          {/* Header com indicação de primeiro contato */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Eye className="h-3 w-3 mr-1" />
                Primeiro Contato
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                #{numero}
              </Badge>
            </div>
            
            {/* Timer indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {canProceed ? (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Pronto para praticar!
                </span>
              ) : (
                <span>Leia com atenção: {timeRemaining}s</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <Progress 
              value={progress} 
              className="h-1.5" 
            />
          </div>

          {/* Main content card */}
          <Card 
            className="border-2 border-primary/20 shadow-lg"
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
            }}
          >
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl font-bold">{nome}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Odu #{numero} • Leia com atenção antes de praticar
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <ScrollArea className="h-[calc(100vh-400px)] md:h-[calc(100vh-380px)]">
                <div className="pr-3 space-y-5">
                  {/* Significado em destaque */}
                  {significado && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <h4 className="font-semibold text-amber-800 dark:text-amber-300">
                          Significado
                        </h4>
                      </div>
                      <SafeHtmlRenderer
                        html={significado}
                        className="text-amber-900 dark:text-amber-100 prose prose-sm dark:prose-invert max-w-none"
                      />
                    </motion.div>
                  )}

                  {/* Verso resumido para memorização */}
                  {verso_resumido && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="p-4 bg-primary/10 dark:bg-primary/5 rounded-lg border-l-4 border-primary"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                        <h4 className="font-semibold text-primary">Verso para Memorização</h4>
                      </div>
                      <p className="text-lg italic font-medium text-foreground">
                        "{verso_resumido}"
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 Memorize este verso - ele resume a essência do Odu
                      </p>
                    </motion.div>
                  )}

                  {/* Texto principal */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Texto Principal
                    </h4>
                    <SafeHtmlRenderer
                      html={texto_principal}
                      className="text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                    />
                  </motion.div>

                  {/* Contexto histórico (se existir) */}
                  {contexto_historico && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="p-4 bg-muted/50 rounded-lg"
                    >
                      <h4 className="font-semibold mb-2 text-muted-foreground">
                        📜 Contexto Histórico
                      </h4>
                      <SafeHtmlRenderer
                        html={contexto_historico}
                        className="text-muted-foreground text-sm prose prose-sm dark:prose-invert max-w-none"
                      />
                    </motion.div>
                  )}

                  {/* Verso completo (se diferente do resumido) */}
                  {verso && verso !== verso_resumido && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <h4 className="font-semibold mb-2">Verso Completo</h4>
                      <SafeHtmlRenderer
                        html={verso}
                        className="border-l-4 border-muted pl-4 italic text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
                      />
                    </motion.div>
                  )}

                  {/* Spacer para o botão não cobrir conteúdo */}
                  <div className="h-24" />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Fixed bottom button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t safe-area-inset-bottom">
            <div className="max-w-3xl mx-auto">
              <Button
                onClick={handleComplete}
                disabled={!canProceed}
                size="lg"
                className={`w-full h-14 text-lg font-semibold transition-all ${
                  canProceed 
                    ? 'bg-primary hover:bg-primary/90 animate-pulse shadow-lg' 
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {canProceed ? (
                  <>
                    Entendi! Vamos praticar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                ) : (
                  <>
                    <Clock className="mr-2 h-5 w-5" />
                    Leia o conteúdo ({timeRemaining}s)
                  </>
                )}
              </Button>
              {!canProceed && (
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Reserve um momento para ler e absorver o conteúdo antes de praticar
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
