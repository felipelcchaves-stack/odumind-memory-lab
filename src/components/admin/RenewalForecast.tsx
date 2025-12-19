import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CalendarClock, AlertTriangle, ChevronDown, ChevronUp, Mail, DollarSign, Users, Loader2, CheckCircle } from 'lucide-react';
import { getRenewalForecast, RenewalSummary, RenewalData } from '@/lib/advancedAnalytics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RenewalForecastProps {
  onRefresh?: () => void;
}

export function RenewalForecast({ onRefresh }: RenewalForecastProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RenewalSummary | null>(null);
  const [expandedPeriod, setExpandedPeriod] = useState<'30' | '90' | '12' | null>(null);
  const [sendingOffer, setSendingOffer] = useState<string | null>(null);
  const [offerDialog, setOfferDialog] = useState<{ open: boolean; renewal: RenewalData | null }>({ open: false, renewal: null });
  const [discountPercent, setDiscountPercent] = useState(15);
  const [sentOffers, setSentOffers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
    loadSentOffers();
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

  async function loadSentOffers() {
    try {
      const { data: offers } = await supabase
        .from('renewal_offers')
        .select('user_id')
        .in('status', ['sent', 'opened', 'used'])
        .gte('expires_at', new Date().toISOString());
      
      if (offers) {
        setSentOffers(new Set(offers.map(o => o.user_id)));
      }
    } catch (error) {
      console.error('Error loading sent offers:', error);
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function getUrgencyBadge(days: number) {
    if (days <= 7) return <Badge variant="destructive">Urgente</Badge>;
    if (days <= 30) return <Badge className="bg-amber-500 hover:bg-amber-600">Em Breve</Badge>;
    if (days <= 90) return <Badge variant="secondary">Próximo</Badge>;
    return <Badge variant="outline">Futuro</Badge>;
  }

  function openOfferDialog(renewal: RenewalData) {
    setOfferDialog({ open: true, renewal });
    setDiscountPercent(15);
  }

  async function sendOffer() {
    if (!offerDialog.renewal) return;
    
    const renewal = offerDialog.renewal;
    setSendingOffer(renewal.userId);
    setOfferDialog({ open: false, renewal: null });

    try {
      const { data, error } = await supabase.functions.invoke('send-renewal-offer', {
        body: {
          userId: renewal.userId,
          userName: renewal.userName,
          userEmail: renewal.userEmail,
          planName: renewal.planName,
          originalValue: renewal.monthlyValue,
          discountPercent,
          expiresAt: renewal.expiresAt
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(`Oferta enviada para ${renewal.userEmail}!`, {
        description: `Cupom: ${data.couponCode} (${discountPercent}% de desconto)`
      });

      setSentOffers(prev => new Set([...prev, renewal.userId]));
    } catch (error: any) {
      console.error('Error sending offer:', error);
      toast.error('Erro ao enviar oferta', {
        description: error.message
      });
    } finally {
      setSendingOffer(null);
    }
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
    <>
      {/* Offer Dialog */}
      <Dialog open={offerDialog.open} onOpenChange={(open) => setOfferDialog({ open, renewal: open ? offerDialog.renewal : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Oferta de Renovação</DialogTitle>
            <DialogDescription>
              Configure o desconto para {offerDialog.renewal?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={offerDialog.renewal?.userEmail || ''} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Plano Atual</Label>
              <Input value={offerDialog.renewal?.planName || ''} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Valor Original</Label>
              <Input value={formatCurrency(offerDialog.renewal?.monthlyValue || 0)} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Desconto (%)</Label>
              <Input 
                type="number" 
                min={5} 
                max={50} 
                value={discountPercent} 
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Valor com Desconto</Label>
              <Input 
                value={formatCurrency((offerDialog.renewal?.monthlyValue || 0) * (1 - discountPercent / 100))} 
                disabled 
                className="font-bold text-green-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialog({ open: false, renewal: null })}>
              Cancelar
            </Button>
            <Button onClick={sendOffer}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar Oferta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <RenewalTable 
                    renewals={data.next30Days.renewals} 
                    onSendOffer={openOfferDialog} 
                    getUrgencyBadge={getUrgencyBadge} 
                    formatCurrency={formatCurrency}
                    sendingOffer={sendingOffer}
                    sentOffers={sentOffers}
                  />
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
                  <RenewalTable 
                    renewals={data.next90Days.renewals} 
                    onSendOffer={openOfferDialog} 
                    getUrgencyBadge={getUrgencyBadge} 
                    formatCurrency={formatCurrency}
                    sendingOffer={sendingOffer}
                    sentOffers={sentOffers}
                  />
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
                  <RenewalTable 
                    renewals={data.next12Months.renewals} 
                    onSendOffer={openOfferDialog} 
                    getUrgencyBadge={getUrgencyBadge} 
                    formatCurrency={formatCurrency}
                    sendingOffer={sendingOffer}
                    sentOffers={sentOffers}
                  />
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
    </>
  );
}

interface RenewalTableProps {
  renewals: RenewalData[];
  onSendOffer: (renewal: RenewalData) => void;
  getUrgencyBadge: (days: number) => React.ReactNode;
  formatCurrency: (value: number) => string;
  sendingOffer: string | null;
  sentOffers: Set<string>;
}

function RenewalTable({ renewals, onSendOffer, getUrgencyBadge, formatCurrency, sendingOffer, sentOffers }: RenewalTableProps) {
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
          {renewals.slice(0, 10).map((renewal) => {
            const isSending = sendingOffer === renewal.userId;
            const alreadySent = sentOffers.has(renewal.userId);
            
            return (
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
                  {alreadySent ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Enviado
                    </Badge>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onSendOffer(renewal)}
                      disabled={isSending}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-1" />
                      )}
                      Oferta
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
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
