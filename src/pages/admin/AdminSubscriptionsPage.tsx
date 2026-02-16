import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Send, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_name: string;
  status: string;
  current_period_end: string | null;
  payment_gateway: string | null;
  created_at: string;
  updated_at: string;
  profile?: { nome: string | null };
}

export default function AdminSubscriptionsPage() {
  const [expiringSubs, setExpiringSubs] = useState<SubscriptionRow[]>([]);
  const [expiredSubs, setExpiredSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactivateDialog, setReactivateDialog] = useState<SubscriptionRow | null>(null);
  const [reactivatePlan, setReactivatePlan] = useState("Awo");
  const [reactivateDays, setReactivateDays] = useState("30");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const now = new Date();
      const in30Days = new Date();
      in30Days.setDate(now.getDate() + 30);

      // Expiring in next 30 days
      const { data: expiring } = await supabase
        .from("subscriptions")
        .select("id, user_id, plan_name, status, current_period_end, payment_gateway, created_at, updated_at")
        .in("status", ["active", "trialing"])
        .not("current_period_end", "is", null)
        .gte("current_period_end", now.toISOString())
        .lte("current_period_end", in30Days.toISOString())
        .order("current_period_end", { ascending: true });

      // Expired
      const { data: expired } = await supabase
        .from("subscriptions")
        .select("id, user_id, plan_name, status, current_period_end, payment_gateway, created_at, updated_at")
        .eq("status", "expired")
        .order("current_period_end", { ascending: false })
        .limit(50);

      // Get profile names for all users
      const allUserIds = [
        ...(expiring || []).map(s => s.user_id),
        ...(expired || []).map(s => s.user_id),
      ];
      const uniqueIds = [...new Set(allUserIds)];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nome")
        .in("user_id", uniqueIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.nome]) || []);

      const addProfile = (sub: any): SubscriptionRow => ({
        ...sub,
        profile: { nome: nameMap.get(sub.user_id) || "Sem nome" },
      });

      setExpiringSubs((expiring || []).map(addProfile));
      setExpiredSubs((expired || []).map(addProfile));
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      toast.error("Erro ao carregar assinaturas");
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate() {
    if (!reactivateDialog) return;
    setProcessing(true);

    try {
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + parseInt(reactivateDays));

      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan_name: reactivatePlan,
          current_period_end: newEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", reactivateDialog.id);

      if (error) throw error;

      // Log the change
      await supabase.from("subscription_changes").insert({
        user_id: reactivateDialog.user_id,
        changed_by: (await supabase.auth.getUser()).data.user?.id || "",
        old_plan: reactivateDialog.plan_name,
        new_plan: reactivatePlan,
        billing_cycle: "manual",
        reason: `Reativação manual admin - ${reactivateDays} dias`,
      });

      toast.success("Assinatura reativada com sucesso!");
      setReactivateDialog(null);
      loadData();
    } catch (error: any) {
      toast.error("Erro ao reativar: " + error.message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleNotifyUser(sub: SubscriptionRow) {
    try {
      const { error } = await supabase.functions.invoke("notify-expiring-subscriptions");
      if (error) throw error;
      toast.success("Notificação de expiração enviada!");
    } catch (error: any) {
      toast.error("Erro ao enviar notificação: " + error.message);
    }
  }

  function daysUntilExpiry(date: string | null) {
    if (!date) return null;
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function ExpiryBadge({ date }: { date: string | null }) {
    const days = daysUntilExpiry(date);
    if (days === null) return <Badge variant="outline">Sem data</Badge>;
    if (days < 0) return <Badge variant="destructive">Expirado há {Math.abs(days)}d</Badge>;
    if (days <= 3) return <Badge variant="destructive">{days}d restantes</Badge>;
    if (days <= 7) return <Badge className="bg-orange-500 text-white">{days}d restantes</Badge>;
    return <Badge className="bg-yellow-500 text-white">{days}d restantes</Badge>;
  }

  const SubTable = ({ subs, showReactivate }: { subs: SubscriptionRow[]; showReactivate: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuário</TableHead>
          <TableHead>Plano</TableHead>
          <TableHead>Gateway</TableHead>
          <TableHead>Expira em</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subs.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              Nenhuma assinatura encontrada
            </TableCell>
          </TableRow>
        )}
        {subs.map((sub) => (
          <TableRow key={sub.id}>
            <TableCell className="font-medium">{sub.profile?.nome || "Sem nome"}</TableCell>
            <TableCell>
              <Badge variant="outline">{sub.plan_name}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {sub.payment_gateway || "—"}
            </TableCell>
            <TableCell>
              {sub.current_period_end
                ? format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: ptBR })
                : "—"}
            </TableCell>
            <TableCell>
              <ExpiryBadge date={sub.current_period_end} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                {!showReactivate && (
                  <Button size="sm" variant="outline" onClick={() => handleNotifyUser(sub)}>
                    <Send className="h-3 w-3 mr-1" />
                    Notificar
                  </Button>
                )}
                {showReactivate && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setReactivateDialog(sub);
                      setReactivatePlan(sub.plan_name !== "Gratuito" ? sub.plan_name : "Awo");
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reativar
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gestão de Assinaturas"
        description="Acompanhe assinaturas próximas de expirar e gerencie inadimplência"
      />

      <div className="container px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Expirando em 7 dias</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {expiringSubs.filter(s => (daysUntilExpiry(s.current_period_end) ?? 99) <= 7).length}
              </div>
              <p className="text-xs text-muted-foreground">assinaturas em risco</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Expirando em 30 dias</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{expiringSubs.length}</div>
              <p className="text-xs text-muted-foreground">assinaturas próximas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Expiradas</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiredSubs.length}</div>
              <p className="text-xs text-muted-foreground">últimas 50 expiradas</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="expiring">
          <TabsList>
            <TabsTrigger value="expiring" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Próximas de Expirar ({expiringSubs.length})
            </TabsTrigger>
            <TabsTrigger value="expired" className="gap-2">
              <XCircle className="h-4 w-4" />
              Expiradas ({expiredSubs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expiring">
            <Card>
              <CardHeader>
                <CardTitle>Assinaturas expirando nos próximos 30 dias</CardTitle>
                <CardDescription>
                  Envie notificações de renovação ou tome ações proativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                ) : (
                  <SubTable subs={expiringSubs} showReactivate={false} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expired">
            <Card>
              <CardHeader>
                <CardTitle>Assinaturas Expiradas</CardTitle>
                <CardDescription>
                  Reative manualmente assinaturas após confirmação de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                ) : (
                  <SubTable subs={expiredSubs} showReactivate={true} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reactivate Dialog */}
      <AlertDialog open={!!reactivateDialog} onOpenChange={() => setReactivateDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar Assinatura</AlertDialogTitle>
            <AlertDialogDescription>
              Reativando assinatura de <strong>{reactivateDialog?.profile?.nome}</strong>.
              Escolha o plano e duração.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={reactivatePlan} onValueChange={setReactivatePlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Awo">Awo</SelectItem>
                  <SelectItem value="Egbe">Egbe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração (dias)</Label>
              <Input
                type="number"
                value={reactivateDays}
                onChange={(e) => setReactivateDays(e.target.value)}
                min={1}
                max={365}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Nova expiração:{" "}
              {format(
                new Date(Date.now() + parseInt(reactivateDays || "30") * 86400000),
                "dd/MM/yyyy",
                { locale: ptBR }
              )}
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} disabled={processing}>
              {processing ? "Reativando..." : "Confirmar Reativação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
