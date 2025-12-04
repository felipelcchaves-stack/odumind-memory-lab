import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wand2, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FormattingResult {
  success: boolean;
  message: string;
  updated: number;
  skipped: number;
  total: number;
  errors?: string[];
}

export default function SignificadoFormatterTool() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FormattingResult | null>(null);

  const handleFormat = async () => {
    const confirmed = window.confirm(
      'Esta ação irá adicionar quebras de linha antes de "Ifá diz" em todos os campos de significado dos Odus.\n\n' +
      'Registros que já possuem quebras adequadas serão ignorados.\n\n' +
      'Deseja continuar?'
    );

    if (!confirmed) return;

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('fix-significado-formatting');

      if (error) {
        console.error('Erro ao executar formatação:', error);
        toast.error(error.message || 'Erro ao executar formatação');
        return;
      }

      setResult(data);

      if (data.success) {
        if (data.updated > 0) {
          toast.success(`${data.updated} Odu(s) formatado(s) com sucesso!`);
        } else {
          toast.info('Nenhum Odu precisava de formatação');
        }
      } else {
        toast.error(data.message || 'Erro na formatação');
      }
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(error.message || 'Erro ao executar formatação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Formatador de Significados
        </CardTitle>
        <CardDescription>
          Adiciona automaticamente quebras de linha antes de "Ifá diz" em todos os campos de significado dos Odus.
          Útil para padronizar conteúdo importado via CSV ou editado manualmente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
          <p><strong>O que esta ferramenta faz:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Detecta variações: "Ifá diz", "Ifa diz", "IFÁ diz", "IFA diz"</li>
            <li>Adiciona quebra de linha dupla antes de cada ocorrência</li>
            <li>Funciona tanto com texto puro quanto HTML</li>
            <li>Ignora registros que já possuem formatação correta</li>
            <li>Não duplica quebras existentes</li>
          </ul>
        </div>

        <Button 
          onClick={handleFormat} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Executar Formatação em Massa
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-3 mt-4">
            <Alert className={result.success ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-destructive'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                <p className="font-medium">{result.message}</p>
                <div className="mt-2 text-sm space-y-1">
                  <p>Total de Odus analisados: <strong>{result.total}</strong></p>
                  <p className="text-green-700 dark:text-green-300">Atualizados: <strong>{result.updated}</strong></p>
                  <p className="text-muted-foreground">Sem mudanças: <strong>{result.skipped}</strong></p>
                </div>
              </AlertDescription>
            </Alert>

            {result.errors && result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">{result.errors.length} erro(s):</p>
                  <ul className="list-disc list-inside text-sm max-h-32 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
