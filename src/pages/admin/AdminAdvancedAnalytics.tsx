import { useState, useEffect } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatsCard } from '@/components/admin/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { TrendingUp, Users, DollarSign, Target, UserMinus, MapPin, Calendar, CalendarClock, BarChart3, Percent, Wallet, Calculator, Clock, Settings, RefreshCw, CheckCircle2, AlertCircle, History, Sparkles, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { calculateAdvancedMetrics, getMonthlyComparison, getDemographicData, AdvancedMetrics, MonthlyComparison, DemographicData, PagarmeMetrics } from '@/lib/advancedAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MarketingInsights } from '@/components/admin/MarketingInsights';
import { RenewalForecast } from '@/components/admin/RenewalForecast';
import { SalesTrend } from '@/components/admin/SalesTrend';
import { useFinancialSettingsContext } from '@/contexts/FinancialSettingsContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePagarmeSync } from '@/hooks/usePagarmeSync';
import { Badge } from '@/components/ui/badge';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

// Generate projection data for chart - using calculated growth rate
function generateProjectionData(currentMrr: number, target: number, avgGrowthRate: number = 10) {
  const data = [];
  const today = new Date();
  const netGrowthRate = Math.max(0.01, avgGrowthRate / 100); // Use actual growth rate

  for (let i = 0; i <= 12; i++) {
    const monthDate = addMonths(today, i);
    const projectedMrr = currentMrr * Math.pow(1 + netGrowthRate, i);
    data.push({
      month: format(monthDate, 'MMM', { locale: ptBR }),
      projection: Math.round(projectedMrr * 100) / 100,
      target: target
    });
  }
  return data;
}

const AGE_LABELS: Record<string, string> = {
  'menor_18': 'Menor de 18',
  '18_24': '18-24 anos',
  '25_34': '25-34 anos',
  '35_44': '35-44 anos',
  '45_54': '45-54 anos',
  '55_mais': '55+ anos',
  'nao_informado': 'Não informado'
};

const SEX_LABELS: Record<string, string> = {
  'masculino': 'Masculino',
  'feminino': 'Feminino',
  'outro': 'Outro',
  'prefiro_nao_informar': 'Prefiro não informar',
  'nao_informado': 'Não informado'
};

export default function AdminAdvancedAnalytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'current' | '3months' | '6months'>('current');
  const [currentMetrics, setCurrentMetrics] = useState<AdvancedMetrics | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyComparison[]>([]);
  const [demographicData, setDemographicData] = useState<DemographicData[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSyncMonth, setSelectedSyncMonth] = useState(() => new Date().toISOString().slice(0, 7));
  
  // Pagar.me sync
  const { 
    loading: loadingPagarme, 
    syncing, 
    syncingHistory,
    historyProgress,
    currentSnapshot, 
    availableMonths, 
    calculatedMetrics,
    loadSnapshot, 
    syncWithPagarme,
    syncHistoricalData,
    recalculateMetrics,
    getCurrentMonth 
  } = usePagarmeSync();
  
  // Financial settings - simplified (only sales commission and optional overrides)
  const { settings: financialSettings, loading: loadingSettings, saving, updateSettings } = useFinancialSettingsContext();
  const [localSalesCommission, setLocalSalesCommission] = useState('');
  const [localMrrTargetOverride, setLocalMrrTargetOverride] = useState('');
  const [useAutoTargets, setUseAutoTargets] = useState(true);

  // Initialize local values when settings load
  useEffect(() => {
    if (!loadingSettings) {
      setLocalSalesCommission((financialSettings.salesCommissionPercent * 100).toString());
      setLocalMrrTargetOverride(financialSettings.mrrTarget.toString());
    }
  }, [financialSettings, loadingSettings]);

  useEffect(() => {
    if (!loadingSettings) {
      loadAnalytics();
    }
  }, [period, loadingSettings, financialSettings]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const today = new Date();
      let startDate: Date;
      let endDate: Date = today;

      if (period === 'current') {
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
      } else if (period === '3months') {
        startDate = subMonths(today, 3);
      } else {
        startDate = subMonths(today, 6);
      }

      const [metrics, monthly, demographics] = await Promise.all([
        calculateAdvancedMetrics(startDate, endDate, financialSettings),
        getMonthlyComparison(period === '3months' ? 3 : 6),
        getDemographicData()
      ]);

      setCurrentMetrics(metrics);
      setMonthlyData(monthly);
      setDemographicData(demographics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  // Aggregate demographic data
  const stateData = demographicData.reduce((acc, item) => {
    const existing = acc.find(d => d.estado === item.estado);
    if (existing) {
      existing.total += item.totalUsuarios;
    } else {
      acc.push({ estado: item.estado, total: item.totalUsuarios });
    }
    return acc;
  }, [] as { estado: string; total: number }[]).sort((a, b) => b.total - a.total).slice(0, 10);

  const ageData = demographicData.reduce((acc, item) => {
    const existing = acc.find(d => d.faixaEtaria === item.faixaEtaria);
    if (existing) {
      existing.total += item.totalUsuarios;
    } else {
      acc.push({ faixaEtaria: item.faixaEtaria, total: item.totalUsuarios, label: AGE_LABELS[item.faixaEtaria] || item.faixaEtaria });
    }
    return acc;
  }, [] as { faixaEtaria: string; total: number; label: string }[]);

  const sexData = demographicData.reduce((acc, item) => {
    const existing = acc.find(d => d.sexo === item.sexo);
    if (existing) {
      existing.total += item.totalUsuarios;
    } else {
      acc.push({ sexo: item.sexo, total: item.totalUsuarios, label: SEX_LABELS[item.sexo] || item.sexo });
    }
    return acc;
  }, [] as { sexo: string; total: number; label: string }[]);

  // Use calculated metrics from Pagar.me if available, fallback to DB metrics
  const displayMetrics = calculatedMetrics || null;

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Analytics Avançadas"
          description="Métricas detalhadas de conversão, retenção e demografia"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Avançadas</h1>
          <p className="text-muted-foreground">Métricas detalhadas filtradas por Isesemind (Pagar.me)</p>
        </div>
        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mês Atual</SelectItem>
            <SelectItem value="3months">Últimos 3 Meses</SelectItem>
            <SelectItem value="6months">Últimos 6 Meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Metrics - Using Pagar.me calculated metrics when available */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Taxa de Conversão"
          value={`${displayMetrics?.conversionRate || currentMetrics?.conversionRate || 0}%`}
          description="Usuários → Pagantes"
          icon={Target}
        />
        <StatsCard
          title="Retention Rate"
          value={`${displayMetrics?.retentionRate || currentMetrics?.retentionRate || 0}%`}
          description="Usuários retidos"
          icon={Users}
        />
        <StatsCard
          title="Churn Mensal"
          value={`${displayMetrics?.churnRate || currentMetrics?.churnRate || 0}%`}
          description="Taxa de cancelamento"
          icon={UserMinus}
        />
        <StatsCard
          title="LTV (Lifetime Value)"
          value={`R$ ${(displayMetrics?.ltv || currentMetrics?.ltv || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          description="Valor médio por cliente"
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard
          title="MRR Bruto (Isesemind)"
          value={`R$ ${(displayMetrics?.mrr || currentMetrics?.mrr || 0)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          description={displayMetrics ? "Receita real Pagar.me" : "Receita mensal recorrente bruta"}
          icon={DollarSign}
        />
        <StatsCard
          title="ARR (Annual Recurring Revenue)"
          value={`R$ ${(displayMetrics?.arr || currentMetrics?.arr || 0)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          description="Receita anual recorrente"
          icon={TrendingUp}
        />
      </div>

      {/* Pagar.me Sync Section - Complete Metrics */}
      <Card className="border-green-500/30 bg-gradient-to-br from-background to-green-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              <CardTitle>Receita Real Isesemind (Pagar.me)</CardTitle>
              {currentSnapshot && (
                <Badge variant="outline" className="text-green-600 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Filtrado
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedSyncMonth} onValueChange={(m) => { setSelectedSyncMonth(m); loadSnapshot(m); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = subMonths(new Date(), i);
                    const monthValue = format(date, 'yyyy-MM');
                    const monthLabel = format(date, 'MMMM yyyy', { locale: ptBR });
                    return (
                      <SelectItem key={monthValue} value={monthValue}>
                        {monthLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncWithPagarme(selectedSyncMonth)}
                disabled={syncing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncHistoricalData(12)}
                disabled={syncingHistory}
                className="gap-2"
              >
                <History className={`h-4 w-4 ${syncingHistory ? 'animate-spin' : ''}`} />
                {syncingHistory ? `${historyProgress.toFixed(0)}%` : 'Histórico 12m'}
              </Button>
            </div>
          </div>
          <CardDescription>
            Dados filtrados por metadata: product = Isesemind
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPagarme ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : currentSnapshot ? (
            <div className="space-y-6">
              {/* TPV and Charges Row */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 rounded-lg bg-card border border-blue-500/30">
                  <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
                    <BarChart3 className="h-4 w-4" />
                    Cobranças Criadas
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {currentSnapshot.charges_created.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentSnapshot.charges_count} cobranças Isesemind
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-card border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-600 text-sm mb-2">
                    <Target className="h-4 w-4" />
                    TPV (Autorizadas)
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    R$ {currentSnapshot.tpv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cobranças autorizadas/pagas
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-card border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <DollarSign className="h-4 w-4" />
                    MRR Bruto (Pagas)
                  </div>
                  <p className="text-2xl font-bold">
                    R$ {currentSnapshot.gross_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentSnapshot.paid_charges_count} transações pagas
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-card border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <TrendingUp className="h-4 w-4" />
                    Ticket Médio
                  </div>
                  <p className="text-2xl font-bold">
                    R$ {currentSnapshot.average_ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Por transação
                  </p>
                </div>
              </div>

              {/* Fees and Net Revenue Row */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 rounded-lg bg-card border border-red-500/30">
                  <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
                    <Percent className="h-4 w-4" />
                    Taxas Gateway (real)
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    -R$ {currentSnapshot.gateway_fees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{currentSnapshot.gross_revenue > 0 ? ((currentSnapshot.gateway_fees / currentSnapshot.gross_revenue) * 100).toFixed(2) : '0'}% do bruto
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-card border border-purple-500/30">
                  <div className="flex items-center gap-2 text-purple-600 text-sm mb-2">
                    <Users className="h-4 w-4" />
                    Comissão Vendedores
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    -R$ {(currentSnapshot.net_revenue * financialSettings.salesCommissionPercent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(financialSettings.salesCommissionPercent * 100).toFixed(0)}% sobre líquido
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-card border-2 border-green-500/50 bg-green-500/5">
                  <div className="flex items-center gap-2 text-green-600 text-sm mb-2">
                    <Wallet className="h-4 w-4" />
                    MRR Líquido Final
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {displayMetrics?.mrrNet?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || (currentSnapshot.net_revenue * (1 - financialSettings.salesCommissionPercent)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O que você realmente recebe
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-card border border-cyan-500/30">
                  <div className="flex items-center gap-2 text-cyan-600 text-sm mb-2">
                    <Clock className="h-4 w-4" />
                    Saldo Disponível
                  </div>
                  <p className="text-2xl font-bold text-cyan-600">
                    R$ {currentSnapshot.available_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A receber: R$ {currentSnapshot.waiting_funds.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Sync info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                <span>
                  Última sincronização: {currentSnapshot.synced_at ? format(new Date(currentSnapshot.synced_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                </span>
                <span>
                  Mês de referência: {format(new Date(currentSnapshot.reference_month + '-01'), 'MMMM yyyy', { locale: ptBR })}
                </span>
                <span>
                  Transferido: R$ {currentSnapshot.transferred_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhum dado sincronizado para este mês
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => syncWithPagarme(selectedSyncMonth)}
                  disabled={syncing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  Sincronizar Agora
                </Button>
                <Button
                  variant="outline"
                  onClick={() => syncHistoricalData(12)}
                  disabled={syncingHistory}
                  className="gap-2"
                >
                  <History className={`h-4 w-4 ${syncingHistory ? 'animate-spin' : ''}`} />
                  Sincronizar Histórico (12 meses)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automatic Targets Section - NEW */}
      {displayMetrics && (
        <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Metas & Projeções Automáticas</CardTitle>
                <Badge variant="secondary" className="ml-2">Baseado em dados reais</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                {showSettings ? 'Ocultar' : 'Configurar'}
              </Button>
            </div>
            <CardDescription>
              Metas calculadas automaticamente baseadas no histórico de crescimento do Isesemind
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Growth and Performance Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 rounded-lg bg-card border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <TrendingUp className="h-4 w-4" />
                  Crescimento Médio/Mês
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {displayMetrics.avgMonthlyGrowth.toFixed(1)}%
                  </p>
                  {displayMetrics.avgMonthlyGrowth > 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-green-500" />
                  ) : displayMetrics.avgMonthlyGrowth < 0 ? (
                    <ArrowDownRight className="h-5 w-5 text-red-500" />
                  ) : (
                    <Minus className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Último mês: {displayMetrics.monthOverMonthGrowth.toFixed(1)}%
                </p>
              </div>

              <div className="p-4 rounded-lg bg-card border border-green-500/30">
                <div className="flex items-center gap-2 text-green-600 text-sm mb-2">
                  <Target className="h-4 w-4" />
                  Meta MRR Sugerida
                </div>
                <p className="text-2xl font-bold text-green-600">
                  R$ {displayMetrics.suggestedMrrTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Projeção 12 meses com crescimento atual
                </p>
              </div>

              <div className="p-4 rounded-lg bg-card border border-blue-500/30">
                <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
                  <Calendar className="h-4 w-4" />
                  Meses para Dobrar MRR
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {displayMetrics.monthsToDouble < 999 ? displayMetrics.monthsToDouble : '∞'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Com crescimento de {displayMetrics.avgMonthlyGrowth.toFixed(1)}%/mês
                </p>
              </div>

              <div className="p-4 rounded-lg bg-card border border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-600 text-sm mb-2">
                  <UserMinus className="h-4 w-4" />
                  Churn Sugerido
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {displayMetrics.suggestedChurnTarget.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  20% melhor que atual ({displayMetrics.churnRate.toFixed(1)}%)
                </p>
              </div>
            </div>

            {/* Projections */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-card border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <TrendingUp className="h-4 w-4" />
                  MRR em 6 Meses
                </div>
                <p className="text-xl font-bold">
                  R$ {displayMetrics.projectedMrr6Months.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <TrendingUp className="h-4 w-4" />
                  MRR em 12 Meses
                </div>
                <p className="text-xl font-bold">
                  R$ {displayMetrics.projectedMrr12Months.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-card border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <Calendar className="h-4 w-4" />
                  ARR Projetado (12m)
                </div>
                <p className="text-xl font-bold">
                  R$ {(displayMetrics.projectedMrr12Months * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Historical Context */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Melhor Mês</p>
                  <p className="text-sm font-bold text-green-600">
                    R$ {displayMetrics.bestMonth.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {displayMetrics.bestMonth.month}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Pior Mês</p>
                  <p className="text-sm font-bold text-red-600">
                    R$ {displayMetrics.worstMonth.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {displayMetrics.worstMonth.month}
                </span>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configurações
                </h4>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="salesCommission">Comissão de Vendedores (%)</Label>
                    <Input
                      id="salesCommission"
                      type="number"
                      step="0.1"
                      value={localSalesCommission}
                      onChange={(e) => setLocalSalesCommission(e.target.value)}
                      placeholder="10"
                    />
                    <p className="text-xs text-muted-foreground">Ex: 10 para 10% sobre vendas</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mrrTargetOverride">Override Meta MRR (opcional)</Label>
                    <Input
                      id="mrrTargetOverride"
                      type="number"
                      value={localMrrTargetOverride}
                      onChange={(e) => {
                        setLocalMrrTargetOverride(e.target.value);
                        setUseAutoTargets(false);
                      }}
                      placeholder="Deixe vazio para usar meta automática"
                    />
                    <p className="text-xs text-muted-foreground">
                      Meta automática: R$ {displayMetrics.suggestedMrrTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    updateSettings({
                      salesCommissionPercent: parseFloat(localSalesCommission) / 100,
                      mrrTarget: parseFloat(localMrrTargetOverride) || displayMetrics.suggestedMrrTarget,
                      arrTarget: (parseFloat(localMrrTargetOverride) || displayMetrics.suggestedMrrTarget) * 12,
                    });
                    recalculateMetrics(
                      parseFloat(localSalesCommission) / 100,
                      { mrrTarget: parseFloat(localMrrTargetOverride) || undefined }
                    );
                  }}
                  disabled={saving}
                  className="w-full md:w-auto"
                >
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            )}

            {/* Target Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso da Meta MRR</span>
                <span className="font-medium">{displayMetrics.targetProgress.toFixed(1)}%</span>
              </div>
              <Progress 
                value={Math.min(100, displayMetrics.targetProgress)} 
                className="h-3"
              />
              <p className="text-sm text-muted-foreground">
                {displayMetrics.targetProgress >= 100 
                  ? '🎉 Parabéns! Você atingiu sua meta!' 
                  : `Faltam R$ ${displayMetrics.gapToTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para a meta (${displayMetrics.monthsToTarget < 999 ? `~${displayMetrics.monthsToTarget} meses` : 'calculando...'})`}
              </p>
            </div>

            {/* Projection Chart */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Projeção de Crescimento (próximos 12 meses)
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart 
                  data={generateProjectionData(
                    displayMetrics.mrrNet, 
                    displayMetrics.targetMrr,
                    displayMetrics.avgMonthlyGrowth
                  )}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                  />
                  <Legend />
                  <ReferenceLine 
                    y={displayMetrics.targetMrr} 
                    stroke="hsl(var(--primary))" 
                    strokeDasharray="5 5" 
                    label={{ value: 'Meta', position: 'right', fill: 'hsl(var(--primary))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="projection" 
                    fill="hsl(var(--primary) / 0.1)" 
                    stroke="hsl(var(--primary))" 
                    name="Projeção MRR"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center">
                * Projeção baseada em crescimento médio de {displayMetrics.avgMonthlyGrowth.toFixed(1)}% ao mês (dados históricos reais)
              </p>
            </div>

            {/* ARR Summary */}
            <div className="grid gap-4 md:grid-cols-2 p-4 rounded-lg bg-muted/30 border">
              <div>
                <p className="text-sm text-muted-foreground">ARR Líquido (Atual)</p>
                <p className="text-xl font-bold">
                  R$ {displayMetrics.arrNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ARR Meta Sugerida</p>
                <p className="text-xl font-bold">
                  R$ {displayMetrics.suggestedArrTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Renewal Forecast & Sales Trend */}
      <div className="grid gap-6 lg:grid-cols-1">
        <Tabs defaultValue="renewals" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="renewals" className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Renovações
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Tendência de Vendas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="renewals">
            <RenewalForecast />
          </TabsContent>

          <TabsContent value="sales">
            <SalesTrend months={period === '3months' ? 3 : period === '6months' ? 6 : 12} />
          </TabsContent>
        </Tabs>
      </div>

      {/* AI Marketing Insights */}
      {currentMetrics && (
        <MarketingInsights 
          metrics={currentMetrics}
          demographicData={demographicData}
          monthlyData={monthlyData}
          period={period}
        />
      )}

      {/* Monthly Comparison Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Comparação Mês a Mês
          </CardTitle>
          <CardDescription>Evolução das principais métricas ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="conversion" className="space-y-4">
            <TabsList>
              <TabsTrigger value="conversion">Conversão & Retenção</TabsTrigger>
              <TabsTrigger value="revenue">MRR & ARR</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
            </TabsList>

            <TabsContent value="conversion" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="metrics.conversionRate" stroke="hsl(var(--primary))" name="Taxa de Conversão (%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="metrics.retentionRate" stroke="hsl(var(--chart-2))" name="Retention Rate (%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="metrics.churnRate" stroke="hsl(var(--destructive))" name="Churn Rate (%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="metrics.mrr" fill="hsl(var(--primary))" name="MRR (R$)" />
                  <Bar dataKey="metrics.arr" fill="hsl(var(--chart-3))" name="ARR (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="metrics.totalUsers" stroke="hsl(var(--primary))" name="Total de Usuários" strokeWidth={2} />
                  <Line type="monotone" dataKey="metrics.activeUsers" stroke="hsl(var(--chart-2))" name="Usuários Ativos" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Demographics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Demografia dos Usuários
          </CardTitle>
          <CardDescription>Distribuição geográfica e demográfica da base de usuários</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="states" className="space-y-4">
            <TabsList>
              <TabsTrigger value="states">Estados</TabsTrigger>
              <TabsTrigger value="age">Faixa Etária</TabsTrigger>
              <TabsTrigger value="sex">Sexo</TabsTrigger>
            </TabsList>

            <TabsContent value="states" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="estado" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Usuários" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="age" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ageData}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="sex" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sexData}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {sexData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
