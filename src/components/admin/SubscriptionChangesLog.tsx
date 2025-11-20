import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Clock, User, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Papa from 'papaparse';
import { toast } from 'sonner';

interface SubscriptionChange {
  id: string;
  user_id: string;
  changed_by: string;
  old_plan: string;
  new_plan: string;
  old_stripe_subscription_id: string | null;
  new_stripe_subscription_id: string | null;
  billing_cycle: 'monthly' | 'annual';
  reason: string | null;
  stripe_response: any;
  created_at: string;
  user_email?: string;
  admin_email?: string;
}

export function SubscriptionChangesLog() {
  const [changes, setChanges] = useState<SubscriptionChange[]>([]);
  const [filteredChanges, setFilteredChanges] = useState<SubscriptionChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');

  useEffect(() => {
    loadChanges();
  }, []);

  useEffect(() => {
    filterChanges();
  }, [changes, searchTerm, planFilter]);

  async function loadChanges() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('subscription_changes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar emails dos usuários
      if (data && data.length > 0) {
        const userIds = [...new Set([
          ...data.map(c => c.user_id),
          ...data.map(c => c.changed_by)
        ])];

        const { data: emails } = await supabase.rpc('get_user_emails', {
          user_ids: userIds
        });

        const emailMap = new Map(emails?.map((e: any) => [e.user_id, e.email]) || []);

        const changesWithEmails: SubscriptionChange[] = data.map(change => ({
          ...change,
          billing_cycle: change.billing_cycle as 'monthly' | 'annual',
          user_email: emailMap.get(change.user_id) || 'Email não encontrado',
          admin_email: emailMap.get(change.changed_by) || 'Admin'
        }));

        setChanges(changesWithEmails);
      } else {
        setChanges([]);
      }
    } catch (error) {
      console.error('Error loading subscription changes:', error);
      toast.error('Erro ao carregar histórico de mudanças');
    } finally {
      setLoading(false);
    }
  }

  function filterChanges() {
    let filtered = changes;

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(change =>
        change.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de plano
    if (planFilter !== 'all') {
      filtered = filtered.filter(change =>
        change.new_plan === planFilter || change.old_plan === planFilter
      );
    }

    setFilteredChanges(filtered);
  }

  function exportToCSV() {
    const csvData = filteredChanges.map(change => ({
      'Data': format(new Date(change.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Usuário': change.user_email,
      'Plano Anterior': change.old_plan,
      'Novo Plano': change.new_plan,
      'Ciclo': change.billing_cycle === 'monthly' ? 'Mensal' : 'Anual',
      'Alterado por': change.admin_email,
      'Motivo': change.reason || 'N/A',
      'Stripe Subscription ID': change.new_stripe_subscription_id || 'N/A'
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `subscription_changes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('CSV exportado com sucesso!');
  }

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'premium':
        return 'default';
      case 'profissional':
        return 'secondary';
      case 'família':
        return 'success';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Alterações de Assinatura
            </CardTitle>
            <CardDescription>
              Registro completo de todas as mudanças de plano realizadas por administradores
            </CardDescription>
          </div>
          <Button onClick={exportToCSV} disabled={filteredChanges.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário, admin ou motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              <SelectItem value="Gratuito">Gratuito</SelectItem>
              <SelectItem value="Premium">Premium</SelectItem>
              <SelectItem value="Profissional">Profissional</SelectItem>
              <SelectItem value="Família">Família</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        {filteredChanges.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhuma alteração encontrada</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Alteração</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Alterado por</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChanges.map((change) => (
                  <TableRow key={change.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(change.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{change.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPlanBadgeVariant(change.old_plan)}>
                          {change.old_plan}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={getPlanBadgeVariant(change.new_plan)}>
                          {change.new_plan}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {change.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {change.admin_email}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {change.reason || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
