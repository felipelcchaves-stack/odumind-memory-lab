import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Lock, Clock } from "lucide-react";
import { toast } from "sonner";
import Flashcard from "@/components/Flashcard";
import Quiz from "@/components/Quiz";
import XPNotification from "@/components/XPNotification";
import BadgesDisplay from "@/components/BadgesDisplay";
import DashboardHeader from "@/components/DashboardHeader";
import { ProtectedContent } from "@/components/ProtectedContent";

interface Odu {
  id: string;
  numero: number;
  nome: string;
  texto_principal: string;
  verso: string | null;
  significado: string | null;
}

interface MemorizacaoRecord {
  id: string;
  odu_id: string;
  revisoes: number;
  facilidade: number;
  intervalo: number;
  forca_memoria: number;
}

interface QuizQuestion {
  oduId: string;
  numero: number;
  nome: string;
  correctAnswer: string;
  options: string[];
  type: "nome" | "numero";
}

interface SessionStats {
  cardsStudied: number;
  totalXP: number;
  startTime: number;
}

type StudyMode = "flashcard" | "quiz";

const FREE_LIMIT = 5; // Usuários gratuitos podem estudar os primeiros 5 Odus

export default function StudySession() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasActiveSubscription, loading: subscriptionLoading } = useSubscription();
  
  // Session state
  const [availableOdus, setAvailableOdus] = useState<Odu[]>([]);
  const [currentOdu, setCurrentOdu] = useState<Odu | null>(null);
  const [studiedInSession, setStudiedInSession] = useState<Set<string>>(new Set());
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    cardsStudied: 0,
    totalXP: 0,
    startTime: Date.now()
  });
  
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showXPNotification, setShowXPNotification] = useState(false);
  const [lastXPGain, setLastXPGain] = useState(0);
  const [currentMemorizationData, setCurrentMemorizationData] = useState<{
    revisoes: number;
    forca_memoria: number;
    status: string;
  }>({ revisoes: 0, forca_memoria: 0, status: "nao_estudado" });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchOdusForReview();
  }, [user]);

  async function fetchOdusForReview() {
    if (!user) return;

    try {
      const isActiveSubscription = hasActiveSubscription();
      
      // Fetch Odus that need review - increased to 50 cards
      const { data: memorizacaoData, error: memError } = await supabase
        .from("memorizacao")
        .select("odu_id, revisoes, facilidade, intervalo, forca_memoria, id")
        .eq("user_id", user.id)
        .or("proxima_revisao.is.null,proxima_revisao.lte.now()")
        .order("revisoes", { ascending: true })
        .limit(50);

      if (memError) throw memError;

      if (!memorizacaoData || memorizacaoData.length === 0) {
        // No Odus to review, fetch new ones
        let query = supabase.from("odu").select("*").order("numero", { ascending: true });
        
        // If free user, limit to first 5 Odus
        if (!isActiveSubscription) {
          query = query.lte("numero", FREE_LIMIT);
        }
        
        query = query.limit(30);
        const { data: newOdus, error: newError } = await query;

        if (newError) throw newError;
        setAvailableOdus(newOdus || []);
        
        // Select first random Odu
        if (newOdus && newOdus.length > 0) {
          selectRandomOdu(newOdus);
        }
      } else {
        // Fetch full Odu data
        const oduIds = memorizacaoData.map((m) => m.odu_id);
        let query = supabase.from("odu").select("*").in("id", oduIds);
        
        // If free user, filter to only first 5 Odus
        if (!isActiveSubscription) {
          query = query.lte("numero", FREE_LIMIT);
        }
        
        const { data: oduData, error: oduError } = await query;

        if (oduError) throw oduError;
        setAvailableOdus(oduData || []);
        
        // Select first random Odu
        if (oduData && oduData.length > 0) {
          selectRandomOdu(oduData);
        }
      }
    } catch (error) {
      console.error("Error fetching Odus for review:", error);
      toast.error("Erro ao carregar sessão de estudo");
    } finally {
      setLoading(false);
    }
  }

  async function selectRandomOdu(odusPool?: Odu[]) {
    const pool = odusPool || availableOdus;
    if (pool.length === 0) {
      setSessionComplete(true);
      return;
    }

    // Select random index
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selectedOdu = pool[randomIndex];
    
    setCurrentOdu(selectedOdu);
    setStudiedInSession(prev => new Set(prev).add(selectedOdu.id));
    
    // Load current memorization data for this Odu
    if (user) {
      const { data: memData } = await supabase
        .from("memorizacao")
        .select("revisoes, forca_memoria, status")
        .eq("user_id", user.id)
        .eq("odu_id", selectedOdu.id)
        .maybeSingle();
      
      if (memData) {
        setCurrentMemorizationData(memData);
      } else {
        setCurrentMemorizationData({ revisoes: 0, forca_memoria: 0, status: "nao_estudado" });
      }
    }
    
    // Randomize mode (flashcard or quiz)
    setMode(Math.random() > 0.5 ? "flashcard" : "quiz");
  }

  function handleEndSession() {
    setIsSessionActive(false);
    setSessionComplete(true);
  }

  async function handleFlashcardRate(difficulty: number) {
    if (!user || !currentOdu) return;

    const qualidade = difficulty; // 1=difícil, 3=médio, 5=fácil

    try {
      // Get current memorization record
      const { data: currentRecord } = await supabase
        .from("memorizacao")
        .select("*")
        .eq("user_id", user.id)
        .eq("odu_id", currentOdu.id)
        .maybeSingle();

      const revisoes = (currentRecord?.revisoes || 0) + 1;
      const facilidade = currentRecord?.facilidade || 2.5;
      const intervalo = currentRecord?.intervalo || 0;
      const newMemoryStrength = Math.min(100, (currentRecord?.forca_memoria || 0) + qualidade * 8);
      const newStatus = revisoes >= 3 && newMemoryStrength >= 60 ? "memorizado" : "estudando";

      // Calculate next review using SM-2 algorithm
      const { data: nextReview } = await supabase.rpc("calcular_proxima_revisao", {
        _facilidade: facilidade,
        _intervalo: intervalo,
        _qualidade: qualidade,
      });

      if (nextReview && nextReview.length > 0) {
        const { nova_facilidade, novo_intervalo, proxima_data } = nextReview[0];

        // Update memorization record
        await supabase
          .from("memorizacao")
          .upsert({
            user_id: user.id,
            odu_id: currentOdu.id,
            revisoes,
            ultima_revisao: new Date().toISOString(),
            proxima_revisao: proxima_data,
            facilidade: nova_facilidade,
            intervalo: novo_intervalo,
            forca_memoria: newMemoryStrength,
            status: newStatus,
          });

        // Calculate XP based on difficulty and performance
        const xp = qualidade * 10;
        setLastXPGain(xp);
        setShowXPNotification(true);
        
        // Update session stats
        setSessionStats(prev => ({
          ...prev,
          cardsStudied: prev.cardsStudied + 1,
          totalXP: prev.totalXP + xp
        }));

        // Get current profile
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("xp")
          .eq("user_id", user.id)
          .single();

        const newXp = (currentProfile?.xp || 0) + xp;

        // Update profile with new XP
        await supabase
          .from("profiles")
          .update({ xp: newXp })
          .eq("user_id", user.id);

        // Update streak
        await supabase.rpc("update_user_streak", { _user_id: user.id });

        // Check and award achievements
        await supabase.rpc("check_and_award_achievements", { _user_id: user.id });

        // Log XP gain
        await supabase.from("gamification_logs").insert({
          user_id: user.id,
          tipo_evento: "xp_ganho",
          valor: xp,
          detalhes: { odu_id: currentOdu.id, qualidade, odu_nome: currentOdu.nome },
        });

        // Check and award badges
        const { data: newBadges, error: badgeError } = await supabase.rpc("check_and_award_badges", { 
          _user_id: user.id 
        });

        // Check and award achievements
        await supabase.rpc("check_and_award_achievements", { 
          _user_id: user.id 
        });

        // Check if new badges were awarded
        const { data: recentBadges } = await supabase
          .from("user_badges")
          .select(`
            badge_id,
            badges (nome, icon)
          `)
          .eq("user_id", user.id)
          .gte("conquistado_em", new Date(Date.now() - 5000).toISOString());

        if (recentBadges && recentBadges.length > 0) {
          recentBadges.forEach((badge: any) => {
            toast.success(
              `🎉 Novo badge conquistado: ${badge.badges.icon} ${badge.badges.nome}!`,
              { duration: 5000 }
            );
          });
        }

        // Check if new achievements were unlocked
        const { data: recentAchievements } = await supabase
          .from("conquistas")
          .select("*")
          .eq("user_id", user.id)
          .gte("conquistado_em", new Date(Date.now() - 5000).toISOString());

        if (recentAchievements && recentAchievements.length > 0) {
          recentAchievements.forEach((conquista: any) => {
            toast.success(
              `${conquista.icone} Conquista desbloqueada: ${conquista.titulo}!`,
              { duration: 5000 }
            );
          });
        }
      }

      // Select next random card
      selectRandomOdu();
    } catch (error) {
      console.error("Error updating memorization:", error);
      toast.error("Erro ao atualizar progresso");
    }
  }

  async function handleQuizAnswer(correct: boolean) {
    if (!user) return;

    const qualidade = correct ? 5 : 1;
    await handleFlashcardRate(qualidade);
  }

  const generateQuizQuestion = useMemo((): QuizQuestion | null => {
    if (!currentOdu || !availableOdus || availableOdus.length < 4) return null;
    
    const type: "nome" | "numero" = Math.random() > 0.5 ? "nome" : "numero";
    
    // Get wrong answers
    const otherOdus = availableOdus.filter((o) => o.id !== currentOdu.id);
    const wrongAnswers = otherOdus
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((o) => (type === "nome" ? o.nome : `#${o.numero}`));

    const correctAnswer = type === "nome" ? currentOdu.nome : `#${currentOdu.numero}`;
    const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

    return {
      oduId: currentOdu.id,
      numero: currentOdu.numero,
      nome: currentOdu.nome,
      correctAnswer,
      options,
      type,
    };
  }, [availableOdus, currentOdu]);

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const sessionDuration = Date.now() - sessionStats.startTime;

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparando sessão de estudo...</p>
        </div>
      </div>
    );
  }

  // Show upgrade screen if current Odu is premium and user is free
  if (currentOdu && currentOdu.numero > FREE_LIMIT && !hasActiveSubscription()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-center">Desbloqueie mais Odu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              Você completou os {FREE_LIMIT} Odu gratuitos! 
              O Odu #{currentOdu?.numero} - {currentOdu?.nome} é conteúdo premium.
            </p>
            <p className="text-sm text-center font-medium">
              Assine Premium para acessar todos os 256 Odu Ifá e acelerar seu aprendizado!
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate("/subscription")} className="w-full">
                Ver Planos
              </Button>
              <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full">
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (availableOdus.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Nenhum Odu para revisar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Você está em dia com suas revisões! Volte mais tarde ou explore a biblioteca.
            </p>
            <Button onClick={() => navigate("/odu")} className="w-full">
              Ir para Biblioteca
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center">
                <Trophy className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-center text-3xl">Sessão Completa!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-3">
              <h3 className="text-lg font-semibold">Estatísticas da Sessão</h3>
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  📚 {sessionStats.cardsStudied} cards revisados
                </p>
                <p className="text-muted-foreground">
                  ⏱️ Tempo total: {formatDuration(sessionDuration)}
                </p>
              </div>
              
              <div className="py-6">
                <div className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-primary">
                  <span className="text-5xl font-bold text-primary-foreground">+{sessionStats.totalXP}</span>
                  <span className="text-xl text-primary-foreground">XP</span>
                </div>
              </div>
              
              {/* Show badges earned during session */}
              {user && <BadgesDisplay userId={user.id} compact />}
            </div>
            <div className="space-y-2">
              <Button onClick={() => navigate("/dashboard")} className="w-full" variant="hero" size="lg">
                Voltar ao Dashboard
              </Button>
              <Button onClick={() => window.location.reload()} className="w-full" variant="outline" size="lg">
                Nova Sessão
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safety check - if no valid Odu, show message
  if (!currentOdu) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Nenhum Odu Disponível</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              Não há Odus disponíveis para estudo no momento.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedContent>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <XPNotification 
          xp={lastXPGain} 
          show={showXPNotification} 
          onComplete={() => setShowXPNotification(false)} 
        />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header with Session Stats */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>

          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h1 className="text-3xl font-bold">Sessão de Memorização</h1>
              <Button onClick={handleEndSession} variant="destructive" size="lg">
                Encerrar Sessão
              </Button>
            </div>
            
            {/* Session Stats */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" className="text-base px-4 py-2">
                📚 {sessionStats.cardsStudied} cards estudados
              </Badge>
              <Badge variant="secondary" className="text-base px-4 py-2">
                <Clock className="h-4 w-4 mr-1" />
                {formatDuration(sessionDuration)}
              </Badge>
              <Badge variant="secondary" className="text-base px-4 py-2">
                ⭐ {sessionStats.totalXP} XP ganho
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              Continue estudando até se sentir confiante
            </p>
          </div>
        </div>

        {/* Study Content */}
        {mode === "flashcard" ? (
          <Flashcard
            numero={currentOdu.numero}
            nome={currentOdu.nome}
            texto={currentOdu.texto_principal}
            verso={currentOdu.verso}
            onRate={handleFlashcardRate}
            currentRevisoes={currentMemorizationData.revisoes}
            currentStrength={currentMemorizationData.forca_memoria}
            status={currentMemorizationData.status}
          />
        ) : generateQuizQuestion ? (
          <Quiz question={generateQuizQuestion} onAnswer={handleQuizAnswer} />
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Carregando pergunta...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </ProtectedContent>
  );
}
