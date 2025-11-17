import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, BookOpen, Trophy, TrendingUp, Clock, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalStudySessions: number;
  totalMemorized: number;
  averageProgress: number;
  topOdus: Array<{ nome: string; numero: number; count: number }>;
  userActivity: Array<{ date: string; count: number }>;
  progressDistribution: Array<{ range: string; count: number }>;
}

export default function Analytics() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    }
  }, [isAdmin]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Active users (studied in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_study_date', sevenDaysAgo.toISOString());

      // Total study sessions from gamification logs
      const { count: totalStudySessions } = await supabase
        .from('gamification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_evento', 'sessao_estudo');

      // Total memorized Odus
      const { count: totalMemorized } = await supabase
        .from('memorizacao')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'memorizado');

      // Average progress
      const { data: memorizacaoData } = await supabase
        .from('memorizacao')
        .select('user_id, status');

      const userProgress = new Map<string, { memorized: number; total: number }>();
      memorizacaoData?.forEach((m) => {
        if (!userProgress.has(m.user_id)) {
          userProgress.set(m.user_id, { memorized: 0, total: 0 });
        }
        const progress = userProgress.get(m.user_id)!;
        progress.total++;
        if (m.status === 'memorizado') {
          progress.memorized++;
        }
      });

      let totalProgress = 0;
      userProgress.forEach((p) => {
        if (p.total > 0) {
          totalProgress += (p.memorized / p.total) * 100;
        }
      });
      const averageProgress = userProgress.size > 0 ? totalProgress / userProgress.size : 0;

      // Top 10 most studied Odus
      const { data: oduStats } = await supabase
        .from('memorizacao')
        .select('odu_id, odu(numero, nome)');

      const oduCounts = new Map<string, { nome: string; numero: number; count: number }>();
      oduStats?.forEach((stat) => {
        const odu = stat.odu as any;
        const key = stat.odu_id;
        if (!oduCounts.has(key)) {
          oduCounts.set(key, { nome: odu?.nome || 'Desconhecido', numero: odu?.numero || 0, count: 0 });
        }
        oduCounts.get(key)!.count++;
      });

      const topOdus = Array.from(oduCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // User activity over last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: activityData } = await supabase
        .from('gamification_logs')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('tipo_evento', 'sessao_estudo');

      const activityByDay = new Map<string, number>();
      activityData?.forEach((log) => {
        const date = new Date(log.created_at).toLocaleDateString('pt-BR');
        activityByDay.set(date, (activityByDay.get(date) || 0) + 1);
      });

      const userActivity = Array.from(activityByDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-14); // Last 14 days

      // Progress distribution
      const progressRanges = [
        { range: '0-20%', min: 0, max: 20, count: 0 },
        { range: '21-40%', min: 21, max: 40, count: 0 },
        { range: '41-60%', min: 41, max: 60, count: 0 },
        { range: '61-80%', min: 61, max: 80, count: 0 },
        { range: '81-100%', min: 81, max: 100, count: 0 },
      ];

      userProgress.forEach((p) => {
        if (p.total > 0) {
          const percentage = (p.memorized / p.total) * 100;
          const range = progressRanges.find((r) => percentage >= r.min && percentage <= r.max);
          if (range) range.count++;
        }
      });

      setData({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalStudySessions: totalStudySessions || 0,
        totalMemorized: totalMemorized || 0,
        averageProgress: Math.round(averageProgress),
        topOdus,
        userActivity,
        progressDistribution: progressRanges,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading || !isAdmin) {
    return null;
  }

  const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Métricas e insights de uso da plataforma</p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Key Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {data.activeUsers} ativos nos últimos 7 dias
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sessões de Estudo</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalStudySessions}</div>
                  <p className="text-xs text-muted-foreground">Total de sessões realizadas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Odus Memorizados</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalMemorized}</div>
                  <p className="text-xs text-muted-foreground">Total de Odus memorizados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.averageProgress}%</div>
                  <p className="text-xs text-muted-foreground">Média de progresso dos usuários</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Atividade</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.totalUsers > 0 ? Math.round((data.activeUsers / data.totalUsers) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Usuários ativos / Total</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Média de Sessões</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.totalUsers > 0 ? Math.round(data.totalStudySessions / data.totalUsers) : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Sessões por usuário</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              {/* Top Odus */}
              <Card>
                <CardHeader>
                  <CardTitle>Odus Mais Estudados</CardTitle>
                  <CardDescription>Top 10 Odus com mais interações</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.topOdus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="numero" 
                        label={{ value: 'Número do Odu', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis label={{ value: 'Estudos', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border rounded-lg p-2 shadow-lg">
                                <p className="font-semibold">{payload[0].payload.nome}</p>
                                <p className="text-sm text-muted-foreground">
                                  Odu {payload[0].payload.numero}
                                </p>
                                <p className="text-sm">
                                  {payload[0].value} estudos
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Progress Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Progresso</CardTitle>
                  <CardDescription>Usuários por faixa de progresso</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.progressDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ range, count, percent }) => 
                          count > 0 ? `${range}: ${count}` : ''
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {data.progressDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Atividade dos Últimos 14 Dias</CardTitle>
                <CardDescription>Número de sessões de estudo por dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.userActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Sessões"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
