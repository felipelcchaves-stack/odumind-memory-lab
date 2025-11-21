import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useChangelog } from '@/hooks/useChangelog';
import ChangelogModal from '@/components/ChangelogModal';
import ProductTour from '@/components/ProductTour';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Zap, BookOpen, Brain, Calendar, TrendingUp, Award, Home, Clock, Flame, Heart, Sparkles, FileText, Lightbulb } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BadgesDisplay from '@/components/BadgesDisplay';
import WeeklyRanking from '@/components/WeeklyRanking';
import AchievementsHistory from '@/components/AchievementsHistory';
import NotificationPrompt from '@/components/NotificationPrompt';
import { useNotifications } from '@/hooks/useNotifications';
import DashboardHeader from '@/components/DashboardHeader';
import UpgradeBanner from '@/components/UpgradeBanner';
import ForgettingRiskAlert from '@/components/ForgettingRiskAlert';
import { useSubscription } from '@/hooks/useSubscription';
import MemorizationStatusBadge from '@/components/MemorizationStatusBadge';
import StudyPlanProgress from '@/components/StudyPlanProgress';
import { FirstStepsWidget } from '@/components/FirstStepsWidget';
import { HelpTooltip } from '@/components/HelpTooltip';
import { FloatingHelp } from '@/components/FloatingHelp';
import { ReferralBanner } from '@/components/ReferralBanner';
import { ReferralWidget } from '@/components/ReferralWidget';
import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

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
  nextReview: {
    proxima_revisao: string;
    odu: { numero: number; nome: string };
  } | null;
  totalRituais: number;
  rituaisPraticados: number;
  totalRezas: number;
  rezasAprendidas: number;
  totalInvocacoes: number;
  invocacoesPraticadas: number;
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
  const { subscription, loading: subLoading } = useSubscription();
  const { isProfileComplete, loading: profileLoading, refetch: refetchProfile } = useProfileCompletion();
  const [achievementsHistory, setAchievementsHistory] = useState<any[]>([]);
  const hasScheduledNotifications = useRef(false);
  const { showModal, latestChangelog, markAsViewed, setShowModal } = useChangelog();
  const [hasCompletedFirstStudy, setHasCompletedFirstStudy] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Debug log para changelog
  useEffect(() => {
    console.log('[Dashboard] Estado do changelog:', { 
      showModal, 
      hasChangelog: !!latestChangelog,
      version: latestChangelog?.version
    });
  }, [showModal, latestChangelog]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Check profile completion
  useEffect(() => {
    if (!profileLoading && isProfileComplete === false) {
      setShowProfileModal(true);
    }
  }, [isProfileComplete, profileLoading]);

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const formatNextReviewDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 60) {
      return `Em ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Em ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `Em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
    }
  };

  const getMotivationalMessage = () => {
    if (!profile || !stats) return "Continue sua jornada de memorização dos Odu Ifá";

    const hour = new Date().getHours();
    const memorizedPercentage = Math.round((stats.memorizedCount / stats.totalOdus) * 100);
    const streak = profile.streak;
    const reviewsToday = stats.reviewTodayCount;

    // Incentivar exploração de rituais se tem progresso em Odu mas não praticou rituais
    if (memorizedPercentage > 10 && stats.rituaisPraticados === 0) {
      return "🕯️ Que tal explorar os Rituais sagrados agora? Você já domina os Odu!";
    }

    // Mensagens baseadas em streak
    if (streak >= 30) {
      return `🔥 ${streak} dias de sequência! Você é imparável na memorização dos Odu!`;
    }
    if (streak >= 14) {
      return `⚡ Incrível! ${streak} dias consecutivos estudando. Continue assim!`;
    }
    if (streak >= 7) {
      return `💪 ${streak} dias de dedicação! Sua disciplina está valendo a pena!`;
    }
    if (streak >= 3) {
      return `🌟 ${streak} dias seguidos! Você está construindo um hábito poderoso!`;
    }

    // Mensagens baseadas em progresso
    if (memorizedPercentage >= 90) {
      return `🎉 ${memorizedPercentage}% memorizado! Você está quase dominando todos os 256 Odu!`;
    }
    if (memorizedPercentage >= 75) {
      return `🚀 ${memorizedPercentage}% concluído! A reta final está chegando!`;
    }
    if (memorizedPercentage >= 50) {
      return `💎 Metade do caminho percorrido! ${memorizedPercentage}% dos Odu já são seus!`;
    }
    if (memorizedPercentage >= 25) {
      return `📚 ${memorizedPercentage}% memorizado! Continue nesse ritmo excepcional!`;
    }
    if (memorizedPercentage >= 10) {
      return `🌱 ${memorizedPercentage}% dos Odu já estão na sua memória! Ótimo começo!`;
    }

    // Mensagens baseadas em revisões pendentes
    if (reviewsToday > 10) {
      return `📖 ${reviewsToday} Odu aguardando revisão hoje. Vamos fortalecer sua memória!`;
    }
    if (reviewsToday > 5) {
      return `🎯 ${reviewsToday} revisões programadas para hoje. Sua memória agradece!`;
    }
    if (reviewsToday > 0) {
      return `✨ ${reviewsToday} Odu prontos para revisão. Mantenha o conhecimento fresco!`;
    }

    // Mensagens baseadas em horário (sem revisões ou streak)
    if (hour >= 5 && hour < 9) {
      return "☀️ Manhã perfeita para começar o dia com sabedoria dos Odu!";
    }
    if (hour >= 9 && hour < 12) {
      return "💡 Momento ideal para absorver novos conhecimentos dos Odu!";
    }
    if (hour >= 12 && hour < 15) {
      return "🌤️ Tarde tranquila para mergulhar nos ensinamentos de Ifá!";
    }
    if (hour >= 15 && hour < 18) {
      return "🎓 Fim de tarde perfeito para consolidar seu aprendizado!";
    }
    if (hour >= 18 && hour < 22) {
      return "🌙 Noite ideal para revisar e fortalecer sua memória!";
    }
    
    return "🌟 Comece sua jornada de memorização dos 256 Odu de Ifá!";
  };

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

      // Check and award achievements whenever dashboard loads
      await supabase.rpc("check_and_award_achievements", { 
        _user_id: user.id 
      });

      // Load memorization stats
      await loadMemorizationStats();

      // Check and award new achievements
      await supabase.rpc("check_and_award_achievements", { _user_id: user.id });
      
      // Check if user has completed any study
      const { count: studyCount } = await supabase
        .from('memorizacao')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('revisoes', 0);
      
      setHasCompletedFirstStudy((studyCount || 0) > 0);
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
          // Priorizar ultima_revisao se disponível e recente
          if (r.ultima_revisao) {
            const reviewDate = new Date(r.ultima_revisao);
            return reviewDate >= dayStart && reviewDate <= dayEnd;
          }
          
          // Fallback: Se ultima_revisao está null ou muito antigo, usar updated_at
          if (r.updated_at && r.revisoes > 0) {
            const updateDate = new Date(r.updated_at);
            return updateDate >= dayStart && updateDate <= dayEnd;
          }
          
          return false;
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

      // Get next review
      const nextReviewRecord = records
        .filter((r) => r.proxima_revisao && new Date(r.proxima_revisao) > today)
        .sort((a, b) => {
          const dateA = new Date(a.proxima_revisao || 0);
          const dateB = new Date(b.proxima_revisao || 0);
          return dateA.getTime() - dateB.getTime();
        })[0];

      const nextReview = nextReviewRecord ? {
        proxima_revisao: nextReviewRecord.proxima_revisao || '',
        odu: {
          numero: (nextReviewRecord.odu as any)?.numero || 0,
          nome: (nextReviewRecord.odu as any)?.nome || 'Desconhecido',
        }
      } : null;

      // Buscar stats de rituais/rezas/invocações
      const { data: contentTypesData } = await supabase
        .from('content_types')
        .select('id, slug')
        .in('slug', ['rituais', 'rezas', 'invocacoes']);

      const typeIds = {
        rituais: contentTypesData?.find(ct => ct.slug === 'rituais')?.id || '',
        rezas: contentTypesData?.find(ct => ct.slug === 'rezas')?.id || '',
        invocacoes: contentTypesData?.find(ct => ct.slug === 'invocacoes')?.id || '',
      };

      const [rituaisTotal, rituaisProg, rezasTotal, rezasProg, invocTotal, invocProg] = await Promise.all([
        supabase.from('ritual_content').select('*', { count: 'exact', head: true }),
        supabase.from('user_ritual_progress').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'praticado'),
        supabase.from('ritual_content').select('*', { count: 'exact', head: true })
          .eq('content_type_id', typeIds.rezas),
        supabase.from('user_ritual_progress').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'memorizado'),
        supabase.from('ritual_content').select('*', { count: 'exact', head: true })
          .eq('content_type_id', typeIds.invocacoes),
        supabase.from('user_ritual_progress').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'praticado'),
      ]);

      setStats({
        totalOdus: totalOdus || 0,
        memorizedCount,
        studyingCount,
        notStudiedCount,
        reviewTodayCount,
        averageMemoryStrength,
        weeklyProgress,
        upcomingReviews,
        nextReview,
        totalRituais: rituaisTotal.count || 0,
        rituaisPraticados: rituaisProg.count || 0,
        totalRezas: rezasTotal.count || 0,
        rezasAprendidas: rezasProg.count || 0,
        totalInvocacoes: invocTotal.count || 0,
        invocacoesPraticadas: invocProg.count || 0,
      });
    } catch (error) {
      console.error('Error loading memorization stats:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading || profileLoading) {
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
    <div className="min-h-screen bg-gradient-subtle" data-tour="welcome">
      <ProfileCompletionModal 
        open={showProfileModal} 
        onComplete={() => {
          setShowProfileModal(false);
          refetchProfile();
        }} 
      />
      <ProductTour />
      <DashboardHeader />

      {/* Main Content */}
      <main className="container px-4 py-8">
        {/* Upgrade Banner for Free Users */}
        {!subLoading && subscription && subscription.status === 'free' && (
          <UpgradeBanner />
        )}
        
        {/* Forgetting Risk Alert - Predição de Ebbinghaus */}
        {user && (
          <div className="mb-6">
            <ForgettingRiskAlert />
          </div>
        )}
        
        {/* First Steps Widget for new users */}
        {!hasCompletedFirstStudy && profile && (
          <div className="mb-8">
            <FirstStepsWidget 
              hasCompletedFirstStudy={hasCompletedFirstStudy}
              onStartStudy={() => navigate('/study')}
            />
          </div>
        )}
        
        {/* Referral Banner */}
        <div className="mb-6">
          <ReferralBanner />
        </div>

        {/* Widget "Biblioteca Completa" */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Biblioteca Completa Yorubá
                  </h3>
                  <p className="text-muted-foreground">
                    Acesse 256 Odu Ifá + {stats?.totalRituais || 0}+ Rituais + {stats?.totalRezas || 0}+ Rezas + {stats?.totalInvocacoes || 0}+ Invocações
                  </p>
                </div>
                <Button 
                  size="lg" 
                  variant="hero"
                  onClick={() => navigate('/biblioteca-yoruba')}
                >
                  Explorar Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            {getGreeting()}{profile?.nome ? `, ${profile.nome}` : ''}! 🌟
          </h2>
          <p className="text-muted-foreground">{getMotivationalMessage()}</p>
          
          {/* Quick Badges Display */}
          {user && (
            <div className="mt-4">
              <BadgesDisplay userId={user.id} compact />
            </div>
          )}
        </div>

        {/* Primary Stats Grid */}
        <div className="grid gap-6 mb-8">
          {/* Progresso Geral Multi-Conteúdo */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Seu Progresso na Biblioteca Yorubá</CardTitle>
              <CardDescription>Acompanhe seu avanço em todas as categorias de estudo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Odu Memorizados</p>
                  </div>
                  <p className="text-2xl font-bold">{stats?.memorizedCount || 0}/{stats?.totalOdus || 256}</p>
                  <Progress value={memorizedPercentage} />
                  <p className="text-xs text-muted-foreground">{memorizedPercentage.toFixed(0)}% completo</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <p className="text-sm text-muted-foreground">Rituais Praticados</p>
                  </div>
                  <p className="text-2xl font-bold">{stats?.rituaisPraticados || 0}/{stats?.totalRituais || 0}</p>
                  <Progress value={(stats?.rituaisPraticados || 0) / Math.max(stats?.totalRituais || 1, 1) * 100} />
                  <p className="text-xs text-muted-foreground">
                    {(((stats?.rituaisPraticados || 0) / Math.max(stats?.totalRituais || 1, 1)) * 100).toFixed(0)}% completo
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-muted-foreground">Rezas Aprendidas</p>
                  </div>
                  <p className="text-2xl font-bold">{stats?.rezasAprendidas || 0}/{stats?.totalRezas || 0}</p>
                  <Progress value={(stats?.rezasAprendidas || 0) / Math.max(stats?.totalRezas || 1, 1) * 100} />
                  <p className="text-xs text-muted-foreground">
                    {(((stats?.rezasAprendidas || 0) / Math.max(stats?.totalRezas || 1, 1)) * 100).toFixed(0)}% completo
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <p className="text-sm text-muted-foreground">Invocações</p>
                  </div>
                  <p className="text-2xl font-bold">{stats?.invocacoesPraticadas || 0}/{stats?.totalInvocacoes || 0}</p>
                  <Progress value={(stats?.invocacoesPraticadas || 0) / Math.max(stats?.totalInvocacoes || 1, 1) * 100} />
                  <p className="text-xs text-muted-foreground">
                    {(((stats?.invocacoesPraticadas || 0) / Math.max(stats?.totalInvocacoes || 1, 1)) * 100).toFixed(0)}% completo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8" data-tour="stats-cards">
          <Card data-tour="progress-bar" className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Quanto Você Já Memorizou</CardTitle>
                <HelpTooltip text="Esta porcentagem mostra quantos Odu você já memorizou completamente" />
              </div>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-3xl font-bold">{memorizedPercentage}%</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.memorizedCount || 0} de {stats?.totalOdus || 256}
                  </span>
                </div>
                <Progress value={memorizedPercentage} className="h-3" />
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex flex-col items-start gap-1 p-2 rounded-lg bg-muted/30">
                  <MemorizationStatusBadge status="nao_estudado" />
                  <span className="text-lg font-bold">
                    {stats?.notStudiedCount || 0}
                  </span>
                </div>
                <div className="flex flex-col items-start gap-1 p-2 rounded-lg bg-muted/30">
                  <MemorizationStatusBadge status="estudando" showProgress />
                  <span className="text-lg font-bold">
                    {stats?.studyingCount || 0}
                  </span>
                </div>
                <div className="flex flex-col items-start gap-1 p-2 rounded-lg bg-muted/30">
                  <MemorizationStatusBadge status="memorizado" />
                  <span className="text-lg font-bold">
                    {stats?.memorizedCount || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-tour="daily-reviews">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Para Revisar Hoje</CardTitle>
                <HelpTooltip text="Estes são os Odu que você precisa revisar hoje para não esquecer!" />
              </div>
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
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Quanto Você Sabe</CardTitle>
                <HelpTooltip text="Mostra o quanto você domina os Odu que está estudando" />
              </div>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.averageMemoryStrength || 0}%</div>
              <Progress value={stats?.averageMemoryStrength || 0} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Seu conhecimento médio
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
          {stats?.nextReview && (
            <Card className="md:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Próxima Revisão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">
                      {formatNextReviewDate(stats.nextReview.proxima_revisao)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Odu #{stats.nextReview.odu.numero} - {stats.nextReview.odu.nome}
                    </p>
                  </div>
                  <Button 
                    variant={new Date(stats.nextReview.proxima_revisao) > new Date() ? "outline" : "default"}
                    disabled={new Date(stats.nextReview.proxima_revisao) > new Date()}
                    onClick={() => new Date(stats.nextReview.proxima_revisao) <= new Date() && navigate("/study")}
                  >
                    {new Date(stats.nextReview.proxima_revisao) > new Date() 
                      ? "Aguarde a próxima revisão" 
                      : "Estudar Agora"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
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

        {/* Referral Widget */}
        <div className="mb-8">
          <ReferralWidget />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
          <Button 
            size="lg" 
            variant="hero" 
            className="text-lg px-8 py-6"
            onClick={() => navigate('/study')}
            data-tour="study-button"
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

        {/* Study Plan Progress */}
        <div className="mb-8">
          <StudyPlanProgress />
        </div>

        <div id="achievements-section" className="grid gap-6 md:grid-cols-2 mb-8" data-tour="badges">
          {/* Badges */}
          {user && <BadgesDisplay userId={user.id} />}

          {/* Achievements History */}
          {user && <AchievementsHistory />}
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
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

        {/* Cards de Categorias de Conteúdo */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => navigate('/biblioteca-yoruba?tab=odu')}
          >
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-semibold text-lg">256 Odu Ifá</p>
              <p className="text-sm text-muted-foreground mt-1">Explore os Odu sagrados</p>
              <div className="mt-3 text-xs text-muted-foreground">
                {stats?.memorizedCount || 0} memorizados
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => navigate('/biblioteca-yoruba?tab=rituais')}
          >
            <CardContent className="pt-6 text-center">
              <Flame className="h-8 w-8 text-orange-500 mx-auto mb-3" />
              <p className="font-semibold text-lg">{stats?.totalRituais || 0}+ Rituais</p>
              <p className="text-sm text-muted-foreground mt-1">Práticas sagradas</p>
              <div className="mt-3 text-xs text-muted-foreground">
                {stats?.rituaisPraticados || 0} praticados
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => navigate('/biblioteca-yoruba?tab=rezas')}
          >
            <CardContent className="pt-6 text-center">
              <Heart className="h-8 w-8 text-red-500 mx-auto mb-3" />
              <p className="font-semibold text-lg">{stats?.totalRezas || 0}+ Rezas</p>
              <p className="text-sm text-muted-foreground mt-1">Orações Yorubá</p>
              <div className="mt-3 text-xs text-muted-foreground">
                {stats?.rezasAprendidas || 0} aprendidas
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => navigate('/biblioteca-yoruba?tab=invocacoes')}
          >
            <CardContent className="pt-6 text-center">
              <Sparkles className="h-8 w-8 text-purple-500 mx-auto mb-3" />
              <p className="font-semibold text-lg">{stats?.totalInvocacoes || 0}+ Invocações</p>
              <p className="text-sm text-muted-foreground mt-1">Chamados sagrados</p>
              <div className="mt-3 text-xs text-muted-foreground">
                {stats?.invocacoesPraticadas || 0} praticadas
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Notification Prompt */}
      <NotificationPrompt />
      
      {/* Changelog Modal */}
      <ChangelogModal 
        open={showModal}
        onClose={() => setShowModal(false)}
        changelog={latestChangelog}
        onMarkAsViewed={markAsViewed}
      />
      
      {/* Floating Help Button */}
      <FloatingHelp />
    </div>
  );
}
