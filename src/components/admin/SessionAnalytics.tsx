import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  autoFinalizedSessions: number;
  completionRate: number;
  abandonmentRate: number;
  activeSessions: number;
}

export default function SessionAnalytics() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get all sessions from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select('ended_at, auto_finalized, started_at')
        .gte('started_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      const totalSessions = sessions?.length || 0;
      const completedSessions = sessions?.filter(s => s.ended_at !== null).length || 0;
      const autoFinalizedSessions = sessions?.filter(s => s.auto_finalized === true).length || 0;
      const abandonedSessions = autoFinalizedSessions;
      const activeSessions = sessions?.filter(s => s.ended_at === null).length || 0;
      
      const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
      const abandonmentRate = totalSessions > 0 ? Math.round((abandonedSessions / totalSessions) * 100) : 0;

      setStats({
        totalSessions,
        completedSessions,
        abandonedSessions,
        autoFinalizedSessions,
        completionRate,
        abandonmentRate,
        activeSessions,
      });
    } catch (error) {
      console.error('Error loading session stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Análise de Sessões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Análise de Sessões (Últimos 30 dias)
        </CardTitle>
        <CardDescription>
          Monitoramento de sessões de estudo e auto-finalização
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert for high abandonment rate */}
        {stats.abandonmentRate > 30 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Taxa de abandono alta ({stats.abandonmentRate}%). Considere verificar a experiência do usuário.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>Total de Sessões</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalSessions}</p>
          </div>

          <div className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Finalizadas</span>
            </div>
            <p className="text-3xl font-bold">{stats.completedSessions}</p>
            <Badge variant="default">{stats.completionRate}%</Badge>
          </div>

          <div className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>Auto-finalizadas</span>
            </div>
            <p className="text-3xl font-bold">{stats.autoFinalizedSessions}</p>
            <Badge variant={stats.abandonmentRate > 30 ? 'destructive' : 'secondary'}>
              {stats.abandonmentRate}%
            </Badge>
          </div>

          <div className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Ativas Agora</span>
            </div>
            <p className="text-3xl font-bold">{stats.activeSessions}</p>
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Insights</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {stats.completionRate >= 80 && (
              <li>✅ Excelente taxa de conclusão de sessões</li>
            )}
            {stats.abandonmentRate > 20 && stats.abandonmentRate <= 30 && (
              <li>⚠️ Taxa de abandono moderada - monitorar</li>
            )}
            {stats.abandonmentRate > 30 && (
              <li>🚨 Taxa de abandono alta - investigar causas</li>
            )}
            <li>
              🔄 Sistema de auto-finalização garante que {stats.autoFinalizedSessions} sessões sejam contabilizadas
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
