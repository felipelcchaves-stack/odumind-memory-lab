import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CalendarClock, AlertTriangle, ChevronDown, ChevronUp, Mail, DollarSign, Users } from 'lucide-react';
import { getRenewalForecast, RenewalSummary, RenewalData } from '@/lib/advancedAnalytics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface RenewalForecastProps {
  onRefresh?: () => void;
}

export function RenewalForecast({ onRefresh }: RenewalForecastProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RenewalSummary | null>(null);
  const [expandedPeriod, setExpandedPeriod] = useState<'30' | '90' | '12' | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const renewalData = await getRenewalForecast();
      setData(renewalData);
    } catch (error) {
      console.error('Error loading renewal forecast:', error);
      toast.error('Erro ao carregar previsão de renovações');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function getUrgencyColor(days: number): string {
    if (days <= 7) return 'hsl(var(--destructive))';
    if (days <= 30) return 'hsl(var(--chart-4))';
    if (days <= 90) return 'hsl(var(--chart-2))';
    return 'hsl(var(--primary))';
  }

  function getUrgencyBadge(days: number) {
    if (days <= 7) return <Badge variant="destructive">Urgente</Badge>;
    if (days <= 30) return <Badge className="bg-amber-500 hover:bg-amber-600">Em Breve</Badge>;
    if (days <= 90) return <Badge variant="secondary">Próximo</Badge>;
    return <Badge variant="outline">Futuro</Badge>;
  }

  function handleSendOffer(renewal: RenewalData) {
    toast.info(`Funcionalidade de envio de oferta para ${renewal.userEmail} será implementada em breve!`);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const chartData = data.byMonth.filter(m => m.count > 0 || m.revenue > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Previsão de Renovações
        </CardTitle>
        <CardDescription>
          Acompanhe os vencimentos de assinaturas e receita em risco
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 30 Days */}
          <Collapsible open={expandedPeriod === '30'} onOpenChange={(open) => setExpandedPeriod(open ? '30' : null)}>
            <Card className={`border-2 ${data.next30Days.count > 0 ? 'border-amber-500' : 'border-border'}`}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {data.next30Days.count > 0 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      Próximos 30 dias
                    </CardTitle>
                    {expandedPeriod === '30' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{data.next30Days.count}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">{formatCurrency(data.next30Days.revenue)} em risco</span>
                  </div>
                </div>
              </CardContent>
              <CollapsibleContent>
                <RenewalTable renewals={data.next30Days.renewals} onSendOffer={handleSendOffer} getUrgencyBadge={getUrgencyBadge} formatCurrency={formatCurrency} />
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* 90 Days */}
          <Collapsible open={expandedPeriod === '90'} onOpenChange={(open) => setExpandedPeriod(open ? '90' : null)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Próximos 90 dias</CardTitle>
                    {expandedPeriod === '90' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{data.next90Days.count}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">{formatCurrency(data.next90Days.revenue)} em risco</span>
                  </div>
                </div>
              </CardContent>
              <CollapsibleContent>
                <RenewalTable renewals={data.next90Days.renewals} onSendOffer={handleSendOffer} getUrgencyBadge={getUrgencyBadge} formatCurrency={formatCurrency} />
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* 12 Months */}
          <Collapsible open={expandedPeriod === '12'} onOpenChange={(open) => setExpandedPeriod(open ? '12' : null)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Próximos 12 meses</CardTitle>
                    {expandedPeriod === '12' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{data.next12Months.count}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">{formatCurrency(data.next12Months.revenue)} em risco</span>
                  </div>
                </div>
              </CardContent>
              <CollapsibleContent>
                <RenewalTable renewals={data.next12Months.renewals} onSendOffer={handleSendOffer} getUrgencyBadge={getUrgencyBadge} formatCurrency={formatCurrency} />
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Monthly Chart */}
        {chartData.length > 0 && (
          <div className="pt-4">
            <h3 className="text-sm font-medium mb-4">Vencimentos por Mês (Receita em Risco)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Receita em Risco']}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Bar dataKey="revenue" name="Receita em Risco" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index < 2 ? 'hsl(var(--chart-4))' : 'hsl(var(--primary))'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.next12Months.count === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma assinatura com vencimento previsto nos próximos 12 meses</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RenewalTableProps {
  renewals: RenewalData[];
  onSendOffer: (renewal: RenewalData) => void;
  getUrgencyBadge: (days: number) => React.ReactNode;
  formatCurrency: (value: number) => string;
}

function RenewalTable({ renewals, onSendOffer, getUrgencyBadge, formatCurrency }: RenewalTableProps) {
  if (renewals.length === 0) {
    return (
      <div className="px-6 pb-4 text-sm text-muted-foreground">
        Nenhuma renovação neste período
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Vence em</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renewals.slice(0, 10).map((renewal) => (
            <TableRow key={renewal.userId}>
              <TableCell>
                <div>
                  <p className="font-medium">{renewal.userName}</p>
                  <p className="text-xs text-muted-foreground">{renewal.userEmail}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{renewal.planName}</Badge>
              </TableCell>
              <TableCell>
                {renewal.expiresAt ? format(new Date(renewal.expiresAt), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
              </TableCell>
              <TableCell>{formatCurrency(renewal.monthlyValue)}</TableCell>
              <TableCell>{getUrgencyBadge(renewal.daysUntilExpiry)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onSendOffer(renewal)}>
                  <Mail className="h-4 w-4 mr-1" />
                  Oferta
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {renewals.length > 10 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          +{renewals.length - 10} renovações adicionais
        </p>
      )}
    </div>
  );
}
