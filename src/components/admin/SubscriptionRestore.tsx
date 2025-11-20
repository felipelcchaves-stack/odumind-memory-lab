import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, AlertCircle, Check, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionChange {
  id: string;
  user_id: string;
  old_plan: string;
  new_plan: string;
  billing_cycle: string;
  reason: string | null;
  changed_by: string;
  created_at: string;
  user_email?: string;
}

export default function SubscriptionRestore() {
  const [changes, setChanges] = useState<SubscriptionChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadRecentChanges();
  }, []);

  const loadRecentChanges = async () => {
    try {
      setLoading(true);
      
      // Get subscription changes from last 7 days where plan went to Gratuito
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: changesData, error } = await supabase
        .from('subscription_changes')
        .select('*')
        .eq('new_plan', 'Gratuito')
        .neq('old_plan', 'Gratuito')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails
      if (changesData && changesData.length > 0) {
        const userIds = changesData.map(c => c.user_id);
        const { data: emailData } = await supabase.rpc('get_user_emails', {
          user_ids: userIds
        });

        const emailMap = new Map(emailData?.map((e: any) => [e.user_id, e.email]) || []);
        
        const enrichedChanges = changesData.map(change => ({
          ...change,
          user_email: emailMap.get(change.user_id)
        }));

        setChanges(enrichedChanges);
      } else {
        setChanges([]);
      }
    } catch (error) {
      console.error('Error loading changes:', error);
      toast.error('Erro ao carregar histórico de mudanças');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (change: SubscriptionChange) => {
    setRestoring(change.id);
    
    try {
      const { error } = await supabase.functions.invoke('admin-change-subscription', {
        body: {
          userId: change.user_id,
          newPlan: change.old_plan,
          billingCycle: change.billing_cycle,
          reason: `Restauração automática de plano anterior (${change.old_plan})`,
        }
      });

      if (error) throw error;

      toast.success(`Plano restaurado para ${change.old_plan}`);
      loadRecentChanges();
    } catch (error) {
      console.error('Error restoring subscription:', error);
      toast.error('Erro ao restaurar plano');
    } finally {
      setRestoring(null);
    }
  };

  const handleRestoreAll = async () => {
    if (!confirm(`Restaurar ${changes.length} planos? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setRestoring('all');
    let successCount = 0;
    let errorCount = 0;

    for (const change of changes) {
      try {
        const { error } = await supabase.functions.invoke('admin-change-subscription', {
          body: {
            userId: change.user_id,
            newPlan: change.old_plan,
            billingCycle: change.billing_cycle,
            reason: `Restauração em massa de plano anterior (${change.old_plan})`,
          }
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error('Error restoring subscription:', error);
        errorCount++;
      }
    }

    setRestoring(null);
    
    if (successCount > 0) {
      toast.success(`${successCount} planos restaurados com sucesso`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} erros ao restaurar planos`);
    }

    loadRecentChanges();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Restaurar Planos Sobrescritos</CardTitle>
          <CardDescription>Carregando histórico...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Restaurar Planos Sobrescritos
            </CardTitle>
            <CardDescription>
              Planos que foram alterados para Gratuito nos últimos 7 dias
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRecentChanges}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            {changes.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleRestoreAll}
                disabled={restoring === 'all'}
              >
                <Check className="h-4 w-4 mr-2" />
                Restaurar Todos ({changes.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma mudança recente encontrada</p>
            <p className="text-sm mt-1">
              Planos que foram alterados para Gratuito aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {changes.map((change) => (
              <div
                key={change.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{change.user_email}</span>
                    <Badge variant="outline" className="text-xs">
                      {change.user_id.slice(0, 8)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-orange-600">{change.old_plan}</span>
                    <span>→</span>
                    <span className="font-medium text-red-600">Gratuito</span>
                    <span className="text-xs">
                      ({format(new Date(change.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })})
                    </span>
                  </div>
                  {change.reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Motivo: {change.reason}
                    </p>
                  )}
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleRestore(change)}
                  disabled={restoring === change.id || restoring === 'all'}
                  className="ml-4"
                >
                  {restoring === change.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Restaurando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Restaurar para {change.old_plan}
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
