import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { useFreePlanSettings } from '@/hooks/useFreePlanSettings';
import MemorizationStatusBadge from '@/components/MemorizationStatusBadge';
import StudyPlanProgress from '@/components/StudyPlanProgress';
import { DailyGuideWidget } from '@/components/DailyGuideWidget';
import { ActionCard } from '@/components/ActionCard';
import { GlossaryDialog } from '@/components/GlossaryDialog';
import { HelpTooltip } from '@/components/HelpTooltip';
import { FloatingHelp } from '@/components/FloatingHelp';
import { ReferralBanner } from '@/components/ReferralBanner';
import { ReferralWidget } from '@/components/ReferralWidget';
import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useContentFeatures } from '@/hooks/useContentFeatures';
import { CaminhoIfaMiniMap } from '@/components/CaminhoIfaMiniMap';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import { ReviewPrompt } from '@/components/ReviewPrompt';

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
  const { isFreePlanEnabled, loading: freePlanLoading } = useFreePlanSettings();
  const { isProfileComplete, loading: profileLoading, refetch: refetchProfile } = useProfileCompletion();
  const [achievementsHistory, setAchievementsHistory] = useState<any[]>([]);
  const hasScheduledNotifications = useRef(false);
  // Changelog removido - gerenciado globalmente no App.tsx
  const [hasCompletedFirstStudy, setHasCompletedFirstStudy] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const { simplifiedMode } = useAccessibility();
  const { isFeatureEnabled } = useContentFeatures();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Guard: Block access if free plan is disabled and user has no active subscription
  useEffect(() => {
    if (
      !authLoading && 
      !subLoading && 
      !freePlanLoading && 
      user && 
      !isFreePlanEnabled
    ) {
      const hasActiveSubscription = 
        subscription?.status === 'active' || 
        subscription?.status === 'trialing';
      
      if (!hasActiveSubscription) {
        navigate('/subscription?required=true');
      }
    }
  }, [user, authLoading, subLoading, freePlanLoading, subscription, isFreePlanEnabled, navigate]);

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

    // Incentivar exploração de rituais se tem progresso em Odu mas não praticou rituais (only if rituais is enabled)
    if (isFeatureEnabled('rituais') && memorizedPercentage > 10 && stats.rituaisPraticados === 0) {
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
      <DashboardHeader />

      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {/* Main Content */}
      <main className="container px-4 py-8">
        {/* Upgrade Banner for Free Users */}
        {!subLoading && subscription && subscription.status === 'free' && (
          <UpgradeBanner />
        )}
        
        {/* Forgetting Risk Alert - Predição de Ebbinghaus */}
        {!simplifiedMode && user && (
          <div className="mb-6">
            <ForgettingRiskAlert />
          </div>
        )}
        
        {/* Referral Banner */}
        {!simplifiedMode && (
          <div className="mb-6">
            <ReferralBanner />
          </div>
        )}

        {/* Review Prompt - aparece quando usuário atinge XP mínimo */}
        {!simplifiedMode && (
          <div className="mb-6">
            <ReviewPrompt />
          </div>
        )}

        {/* FASE 2: Card Principal "O Que Fazer Agora?" */}
        <div className="mb-8" data-tour="action-card">
          <ActionCard
            reviewCount={stats?.reviewTodayCount || 0}
            hasReviews={(stats?.reviewTodayCount || 0) > 0}
          />
        </div>
        
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2">
            {getGreeting()}{profile?.nome ? `, ${profile.nome}` : ''}! 🌟
          </h2>
          <p className="text-lg text-muted-foreground mb-4">{getMotivationalMessage()}</p>
          
          {/* Quick Badges Display */}
          {!simplifiedMode && user && (
            <div className="mt-4">
              <BadgesDisplay userId={user.id} compact />
            </div>
          )}
        </div>

        {/* FASE 2: Card Principal de Progresso Simplificado */}
        <Card className="mb-8 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-300" data-tour="progress-card">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-6">
              <p className="text-lg text-muted-foreground mb-2">🌟 Seu Progresso nos Odu Ifá</p>
              <p className="text-6xl font-bold text-primary mb-4">
                {stats?.memorizedCount || 0}
                <span className="text-3xl text-muted-foreground"> / 256</span>
              </p>
              <p className="text-xl mb-4">
                🎉 Parabéns! Você já domina {memorizedPercentage}% dos Odu!
              </p>
            </div>
            
            <Progress value={memorizedPercentage} className="h-6 mb-6" />
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-background/50">
                <p className="text-4xl font-bold">{stats?.notStudiedCount || 0}</p>
                <p className="text-base mt-2">Ainda Não Vistos</p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <p className="text-4xl font-bold text-blue-600">{stats?.studyingCount || 0}</p>
                <p className="text-base mt-2">Em Progresso</p>
              </div>
              <div className="p-4 rounded-lg bg-background/50">
                <p className="text-4xl font-bold text-green-600">{stats?.memorizedCount || 0}</p>
                <p className="text-base mt-2">Dominados! ✅</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FASE 5: Daily Guide Widget (Onboarding Permanente) */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div data-tour="daily-guide">
            <DailyGuideWidget
              reviewCount={stats?.reviewTodayCount || 0}
              hasStudiedToday={false}
              hasExploredRitual={false}
              hasPracticedPrayer={false}
            />
          </div>
          
          {/* Caminho de Ifá Mini Map */}
          <CaminhoIfaMiniMap />
        </div>

        {/* FASE 3: Cards de Stats com Legendas Claras */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8" data-tour="stats-cards">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-medium">Para Revisar Hoje</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">{stats?.reviewTodayCount || 0}</div>
              <p className="text-base text-muted-foreground">
                {stats?.reviewTodayCount === 0
                  ? '🎉 Você está em dia!'
                  : 'Odu aguardando revisão'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg font-medium">O Quanto Você Domina</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">{stats?.averageMemoryStrength || 0}%</div>
              <Progress value={stats?.averageMemoryStrength || 0} className="h-3 mb-2" />
              <p className="text-base text-muted-foreground">
                Seu conhecimento médio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg font-medium">Dias Seguidos Estudando</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold flex items-center gap-2 mb-2">
                {profile?.streak || 0} 🔥
              </div>
              <p className="text-base text-muted-foreground">
                Continue estudando para manter sua sequência
              </p>
            </CardContent>
          </Card>

          {!simplifiedMode && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <CardTitle className="text-lg font-medium">Pontos de Estudo</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-2">{profile?.xp || 0}</div>
                <p className="text-base text-muted-foreground">
                  Continue estudando para ganhar mais!
                </p>
              </CardContent>
            </Card>
          )}
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
                    onClick={() => new Date(stats.nextReview.proxima_revisao) <= new Date() && navigate("/caminho-ifa")}
                  >
                    {new Date(stats.nextReview.proxima_revisao) > new Date() 
                      ? "Aguarde a próxima revisão" 
                      : "Ir para Caminho de Ifá"}
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
        {!simplifiedMode && (
          <div className="mb-8">
            <ReferralWidget />
          </div>
        )}

        {/* FASE 4: Seções Avançadas (Collapsible) */}
        {!simplifiedMode && (
          <Collapsible defaultOpen={false} className="mb-8">
            <div className="flex justify-center mb-4">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2">
                  Ver Estatísticas Detalhadas
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-8">
              {/* Secondary Stats */}
              <div className="grid gap-6 md:grid-cols-3">
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
                          onClick={() => new Date(stats.nextReview.proxima_revisao) <= new Date() && navigate("/caminho-ifa")}
                        >
                          {new Date(stats.nextReview.proxima_revisao) > new Date() 
                            ? "Aguarde a próxima revisão" 
                            : "Estudar Agora"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Gamification Section */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Weekly Progress Chart */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Seus Estudos Esta Semana
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
              <StudyPlanProgress />

              <div id="achievements-section" className="grid gap-6 md:grid-cols-2" data-tour="badges">
                {/* Badges */}
                {user && <BadgesDisplay userId={user.id} />}

                {/* Achievements History */}
                {user && <AchievementsHistory />}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
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
                        {stats.upcomingReviews.slice(0, 3).map((review, index) => (
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
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* EXPLORAR CONTEÚDO - Cards Grandes de Categorias */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-4 text-center">📚 Explorar Conteúdo</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" data-tour="content-categories">
            <Card
              className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-2"
              onClick={() => navigate('/biblioteca-yoruba?tab=odu')}
            >
              <CardContent className="pt-8 pb-8 text-center">
                <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="font-bold text-xl mb-2">{stats?.totalOdus || 0} Odu Ifá</p>
                <p className="text-base text-muted-foreground mb-3">Explore os Odu sagrados</p>
                <div className="mt-4 p-2 bg-primary/10 rounded">
                  <p className="text-lg font-semibold">{stats?.memorizedCount || 0} dominados</p>
                </div>
              </CardContent>
            </Card>

            {isFeatureEnabled('rituais') && (
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-2"
                onClick={() => navigate('/biblioteca-yoruba?tab=rituais')}
              >
                <CardContent className="pt-8 pb-8 text-center">
                  <Flame className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                  <p className="font-bold text-xl mb-2">{stats?.totalRituais || 0}+ Rituais</p>
                  <p className="text-base text-muted-foreground mb-3">Práticas sagradas</p>
                  <div className="mt-4 p-2 bg-orange-500/10 rounded">
                    <p className="text-lg font-semibold">{stats?.rituaisPraticados || 0} praticados</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {isFeatureEnabled('rezas') && (
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-2"
                onClick={() => navigate('/biblioteca-yoruba?tab=rezas')}
              >
                <CardContent className="pt-8 pb-8 text-center">
                  <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="font-bold text-xl mb-2">{stats?.totalRezas || 0}+ Rezas</p>
                  <p className="text-base text-muted-foreground mb-3">Orações Yorubá</p>
                  <div className="mt-4 p-2 bg-red-500/10 rounded">
                    <p className="text-lg font-semibold">{stats?.rezasAprendidas || 0} aprendidas</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {isFeatureEnabled('invocacoes') && (
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-2"
                onClick={() => navigate('/biblioteca-yoruba?tab=invocacoes')}
              >
                <CardContent className="pt-8 pb-8 text-center">
                  <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                  <p className="font-bold text-xl mb-2">{stats?.totalInvocacoes || 0}+ Invocações</p>
                  <p className="text-base text-muted-foreground mb-3">Chamados sagrados</p>
                  <div className="mt-4 p-2 bg-purple-500/10 rounded">
                    <p className="text-lg font-semibold">{stats?.invocacoesPraticadas || 0} praticadas</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Notification Prompt */}
      <NotificationPrompt />
      
      {/* Changelog Modal removido - gerenciado globalmente no App.tsx */}
      
      {/* FASE 3: Glossário Flutuante */}
      <GlossaryDialog open={showGlossary} onOpenChange={setShowGlossary} />
      
      {/* Floating Help Button with Glossary */}
      <Button
        className="fixed bottom-6 right-6 rounded-full h-16 w-16 shadow-2xl z-50"
        size="icon"
        onClick={() => setShowGlossary(true)}
      >
        <HelpCircle className="h-8 w-8" />
      </Button>
    </div>
  );
}
