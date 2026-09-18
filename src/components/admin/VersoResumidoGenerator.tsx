import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface GenerationResult {
  numero: number;
  nome: string;
  verso_resumido: string;
  success: boolean;
}

export default function VersoResumidoGenerator() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [errors, setErrors] = useState<any[]>([]);

  const generateBatch = async () => {
    setLoading(true);
    setProgress(0);
    setResults([]);
    setErrors([]);

    try {
      toast.loading('Gerando versos resumidos com IA...', { id: 'generate-versos' });

      const { data, error } = await supabase.functions.invoke('generate-verso-resumido', {
        body: { batchMode: true }
      });

      if (error) throw error;

      setResults(data.results || []);
      setErrors(data.errors || []);
      setProgress(100);

      if (data.errors && data.errors.length > 0) {
        toast.warning(`Gerados ${data.processed} versos. ${data.errors.length} erros encontrados.`, {
          id: 'generate-versos'
        });
      } else {
        toast.success(`✨ ${data.processed} versos resumidos gerados com sucesso!`, {
          id: 'generate-versos'
        });
      }

    } catch (error: any) {
      console.error('Error generating verses:', error);
      
      if (error.message?.includes('429')) {
        toast.error('Limite de requisições atingido. Aguarde alguns minutos e tente novamente.', {
          id: 'generate-versos'
        });
      } else if (error.message?.includes('402')) {
        toast.error('Créditos insuficientes na API do Gemini. Verifique o faturamento no Google AI Studio.', {
          id: 'generate-versos'
        });
      } else {
        toast.error('Erro ao gerar versos. Veja o console para detalhes.', {
          id: 'generate-versos'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const generateSingle = async (oduId: string) => {
    try {
      toast.loading('Gerando verso resumido...', { id: `generate-${oduId}` });

      const { data, error } = await supabase.functions.invoke('generate-verso-resumido', {
        body: { oduId, batchMode: false }
      });

      if (error) throw error;

      toast.success('Verso resumido gerado com sucesso!', { id: `generate-${oduId}` });
      return data.results[0];

    } catch (error: any) {
      console.error('Error generating single verse:', error);
      toast.error('Erro ao gerar verso', { id: `generate-${oduId}` });
      throw error;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Gerador de Versos Resumidos com IA</CardTitle>
        </div>
        <CardDescription>
          Gere automaticamente versos resumidos memoráveis para todos os Odus usando IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Como funciona:</strong> A IA analisa o texto principal, significado e verso completo de cada Odu
            para criar um verso resumido de 10-150 caracteres, perfeito para memorização e quizzes.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button
            onClick={generateBatch}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando versos...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Versos para Todos os Odus
              </>
            )}
          </Button>

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-center text-muted-foreground">
                Processando... Isso pode levar alguns minutos
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Versos Gerados ({results.length})
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {results.map((result) => (
                <div key={result.numero} className="p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        #{result.numero} - {result.nome}
                      </div>
                      <div className="text-xs italic text-muted-foreground mt-1">
                        "{result.verso_resumido}"
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Erros ({errors.length})
            </h3>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {errors.map((error, idx) => (
                <div key={idx} className="p-2 border border-destructive/50 rounded bg-destructive/10 text-xs">
                  Odu #{error.odu}: {error.error}
                </div>
              ))}
            </div>
          </div>
        )}

        <Alert variant="default" className="mt-4">
          <AlertDescription className="text-xs">
            💡 <strong>Dica:</strong> Após gerar os versos, revise-os no editor de Odu para garantir qualidade
            e alinhamento com a tradição Yorubá. A IA gera sugestões, mas a validação final deve ser humana.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
