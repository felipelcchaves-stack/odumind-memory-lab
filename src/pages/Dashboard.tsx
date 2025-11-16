import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Zap, BookOpen, Brain, Calendar, TrendingUp, Award, Home } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BadgesDisplay from '@/components/BadgesDisplay';
import WeeklyRanking from '@/components/WeeklyRanking';
import NotificationPrompt from '@/components/NotificationPrompt';
import { useNotifications } from '@/hooks/useNotifications';
import DashboardHeader from '@/components/DashboardHeader';

interface ProfileData {
  xp: number;
  streak: number;
  meta_diaria: number;
  nome: string | null;
}

interface MemorizationStats {
  totalOdus: number;
  memorizedCount: number;
  studyingCount: number;
  notStudiedCount: number;
  reviewTodayCount: number;
  averageMemoryStrength: number;
  weeklyProgress: { date: string; reviews: number }[];
  upcomingReviews: Array<{
    odu_id: string;
    nome: string;
    numero: number;
    proxima_revisao: string;
    forca_memoria: number;
  }>;
}

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<MemorizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { 
    permission, 
    scheduleStreakReminder, 
    scheduleReviewReminder 
  } = useNotifications();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Schedule notifications when data is loaded
  useEffect(() => {
    if (profile && stats && permission.granted) {
      // Schedule streak reminder if user has a streak
      if (profile.streak > 0) {
        scheduleStreakReminder(profile.streak);
      }

      // Schedule review reminder if there are pending reviews
      if (stats.reviewTodayCount > 0) {
        scheduleReviewReminder(stats.reviewTodayCount);
      }
    }
  }, [profile, stats, permission.granted]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('xp, streak, meta_diaria, nome')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Load memorization stats
      await loadMemorizationStats();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMemorizationStats = async () => {
    if (!user) return;

    try {
      // Get total Odu count
      const { count: totalOdus } = await supabase
        .from('odu')
        .select('*', { count: 'exact', head: true });

      // Get user's memorization records
      const { data: memRecords } = await supabase
        .from('memorizacao')
        .select(`
          *,
          odu:odu_id (
            id,
            nome,
            numero
          )
        `)
        .eq('user_id', user.id);

      const records = memRecords || [];

      // Calculate stats
      const memorizedCount = records.filter((r) => r.status === 'memorizado').length;
      const studyingCount = records.filter((r) => r.status === 'estudando').length;
      const notStudiedCount = (totalOdus || 0) - records.length;

      // Reviews due today
      const today = new Date();
      const reviewTodayCount = records.filter((r) => {
        if (!r.proxima_revisao) return false;
        const reviewDate = new Date(r.proxima_revisao);
        return reviewDate <= today;
      }).length;

      // Average memory strength
      const totalStrength = records.reduce((sum, r) => sum + (r.forca_memoria || 0), 0);
      const averageMemoryStrength = records.length > 0 ? Math.round(totalStrength / records.length) : 0;

      // Weekly progress (last 7 days)
      const weeklyProgress = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const reviewsOnDay = records.filter((r) => {
          if (!r.ultima_revisao) return false;
          const reviewDate = new Date(r.ultima_revisao);
          return reviewDate >= dayStart && reviewDate <= dayEnd;
        }).length;

        weeklyProgress.push({
          date: format(date, 'EEE', { locale: ptBR }),
          reviews: reviewsOnDay,
        });
      }

      // Upcoming reviews (next 5)
      const upcomingReviews = records
        .filter((r) => r.proxima_revisao && new Date(r.proxima_revisao) > today)
        .sort((a, b) => {
          const dateA = new Date(a.proxima_revisao || 0);
          const dateB = new Date(b.proxima_revisao || 0);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 5)
        .map((r) => ({
          odu_id: r.odu_id,
          nome: (r.odu as any)?.nome || 'Desconhecido',
          numero: (r.odu as any)?.numero || 0,
          proxima_revisao: r.proxima_revisao || '',
          forca_memoria: r.forca_memoria,
        }));

      setStats({
        totalOdus: totalOdus || 0,
        memorizedCount,
        studyingCount,
        notStudiedCount,
        reviewTodayCount,
        averageMemoryStrength,
        weeklyProgress,
        upcomingReviews,
      });
    } catch (error) {
      console.error('Error loading memorization stats:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const memorizedPercentage = stats ? Math.round((stats.memorizedCount / stats.totalOdus) * 100) : 0;
  const dailyGoalPercentage = ((profile?.xp || 0) / (profile?.meta_diaria || 30)) * 100;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <DashboardHeader />

      {/* Main Content */}
      <main className="container px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Bem-vindo de volta{profile?.nome ? `, ${profile.nome}` : ''}! 🌟
          </h2>
          <p className="text-muted-foreground">Continue sua jornada de memorização dos Odu Ifá</p>
          
          {/* Quick Badges Display */}
          {user && (
            <div className="mt-4">
              <BadgesDisplay userId={user.id} compact />
            </div>
          )}
        </div>

        {/* Primary Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">% Memorizada</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{memorizedPercentage}%</div>
              <Progress value={memorizedPercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.memorizedCount || 0} de {stats?.totalOdus || 256} Odu memorizado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revisões Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.reviewTodayCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.reviewTodayCount === 0
                  ? 'Você está em dia! 🎉'
                  : 'Odu aguardando revisão'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Força Média</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.averageMemoryStrength || 0}%</div>
              <Progress value={stats?.averageMemoryStrength || 0} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Força de memória geral
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Streak</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                {profile?.streak || 0}
                <Badge variant="secondary">dias</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Estude hoje para manter seu streak
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">XP Total</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile?.xp || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">Continue estudando para ganhar mais XP</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estudando</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.studyingCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">Odu em progresso</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Não Estudados</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.notStudiedCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">Odu restantes</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
          <Button 
            size="lg" 
            variant="hero" 
            className="text-lg px-8 py-6"
            onClick={() => navigate('/study')}
          >
            <BookOpen className="mr-2 h-5 w-5" />
            {stats?.reviewTodayCount && stats.reviewTodayCount > 0
              ? `Revisar ${stats.reviewTodayCount} Odu`
              : 'Estudar Agora'}
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg px-8 py-6"
            onClick={() => navigate('/memory-palace')}
          >
            <Home className="mr-2 h-5 w-5" />
            Palácio da Memória
          </Button>
        </div>

        {/* Gamification Section */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Weekly Progress Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progresso Semanal
              </CardTitle>
              <CardDescription>Revisões nos últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {stats && stats.weeklyProgress.length > 0 ? (
                <div className="space-y-4">
                  {stats.weeklyProgress.map((day, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <span className="text-sm font-medium w-12">{day.date}</span>
                      <div className="flex-1">
                        <Progress value={(day.reviews / Math.max(...stats.weeklyProgress.map(d => d.reviews), 1)) * 100} />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">
                        {day.reviews}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Comece a estudar para ver seu progresso aqui
                </p>
              )}
            </CardContent>
          </Card>

          {/* Weekly Ranking */}
          <WeeklyRanking currentUserId={user?.id || ''} />
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Badges */}
          {user && <BadgesDisplay userId={user.id} />}

          {/* Upcoming Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximas Revisões
              </CardTitle>
              <CardDescription>Odu agendados para revisão</CardDescription>
            </CardHeader>
            <CardContent>
              {stats && stats.upcomingReviews.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcomingReviews.map((review, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => navigate(`/odu/${review.odu_id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{review.numero}</Badge>
                        <div>
                          <p className="text-sm font-medium">{review.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(review.proxima_revisao), "dd 'de' MMM", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={review.forca_memoria} className="w-16 h-2" />
                        <span className="text-xs text-muted-foreground w-8">
                          {review.forca_memoria}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma revisão agendada no momento
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/odu')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Biblioteca de Odu</p>
                  <p className="text-sm text-muted-foreground">Explore os {stats?.totalOdus || 256} Odu</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/study')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Sessão de Estudo</p>
                  <p className="text-sm text-muted-foreground">Flashcards e quizzes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Conquistas</p>
                  <p className="text-sm text-muted-foreground">Em breve</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Notification Prompt */}
      <NotificationPrompt />
    </div>
  );
}
