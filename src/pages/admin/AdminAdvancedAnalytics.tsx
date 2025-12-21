import { useState, useEffect } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatsCard } from '@/components/admin/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { TrendingUp, Users, DollarSign, Target, UserMinus, MapPin, Calendar, CalendarClock, BarChart3, Percent, Wallet, Calculator, Clock, Settings } from 'lucide-react';
import { calculateAdvancedMetrics, getMonthlyComparison, getDemographicData, AdvancedMetrics, MonthlyComparison, DemographicData } from '@/lib/advancedAnalytics';
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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

// Generate projection data for chart - using expected churn rate for realistic projections
function generateProjectionData(currentMrr: number, target: number, expectedChurnRate: number = 0.05) {
  const data = [];
  const today = new Date();
  const grossGrowthRate = 0.10; // 10% monthly growth assumption
  const netGrowthRate = grossGrowthRate - expectedChurnRate; // Net growth after churn

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
  
  // Financial settings
  const { settings: financialSettings, loading: loadingSettings, saving, updateSettings } = useFinancialSettingsContext();
  const [localGatewayFeePercent, setLocalGatewayFeePercent] = useState('');
  const [localGatewayFeeFixed, setLocalGatewayFeeFixed] = useState('');
  const [localSalesCommission, setLocalSalesCommission] = useState('');
  const [localOperationalTax, setLocalOperationalTax] = useState('');
  const [localMrrTarget, setLocalMrrTarget] = useState('');
  const [localArrTarget, setLocalArrTarget] = useState('');
  const [localChurnRate, setLocalChurnRate] = useState('');

  // Initialize local values when settings load
  useEffect(() => {
    if (!loadingSettings) {
      setLocalGatewayFeePercent((financialSettings.gatewayFeePercent * 100).toString());
      setLocalGatewayFeeFixed(financialSettings.gatewayFeeFixed.toString());
      setLocalSalesCommission((financialSettings.salesCommissionPercent * 100).toString());
      setLocalOperationalTax((financialSettings.operationalTaxPercent * 100).toString());
      setLocalMrrTarget(financialSettings.mrrTarget.toString());
      setLocalArrTarget(financialSettings.arrTarget.toString());
      setLocalChurnRate((financialSettings.expectedChurnRate * 100).toString());
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
          <p className="text-muted-foreground">Métricas detalhadas de conversão, retenção e demografia</p>
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

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Taxa de Conversão"
          value={`${currentMetrics?.conversionRate || 0}%`}
          description="Usuários → Pagantes"
          icon={Target}
        />
        <StatsCard
          title="Retention Rate"
          value={`${currentMetrics?.retentionRate || 0}%`}
          description="Usuários retidos"
          icon={Users}
        />
        <StatsCard
          title="Churn Mensal"
          value={`${currentMetrics?.churnRate || 0}%`}
          description="Taxa de cancelamento"
          icon={UserMinus}
        />
        <StatsCard
          title="LTV (Lifetime Value)"
          value={`R$ ${currentMetrics?.ltv || 0}`}
          description="Valor médio por cliente"
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard
          title="MRR (Monthly Recurring Revenue)"
          value={`R$ ${currentMetrics?.mrr?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
          description="Receita mensal recorrente bruta"
          icon={DollarSign}
        />
        <StatsCard
          title="ARR (Annual Recurring Revenue)"
          value={`R$ ${currentMetrics?.arr?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
          description="Receita anual recorrente bruta"
          icon={TrendingUp}
        />
      </div>

      {/* Financial Planning Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle>Planejamento Financeiro</CardTitle>
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
            MRR/ARR líquido após comissões e progresso em relação às metas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações de Taxas e Metas
              </h4>
              
              {/* Taxas do Gateway */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxas do Gateway (Pagar.me/Guru)</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gatewayFeePercent">Taxa do Gateway (%)</Label>
                    <Input
                      id="gatewayFeePercent"
                      type="number"
                      step="0.01"
                      value={localGatewayFeePercent}
                      onChange={(e) => setLocalGatewayFeePercent(e.target.value)}
                      placeholder="3.99"
                    />
                    <p className="text-xs text-muted-foreground">Ex: 3.99 para 3.99%</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gatewayFeeFixed">Taxa Fixa por Transação (R$)</Label>
                    <Input
                      id="gatewayFeeFixed"
                      type="number"
                      step="0.01"
                      value={localGatewayFeeFixed}
                      onChange={(e) => setLocalGatewayFeeFixed(e.target.value)}
                      placeholder="0.39"
                    />
                    <p className="text-xs text-muted-foreground">Ex: 0.39 por transação</p>
                  </div>
                </div>
              </div>

              {/* Comissão de Vendedores */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comissão de Vendedores</p>
                <div className="grid gap-4 md:grid-cols-1 max-w-xs">
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
                </div>
              </div>

              {/* Outras Taxas */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxas Operacionais / Impostos</p>
                <div className="grid gap-4 md:grid-cols-1 max-w-xs">
                  <div className="space-y-2">
                    <Label htmlFor="operationalTax">Taxas Operacionais/Impostos (%)</Label>
                    <Input
                      id="operationalTax"
                      type="number"
                      step="0.1"
                      value={localOperationalTax}
                      onChange={(e) => setLocalOperationalTax(e.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Ex: 5 para 5% (opcional)</p>
                  </div>
                </div>
              </div>

              {/* Metas */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Metas</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="mrrTarget">Meta MRR Mensal (R$)</Label>
                    <Input
                      id="mrrTarget"
                      type="number"
                      value={localMrrTarget}
                      onChange={(e) => setLocalMrrTarget(e.target.value)}
                      placeholder="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arrTarget">Meta ARR Anual (R$)</Label>
                    <Input
                      id="arrTarget"
                      type="number"
                      value={localArrTarget}
                      onChange={(e) => setLocalArrTarget(e.target.value)}
                      placeholder="120000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="churnRate">Churn Esperado (%)</Label>
                    <Input
                      id="churnRate"
                      type="number"
                      step="0.1"
                      value={localChurnRate}
                      onChange={(e) => setLocalChurnRate(e.target.value)}
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground">Para projeções realistas</p>
                  </div>
                </div>
              </div>

              {/* Churn comparison cards */}
              <div className="grid gap-4 md:grid-cols-3 mt-4">
                <div className="p-3 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Churn Real (Calculado)</p>
                  <p className="text-lg font-bold">{currentMetrics?.churnRate || 0}%</p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Churn Esperado</p>
                  <p className="text-lg font-bold">{(financialSettings.expectedChurnRate * 100).toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Diferença</p>
                  <p className={`text-lg font-bold ${
                    (currentMetrics?.churnRate || 0) <= financialSettings.expectedChurnRate * 100 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    {((currentMetrics?.churnRate || 0) - financialSettings.expectedChurnRate * 100).toFixed(1)}%
                    {(currentMetrics?.churnRate || 0) <= financialSettings.expectedChurnRate * 100 
                      ? ' (melhor)' 
                      : ' (pior)'}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => {
                  updateSettings({
                    gatewayFeePercent: parseFloat(localGatewayFeePercent) / 100,
                    gatewayFeeFixed: parseFloat(localGatewayFeeFixed),
                    salesCommissionPercent: parseFloat(localSalesCommission) / 100,
                    operationalTaxPercent: parseFloat(localOperationalTax) / 100,
                    mrrTarget: parseFloat(localMrrTarget),
                    arrTarget: parseFloat(localArrTarget),
                    expectedChurnRate: parseFloat(localChurnRate) / 100,
                  });
                }}
                disabled={saving}
                className="w-full md:w-auto"
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          )}

          {/* Revenue Flow - 4 Níveis */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* MRR Bruto */}
            <div className="p-4 rounded-lg bg-card border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <DollarSign className="h-4 w-4" />
                MRR Bruto
              </div>
              <p className="text-2xl font-bold">
                R$ {currentMetrics?.mrr?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                O que o cliente paga
              </p>
            </div>

            {/* MRR após Gateway */}
            <div className="p-4 rounded-lg bg-card border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-600 text-sm mb-2">
                <Wallet className="h-4 w-4" />
                MRR após Gateway
              </div>
              <p className="text-2xl font-bold text-amber-600">
                R$ {currentMetrics?.mrrAfterGateway?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                -{(financialSettings.gatewayFeePercent * 100).toFixed(2)}% + R${financialSettings.gatewayFeeFixed}/trans
              </p>
            </div>

            {/* MRR após Comissão */}
            <div className="p-4 rounded-lg bg-card border border-purple-500/30">
              <div className="flex items-center gap-2 text-purple-600 text-sm mb-2">
                <Users className="h-4 w-4" />
                MRR após Comissão
              </div>
              <p className="text-2xl font-bold text-purple-600">
                R$ {currentMetrics?.mrrAfterCommission?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                -{(financialSettings.salesCommissionPercent * 100).toFixed(0)}% vendedores
              </p>
            </div>

            {/* MRR Líquido Real */}
            <div className="p-4 rounded-lg bg-card border border-green-500/30">
              <div className="flex items-center gap-2 text-green-600 text-sm mb-2">
                <Wallet className="h-4 w-4" />
                MRR Líquido Real
              </div>
              <p className="text-2xl font-bold text-green-600">
                R$ {currentMetrics?.mrrNet?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {financialSettings.operationalTaxPercent > 0 
                  ? `-${(financialSettings.operationalTaxPercent * 100).toFixed(0)}% taxas/impostos`
                  : 'O que você realmente recebe'
                }
              </p>
            </div>
          </div>

          {/* Breakdown das Taxas */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium">Gateway</span>
              </div>
              <p className="text-sm font-bold text-red-500">
                -R$ {currentMetrics?.gatewayFeeAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium">Comissão Vendedores</span>
              </div>
              <p className="text-sm font-bold text-purple-500">
                -R$ {currentMetrics?.salesCommissionAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium">Impostos/Operacional</span>
              </div>
              <p className="text-sm font-bold text-orange-500">
                -R$ {currentMetrics?.operationalTaxAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-600/10 border border-red-600/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-red-600" />
                <span className="text-xs font-medium">Total Taxas</span>
              </div>
              <p className="text-sm font-bold text-red-600">
                -R$ {currentMetrics?.totalFeesAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>
          </div>

          {/* Financial Metrics Cards - Metas */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-card border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Target className="h-4 w-4" />
                Meta MRR Líquido
              </div>
              <p className="text-2xl font-bold">
                R$ {financialSettings.mrrTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentMetrics?.targetProgress?.toFixed(1) || 0}% atingido
              </p>
            </div>

            <div className="p-4 rounded-lg bg-card border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <TrendingUp className="h-4 w-4" />
                Gap para Meta
              </div>
              <p className="text-2xl font-bold text-amber-500">
                R$ {currentMetrics?.gapToTarget?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Faltam para a meta mensal
              </p>
            </div>

            <div className="p-4 rounded-lg bg-card border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Users className="h-4 w-4" />
                Assinaturas Necessárias
              </div>
              <p className="text-2xl font-bold text-blue-500">
                {currentMetrics?.customersNeeded || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ticket médio: R$ {currentMetrics?.averageTicket?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-card border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Clock className="h-4 w-4" />
                Previsão
              </div>
              <p className="text-2xl font-bold">
                {currentMetrics?.monthsToTarget === 0 
                  ? '🎉 Meta atingida!' 
                  : currentMetrics?.monthsToTarget === 999 
                    ? 'N/A' 
                    : `${currentMetrics?.monthsToTarget || 0} meses`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Para atingir a meta
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso da Meta Mensal</span>
              <span className="font-medium">{currentMetrics?.targetProgress?.toFixed(1) || 0}%</span>
            </div>
            <Progress 
              value={Math.min(100, currentMetrics?.targetProgress || 0)} 
              className="h-3"
            />
            <p className="text-sm text-muted-foreground">
              {(currentMetrics?.targetProgress || 0) >= 100 
                ? '🎉 Parabéns! Você atingiu sua meta mensal!' 
                : `Você está a R$ ${currentMetrics?.gapToTarget?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'} (${currentMetrics?.customersNeeded || 0} assinaturas) da sua meta mensal`}
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
                  currentMetrics?.mrrNet || 0, 
                  financialSettings.mrrTarget,
                  financialSettings.expectedChurnRate
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
                  y={financialSettings.mrrTarget} 
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
              * Projeção baseada em crescimento estimado de 10% ao mês
            </p>
          </div>

          {/* ARR Summary */}
          <div className="grid gap-4 md:grid-cols-2 p-4 rounded-lg bg-muted/30 border">
            <div>
              <p className="text-sm text-muted-foreground">ARR Líquido (Atual)</p>
              <p className="text-xl font-bold">
                R$ {currentMetrics?.arrNet?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Meta ARR</p>
              <p className="text-xl font-bold">
                R$ {financialSettings.arrTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
