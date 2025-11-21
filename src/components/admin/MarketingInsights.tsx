import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, RefreshCw, Copy, Info, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MarketingInsightsProps {
  metrics: {
    conversionRate: number;
    retentionRate: number;
    churnRate: number;
    ltv: number;
    cac: number;
    mrr: number;
    arr: number;
    activeUsers: number;
    totalUsers: number;
  };
  demographicData: any[];
  monthlyData: any[];
  period: string;
}

export function MarketingInsights({ metrics, demographicData, monthlyData, period }: MarketingInsightsProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Aggregate demographic data
      const stateData = demographicData.reduce((acc, item) => {
        const existing = acc.find(d => d.estado === item.estado);
        if (existing) {
          existing.total += item.totalUsuarios;
        } else {
          acc.push({ estado: item.estado, total: item.totalUsuarios });
        }
        return acc;
      }, [] as { estado: string; total: number }[]).sort((a, b) => b.total - a.total);

      const ageData = demographicData.reduce((acc, item) => {
        const existing = acc.find(d => d.faixaEtaria === item.faixaEtaria);
        if (existing) {
          existing.total += item.totalUsuarios;
        } else {
          acc.push({ faixaEtaria: item.faixaEtaria, total: item.totalUsuarios, label: item.faixaEtaria });
        }
        return acc;
      }, [] as { faixaEtaria: string; total: number; label: string }[]);

      const sexData = demographicData.reduce((acc, item) => {
        const existing = acc.find(d => d.sexo === item.sexo);
        if (existing) {
          existing.total += item.totalUsuarios;
        } else {
          acc.push({ sexo: item.sexo, total: item.totalUsuarios, label: item.sexo });
        }
        return acc;
      }, [] as { sexo: string; total: number; label: string }[]);

      const { data, error: functionError } = await supabase.functions.invoke('generate-marketing-insights', {
        body: {
          metrics,
          demographics: {
            states: stateData,
            age: ageData,
            sex: sexData
          },
          monthlyData,
          period
        }
      });

      if (functionError) {
        throw functionError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setInsights(data.insights);
      setGeneratedAt(new Date(data.generatedAt));
      toast.success('Insights gerados com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar insights:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar insights';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (insights) {
      navigator.clipboard.writeText(insights);
      toast.success('Insights copiados!');
    }
  };

  const periodLabels: Record<string, string> = {
    'current': 'Mês Atual',
    '3months': 'Últimos 3 Meses',
    '6months': 'Últimos 6 Meses'
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Insights de Marketing com IA</CardTitle>
              <CardDescription>
                Análise automática dos seus dados para otimização de anúncios e conversão
              </CardDescription>
            </div>
          </div>
          {generatedAt && (
            <Badge variant="secondary">
              Atualizado {formatDistanceToNow(generatedAt, { addSuffix: true, locale: ptBR })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!insights && !loading && (
          <div className="text-center py-8 space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-primary/60" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Gere Insights Personalizados</h3>
              <p className="text-sm text-muted-foreground mb-4">
                A IA analisará suas métricas atuais ({periodLabels[period]}) e gerará recomendações 
                específicas sobre onde anunciar, público-alvo ideal, e estratégias de conversão.
              </p>
            </div>
            <Button onClick={generateInsights} size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Gerar Insights com IA
            </Button>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Analisando seus dados com IA...</span>
            </div>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {insights && !loading && (
          <>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{insights}</ReactMarkdown>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4" />
                Insights baseados nos dados reais do período: {periodLabels[period]}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={copyToClipboard} 
                  variant="outline" 
                  size="sm"
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
                <Button 
                  onClick={generateInsights} 
                  variant="outline" 
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerar
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
