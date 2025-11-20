import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Sparkles, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CleanupSummary {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
}

export default function HtmlCleanupTool() {
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<CleanupSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCleanup = async () => {
    if (!confirm('⚠️ Esta operação irá processar TODOS os Odus no banco de dados e corrigir caracteres HTML escapados.\n\n✅ É seguro executar\n✅ Não afeta funcionalidade\n✅ Pode ser executado múltiplas vezes\n\nDeseja continuar?')) {
      return;
    }

    setIsRunning(true);
    setError(null);
    setSummary(null);

    try {
      toast.info('🔧 Iniciando limpeza de HTML...', { duration: 3000 });

      const { data, error: invokeError } = await supabase.functions.invoke('fix-escaped-html', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSummary(data.summary);
      
      if (data.summary.errors === 0) {
        toast.success(`✅ Limpeza concluída! ${data.summary.updated} Odus atualizados, ${data.summary.skipped} sem necessidade.`, {
          duration: 5000,
        });
      } else {
        toast.warning(`⚠️ Limpeza concluída com alguns erros. ${data.summary.updated} atualizados, ${data.summary.errors} com erro.`, {
          duration: 5000,
        });
      }

    } catch (err) {
      console.error('Erro ao executar limpeza:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      toast.error(`❌ Erro: ${errorMsg}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Limpeza de HTML Escapado
        </CardTitle>
        <CardDescription>
          Ferramenta para corrigir caracteres HTML escapados (&lt;, &gt;, &amp;, etc.) em todos os Odus.
          Útil após importações do Google Docs ou migrações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Como Funciona</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li>Processa TODOS os Odus no banco de dados</li>
              <li>Decodifica caracteres HTML escapados (ex: &lt;p&gt; → &lt;p&gt;)</li>
              <li>Suporta decodificação múltipla (escape duplo/triplo)</li>
              <li>100% seguro - não altera conteúdo, apenas formatação</li>
              <li>Pode ser executado quantas vezes necessário</li>
            </ul>
          </AlertDescription>
        </Alert>

        {summary && (
          <Alert variant={summary.errors === 0 ? "default" : "destructive"}>
            {summary.errors === 0 ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>Resultado da Limpeza</AlertTitle>
            <AlertDescription>
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>📚 Total de Odus:</div>
                  <div className="font-semibold">{summary.total}</div>
                  
                  <div>✅ Atualizados:</div>
                  <div className="font-semibold text-green-600 dark:text-green-400">{summary.updated}</div>
                  
                  <div>⏭️ Pulados (OK):</div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400">{summary.skipped}</div>
                  
                  <div>❌ Erros:</div>
                  <div className="font-semibold text-red-600 dark:text-red-400">{summary.errors}</div>
                </div>

                {summary.errors > 0 && summary.errorDetails.length > 0 && (
                  <div className="mt-3 p-2 bg-muted rounded text-xs">
                    <strong>Detalhes dos erros:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {summary.errorDetails.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Progress 
                  value={(summary.updated / summary.total) * 100} 
                  className="h-2 mt-3"
                />
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Erro na Execução</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            onClick={runCleanup}
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Executar Limpeza
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Dica:</strong> Execute esta ferramenta após:</p>
          <ul className="list-disc list-inside ml-4">
            <li>Importar Odus do Google Docs</li>
            <li>Notar caracteres estranhos como &lt;p&gt; ou &amp;</li>
            <li>Migrar dados de outros sistemas</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
