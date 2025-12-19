import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus, ShoppingCart, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getSalesTrend, calculateGrowthMetrics, SalesTrendData, GrowthMetrics } from '@/lib/advancedAnalytics';
import { toast } from 'sonner';

interface SalesTrendProps {
  months?: number;
}

export function SalesTrend({ months = 12 }: SalesTrendProps) {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesTrendData[]>([]);
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null);

  useEffect(() => {
    loadData();
  }, [months]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getSalesTrend(months);
      setSalesData(data);
      setMetrics(calculateGrowthMetrics(data));
    } catch (error) {
      console.error('Error loading sales trend:', error);
      toast.error('Erro ao carregar tendência de vendas');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function getTrendIcon(trend: 'growing' | 'stable' | 'declining') {
    switch (trend) {
      case 'growing':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-yellow-500" />;
    }
  }

  function getTrendBadge(trend: 'growing' | 'stable' | 'declining') {
    switch (trend) {
      case 'growing':
        return <Badge className="bg-green-500 hover:bg-green-600">Crescendo</Badge>;
      case 'declining':
        return <Badge variant="destructive">Diminuindo</Badge>;
      default:
        return <Badge variant="secondary">Estável</Badge>;
    }
  }

  // Prepare chart data with moving average
  const chartDataWithMA = salesData.map((item, index) => {
    let movingAvg = null;
    if (index >= 2) {
      movingAvg = (salesData[index].salesCount + salesData[index - 1].salesCount + salesData[index - 2].salesCount) / 3;
    }
    return {
      ...item,
      movingAverage: movingAvg
    };
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Tendência de Vendas
        </CardTitle>
        <CardDescription>
          Análise de vendas e receita ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs font-medium">Média Vendas/Mês</span>
              </div>
              <p className="text-2xl font-bold">{metrics?.averageSalesPerMonth.toFixed(1) || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">Média Receita/Mês</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(metrics?.averageRevenuePerMonth || 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                {(metrics?.momGrowth || 0) >= 0 ? 
                  <ArrowUpRight className="h-4 w-4 text-green-500" /> : 
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                }
                <span className="text-xs font-medium">Crescimento MoM</span>
              </div>
              <p className={`text-2xl font-bold ${(metrics?.momGrowth || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(metrics?.momGrowth || 0) >= 0 ? '+' : ''}{metrics?.momGrowth.toFixed(1) || 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                {getTrendIcon(metrics?.trend || 'stable')}
                <span className="text-xs font-medium">Tendência</span>
              </div>
              <div className="mt-1">
                {getTrendBadge(metrics?.trend || 'stable')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Vendas Mensais</TabsTrigger>
            <TabsTrigger value="revenue">Receita Mensal</TabsTrigger>
            <TabsTrigger value="combined">Visão Combinada</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <div className="pt-2">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartDataWithMA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="salesCount" 
                    fill="hsl(var(--primary))" 
                    name="Vendas" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="movingAverage" 
                    stroke="hsl(var(--chart-2))" 
                    name="Média Móvel (3m)"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <div className="pt-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$ ${v}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(var(--chart-3))" 
                    name="Receita" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="combined">
            <div className="pt-2">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$ ${v}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Receita') return [formatCurrency(value), name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="salesCount" 
                    fill="hsl(var(--primary))" 
                    name="Vendas" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--chart-3))" 
                    name="Receita"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-3))' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Revenue Growth Indicator */}
        {metrics && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Crescimento de Receita MoM:</span>
            <span className={`font-bold ${(metrics.revenueGrowth || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {(metrics.revenueGrowth || 0) >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
