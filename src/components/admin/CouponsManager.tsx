import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Ticket, Users, TrendingUp, Calendar, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  email: string | null;
  source: string;
  stripe_coupon_id: string | null;
  created_at: string;
}

interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string | null;
  email: string;
  used_at: string;
  order_value: number | null;
  discount_applied: number | null;
}

interface Stats {
  totalCoupons: number;
  activeCoupons: number;
  totalUsage: number;
  totalDiscount: number;
  conversionRate: number;
}

export function CouponsManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [usageHistory, setUsageHistory] = useState<CouponUsage[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCoupons: 0,
    activeCoupons: 0,
    totalUsage: 0,
    totalDiscount: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Form state for new coupon
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_percent: 20,
    max_uses: '',
    valid_days: 30,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load coupons
      const { data: couponsData, error: couponsError } = await supabase
        .from('discount_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (couponsError) throw couponsError;
      setCoupons(couponsData || []);

      // Load usage history
      const { data: usageData, error: usageError } = await supabase
        .from('coupon_usage')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(100);

      if (usageError) throw usageError;
      setUsageHistory(usageData || []);

      // Calculate stats
      const activeCoupons = couponsData?.filter(c => c.is_active) || [];
      const totalUsage = usageData?.length || 0;
      const totalDiscount = usageData?.reduce((acc, u) => acc + (u.discount_applied || 0), 0) || 0;
      
      setStats({
        totalCoupons: couponsData?.length || 0,
        activeCoupons: activeCoupons.length,
        totalUsage,
        totalDiscount,
        conversionRate: couponsData?.length ? (totalUsage / couponsData.length) * 100 : 0,
      });
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast.error('Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  const toggleCouponStatus = async (couponId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('discount_coupons')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', couponId);

      if (error) throw error;

      setCoupons(prev => prev.map(c => 
        c.id === couponId ? { ...c, is_active: isActive } : c
      ));
      
      toast.success(isActive ? 'Cupom ativado' : 'Cupom desativado');
    } catch (error) {
      console.error('Error toggling coupon:', error);
      toast.error('Erro ao atualizar cupom');
    }
  };

  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'ISESE';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCoupon(prev => ({ ...prev, code }));
  };

  const createCoupon = async () => {
    if (!newCoupon.code.trim()) {
      toast.error('Digite um código para o cupom');
      return;
    }

    setSaving(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + newCoupon.valid_days);

      const { error } = await supabase
        .from('discount_coupons')
        .insert({
          code: newCoupon.code.toUpperCase(),
          discount_percent: newCoupon.discount_percent,
          max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
          valid_until: validUntil.toISOString(),
          source: 'admin_manual',
          is_active: true,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este código já existe. Tente outro.');
          return;
        }
        throw error;
      }

      toast.success('Cupom criado com sucesso!');
      setShowCreateDialog(false);
      setNewCoupon({ code: '', discount_percent: 20, max_uses: '', valid_days: 30 });
      loadData();
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast.error('Erro ao criar cupom');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const getSourceBadge = (source: string) => {
    const sources: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      'exit_popup': { label: 'Exit Popup', variant: 'default' },
      'admin_manual': { label: 'Manual', variant: 'secondary' },
      'referral': { label: 'Indicação', variant: 'outline' },
    };
    const config = sources[source] || { label: source, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cupons</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCoupons}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCoupons} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cupons Utilizados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Total de usos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Cupons usados / criados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desconto Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.totalDiscount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Em descontos aplicados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Management */}
      <Tabs defaultValue="coupons" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="coupons">Cupons</TabsTrigger>
            <TabsTrigger value="usage">Histórico de Uso</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Cupom
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Cupom</DialogTitle>
                  <DialogDescription>
                    Crie um cupom de desconto manualmente.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código do Cupom</Label>
                    <div className="flex gap-2">
                      <Input
                        id="code"
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        placeholder="Ex: ISESE2024"
                        className="font-mono"
                      />
                      <Button type="button" variant="outline" onClick={generateCouponCode}>
                        Gerar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discount">Desconto (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="1"
                        max="100"
                        value={newCoupon.discount_percent}
                        onChange={(e) => setNewCoupon(prev => ({ ...prev, discount_percent: parseInt(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_uses">Limite de Usos</Label>
                      <Input
                        id="max_uses"
                        type="number"
                        min="1"
                        value={newCoupon.max_uses}
                        onChange={(e) => setNewCoupon(prev => ({ ...prev, max_uses: e.target.value }))}
                        placeholder="Ilimitado"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valid_days">Válido por (dias)</Label>
                    <Input
                      id="valid_days"
                      type="number"
                      min="1"
                      value={newCoupon.valid_days}
                      onChange={(e) => setNewCoupon(prev => ({ ...prev, valid_days: parseInt(e.target.value) || 30 }))}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createCoupon} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Criar Cupom
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="coupons">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Cupons</CardTitle>
              <CardDescription>
                Gerencie todos os cupons de desconto do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum cupom encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-medium">
                          <div className="flex items-center gap-2">
                            {coupon.code}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyCode(coupon.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{coupon.discount_percent}%</Badge>
                        </TableCell>
                        <TableCell>{getSourceBadge(coupon.source)}</TableCell>
                        <TableCell>
                          {coupon.current_uses}
                          {coupon.max_uses && ` / ${coupon.max_uses}`}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {coupon.email || '-'}
                        </TableCell>
                        <TableCell>
                          {coupon.valid_until ? (
                            <span className={new Date(coupon.valid_until) < new Date() ? 'text-destructive' : ''}>
                              {format(new Date(coupon.valid_until), 'dd/MM/yyyy')}
                            </span>
                          ) : (
                            'Sem limite'
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={coupon.is_active}
                            onCheckedChange={(checked) => toggleCouponStatus(coupon.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {coupon.stripe_coupon_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(`https://dashboard.stripe.com/coupons/${coupon.stripe_coupon_id}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Uso</CardTitle>
              <CardDescription>
                Últimos 100 usos de cupons registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Cupom</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor do Pedido</TableHead>
                    <TableHead>Desconto Aplicado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum uso registrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    usageHistory.map((usage) => {
                      const coupon = coupons.find(c => c.id === usage.coupon_id);
                      return (
                        <TableRow key={usage.id}>
                          <TableCell>{usage.email}</TableCell>
                          <TableCell className="font-mono">
                            {coupon?.code || '-'}
                          </TableCell>
                          <TableCell>{formatDate(usage.used_at)}</TableCell>
                          <TableCell>
                            {usage.order_value ? `R$ ${usage.order_value.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            {usage.discount_applied ? `R$ ${usage.discount_applied.toFixed(2)}` : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
