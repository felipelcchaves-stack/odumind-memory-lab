import { useState, useEffect } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatsCard } from '@/components/admin/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Target, UserMinus, MapPin, Calendar } from 'lucide-react';
import { calculateAdvancedMetrics, getMonthlyComparison, getDemographicData, AdvancedMetrics, MonthlyComparison, DemographicData } from '@/lib/advancedAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

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

  useEffect(() => {
    loadAnalytics();
  }, [period]);

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
        calculateAdvancedMetrics(startDate, endDate),
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
          value={`R$ ${currentMetrics?.mrr || 0}`}
          description="Receita mensal recorrente"
          icon={DollarSign}
        />
        <StatsCard
          title="ARR (Annual Recurring Revenue)"
          value={`R$ ${currentMetrics?.arr || 0}`}
          description="Receita anual recorrente"
          icon={TrendingUp}
        />
      </div>

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
