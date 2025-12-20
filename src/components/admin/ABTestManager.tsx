import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, Save, FlaskConical, Trophy, RotateCcw, 
  TrendingUp, Clock, MousePointer, ArrowUpDown, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings } from '@/hooks/useAppSettings';

interface ABVariant {
  id: string;
  test_name: string;
  variant: 'A' | 'B' | 'C';
  headline: string;
  subheadline: string;
  cta_text: string;
  description: string;
  traffic_percentage: number;
  is_active: boolean;
}

interface ABMetrics {
  variant: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  avgTimeOnPage: number;
  avgScrollDepth: number;
  ctaClicks: number;
}

export function ABTestManager() {
  const { updateSetting, getSettingsByCategory } = useAppSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [variants, setVariants] = useState<ABVariant[]>([]);
  const [metrics, setMetrics] = useState<ABMetrics[]>([]);
  const [abEnabled, setAbEnabled] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<string>('');
  const [trafficDistribution, setTrafficDistribution] = useState<{ A: number; B: number; C: number }>({
    A: 34, B: 33, C: 33
  });

  const landingSettings = getSettingsByCategory('landing');

  // Load settings and data
  useEffect(() => {
    loadData();
  }, []);

  // Load settings from app_settings
  useEffect(() => {
    if (landingSettings.length > 0) {
      landingSettings.forEach(setting => {
        if (setting.key === 'ab_test_enabled') {
          setAbEnabled(setting.value === 'true');
        }
        if (setting.key === 'ab_current_winner') {
          setCurrentWinner(setting.value || '');
        }
      });
    }
  }, [landingSettings]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load variants
      const { data: variantsData, error: variantsError } = await supabase
        .from('landing_ab_tests')
        .select('*')
        .eq('test_name', 'hero_v1')
        .order('variant');

      if (variantsError) throw variantsError;
      setVariants((variantsData || []) as ABVariant[]);

      // Set traffic distribution from variants
      if (variantsData) {
        const distribution: { A: number; B: number; C: number } = { A: 34, B: 33, C: 33 };
        variantsData.forEach(v => {
          distribution[v.variant as 'A' | 'B' | 'C'] = v.traffic_percentage;
        });
        setTrafficDistribution(distribution);
      }

      // Load metrics
      await loadMetrics();
    } catch (error) {
      console.error('Error loading A/B test data:', error);
      toast.error('Erro ao carregar dados do teste A/B');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const { data: sessions, error } = await supabase
        .from('landing_ab_sessions')
        .select('*')
        .eq('test_name', 'hero_v1');

      if (error) throw error;

      // Calculate metrics per variant
      const metricsMap: Record<string, ABMetrics> = {
        A: { variant: 'A', sessions: 0, conversions: 0, conversionRate: 0, avgTimeOnPage: 0, avgScrollDepth: 0, ctaClicks: 0 },
        B: { variant: 'B', sessions: 0, conversions: 0, conversionRate: 0, avgTimeOnPage: 0, avgScrollDepth: 0, ctaClicks: 0 },
        C: { variant: 'C', sessions: 0, conversions: 0, conversionRate: 0, avgTimeOnPage: 0, avgScrollDepth: 0, ctaClicks: 0 },
      };

      sessions?.forEach(session => {
        const v = session.variant as 'A' | 'B' | 'C';
        if (!metricsMap[v]) return;

        metricsMap[v].sessions++;
        if (session.converted) metricsMap[v].conversions++;
        metricsMap[v].avgTimeOnPage += session.time_on_page || 0;
        metricsMap[v].avgScrollDepth += session.scroll_depth || 0;
        metricsMap[v].ctaClicks += session.cta_clicks || 0;
      });

      // Calculate averages and rates
      Object.values(metricsMap).forEach(m => {
        if (m.sessions > 0) {
          m.conversionRate = (m.conversions / m.sessions) * 100;
          m.avgTimeOnPage = m.avgTimeOnPage / m.sessions;
          m.avgScrollDepth = m.avgScrollDepth / m.sessions;
        }
      });

      setMetrics(Object.values(metricsMap));
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const handleToggleABTest = async (enabled: boolean) => {
    try {
      await updateSetting('ab_test_enabled', String(enabled));
      setAbEnabled(enabled);
      toast.success(enabled ? 'Teste A/B ativado' : 'Teste A/B desativado');
    } catch (error) {
      toast.error('Erro ao atualizar configuração');
    }
  };

  const handleSaveTrafficDistribution = async () => {
    setSaving(true);
    try {
      // Update each variant's traffic percentage
      for (const variant of variants) {
        const v = variant.variant as 'A' | 'B' | 'C';
        await supabase
          .from('landing_ab_tests')
          .update({ traffic_percentage: trafficDistribution[v] })
          .eq('id', variant.id);
      }
      toast.success('Distribuição de tráfego salva!');
    } catch (error) {
      toast.error('Erro ao salvar distribuição');
    } finally {
      setSaving(false);
    }
  };

  const handleSetWinner = async (variant: string) => {
    try {
      await updateSetting('ab_current_winner', variant);
      await updateSetting('ab_test_enabled', 'false');
      setCurrentWinner(variant);
      setAbEnabled(false);
      toast.success(`Variante ${variant} definida como vencedora!`);
    } catch (error) {
      toast.error('Erro ao definir vencedor');
    }
  };

  const handleResetTest = async () => {
    if (!confirm('Tem certeza? Isso apagará todos os dados de sessão do teste atual.')) {
      return;
    }

    try {
      // Delete all sessions for this test
      await supabase
        .from('landing_ab_sessions')
        .delete()
        .eq('test_name', 'hero_v1');

      // Reset winner
      await updateSetting('ab_current_winner', '');
      setCurrentWinner('');

      // Reload metrics
      await loadMetrics();
      
      toast.success('Teste resetado com sucesso!');
    } catch (error) {
      toast.error('Erro ao resetar teste');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const getBestVariant = (): string | null => {
    if (metrics.length === 0) return null;
    const best = metrics.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b);
    return best.conversionRate > 0 ? best.variant : null;
  };

  const getVariantDescription = (variant: string): string => {
    const v = variants.find(v => v.variant === variant);
    return v?.description || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const bestVariant = getBestVariant();
  const totalSessions = metrics.reduce((sum, m) => sum + m.sessions, 0);

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <Label className="text-base font-medium">Teste A/B Ativo</Label>
            <Badge variant={abEnabled ? "default" : "secondary"}>
              {abEnabled ? 'Rodando' : currentWinner ? `Vencedor: ${currentWinner}` : 'Pausado'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Quando ativado, visitantes são distribuídos entre as 3 variantes
          </p>
        </div>
        <Switch
          checked={abEnabled}
          onCheckedChange={handleToggleABTest}
          disabled={!!currentWinner}
        />
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users className="w-4 h-4" />
            Sessões Totais
          </div>
          <div className="text-2xl font-bold mt-1">{totalSessions}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingUp className="w-4 h-4" />
            Conversões Totais
          </div>
          <div className="text-2xl font-bold mt-1">
            {metrics.reduce((sum, m) => sum + m.conversions, 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Trophy className="w-4 h-4" />
            Melhor Variante
          </div>
          <div className="text-2xl font-bold mt-1 text-primary">
            {bestVariant || '-'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ArrowUpDown className="w-4 h-4" />
            Status
          </div>
          <div className="text-lg font-medium mt-1">
            {abEnabled ? 'Coletando dados' : 'Aguardando'}
          </div>
        </Card>
      </div>

      {/* Metrics table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Métricas por Variante
          </CardTitle>
          <CardDescription>
            Comparativo de performance entre as 3 variantes do Hero
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Variante</th>
                  <th className="text-center p-3 font-medium">Sessões</th>
                  <th className="text-center p-3 font-medium">Conversões</th>
                  <th className="text-center p-3 font-medium">Taxa</th>
                  <th className="text-center p-3 font-medium">Tempo Médio</th>
                  <th className="text-center p-3 font-medium">Scroll</th>
                  <th className="text-center p-3 font-medium">Cliques CTA</th>
                  <th className="text-center p-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(m => (
                  <tr key={m.variant} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={m.variant === bestVariant ? "default" : "outline"}>
                          {m.variant}
                        </Badge>
                        {m.variant === bestVariant && <Trophy className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getVariantDescription(m.variant)}
                      </p>
                    </td>
                    <td className="text-center p-3">{m.sessions}</td>
                    <td className="text-center p-3">{m.conversions}</td>
                    <td className="text-center p-3 font-medium">
                      <span className={m.variant === bestVariant ? 'text-green-600' : ''}>
                        {m.conversionRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-center p-3">{formatTime(m.avgTimeOnPage)}</td>
                    <td className="text-center p-3">{m.avgScrollDepth.toFixed(0)}%</td>
                    <td className="text-center p-3">{m.ctaClicks}</td>
                    <td className="text-center p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetWinner(m.variant)}
                        disabled={!!currentWinner || m.sessions < 10}
                      >
                        Definir Vencedor
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Traffic distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Tráfego</CardTitle>
          <CardDescription>
            Ajuste a porcentagem de visitantes para cada variante
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {['A', 'B', 'C'].map((v) => (
            <div key={v} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Variante {v}</Label>
                <span className="text-sm font-medium">{trafficDistribution[v as 'A' | 'B' | 'C']}%</span>
              </div>
              <Slider
                value={[trafficDistribution[v as 'A' | 'B' | 'C']]}
                onValueChange={([value]) => {
                  setTrafficDistribution(prev => ({ ...prev, [v]: value }));
                }}
                max={100}
                step={1}
                disabled={!abEnabled}
              />
            </div>
          ))}

          <div className="text-sm text-muted-foreground text-center">
            Total: {trafficDistribution.A + trafficDistribution.B + trafficDistribution.C}%
            {trafficDistribution.A + trafficDistribution.B + trafficDistribution.C !== 100 && (
              <span className="text-destructive ml-2">(deve ser 100%)</span>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSaveTrafficDistribution}
              disabled={saving || !abEnabled || trafficDistribution.A + trafficDistribution.B + trafficDistribution.C !== 100}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Distribuição
                </>
              )}
            </Button>
            <Button variant="destructive" onClick={handleResetTest}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar Teste
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <h4 className="font-medium text-sm">💡 Como funciona:</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Visitantes são atribuídos aleatoriamente a uma variante (via cookie de 30 dias)</li>
          <li>Métricas são coletadas automaticamente: visualizações, tempo, scroll, cliques e conversões</li>
          <li>Recomenda-se pelo menos 100 sessões por variante para significância estatística</li>
          <li>Ao definir um vencedor, o teste é pausado e 100% do tráfego vai para a variante escolhida</li>
        </ul>
      </div>
    </div>
  );
}
