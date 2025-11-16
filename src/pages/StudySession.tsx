import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy } from "lucide-react";
import { toast } from "sonner";
import Flashcard from "@/components/Flashcard";
import Quiz from "@/components/Quiz";
import XPNotification from "@/components/XPNotification";
import BadgesDisplay from "@/components/BadgesDisplay";
import DashboardHeader from "@/components/DashboardHeader";

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

type StudyMode = "flashcard" | "quiz";

export default function StudySession() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [odus, setOdus] = useState<Odu[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [showXPNotification, setShowXPNotification] = useState(false);
  const [lastXPGain, setLastXPGain] = useState(0);

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
      // Fetch Odus that need review
      const { data: memorizacaoData, error: memError } = await supabase
        .from("memorizacao")
        .select("odu_id, revisoes, facilidade, intervalo, forca_memoria, id")
        .eq("user_id", user.id)
        .or("proxima_revisao.is.null,proxima_revisao.lte.now()")
        .order("revisoes", { ascending: true })
        .limit(10);

      if (memError) throw memError;

      if (!memorizacaoData || memorizacaoData.length === 0) {
        // No Odus to review, fetch new ones
        const { data: newOdus, error: newError } = await supabase
          .from("odu")
          .select("*")
          .limit(5);

        if (newError) throw newError;
        setOdus(newOdus || []);
      } else {
        // Fetch full Odu data
        const oduIds = memorizacaoData.map((m) => m.odu_id);
        const { data: oduData, error: oduError } = await supabase
          .from("odu")
          .select("*")
          .in("id", oduIds);

        if (oduError) throw oduError;
        setOdus(oduData || []);
      }
    } catch (error) {
      console.error("Error fetching Odus for review:", error);
      toast.error("Erro ao carregar sessão de estudo");
    } finally {
      setLoading(false);
    }
  }

  async function handleFlashcardRate(difficulty: number) {
    if (!user) return;

    const currentOdu = odus[currentIndex];
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
      const newMemoryStrength = Math.min(100, (currentRecord?.forca_memoria || 0) + qualidade * 5);
      const newStatus = revisoes >= 3 && newMemoryStrength >= 80 ? "memorizado" : "estudando";

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
        setXpGained((prev) => prev + xp);
        setLastXPGain(xp);
        setShowXPNotification(true);

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
      }

      moveToNext();
    } catch (error) {
      console.error("Error updating memorization:", error);
      toast.error("Erro ao atualizar progresso");
    }
  }

  async function handleQuizAnswer(correct: boolean) {
    if (!user) return;

    const currentOdu = odus[currentIndex];
    const qualidade = correct ? 5 : 1;

    await handleFlashcardRate(qualidade);
  }

  function moveToNext() {
    if (currentIndex < odus.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setMode(Math.random() > 0.5 ? "flashcard" : "quiz");
    } else {
      setSessionComplete(true);
    }
  }

  function generateQuizQuestion(): QuizQuestion {
    const currentOdu = odus[currentIndex];
    const type: "nome" | "numero" = Math.random() > 0.5 ? "nome" : "numero";
    
    // Get wrong answers
    const otherOdus = odus.filter((o) => o.id !== currentOdu.id);
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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparando sessão de estudo...</p>
        </div>
      </div>
    );
  }

  if (odus.length === 0) {
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
      <div className="min-h-screen bg-background flex items-center justify-center">
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
              <p className="text-muted-foreground">
                Você revisou {odus.length} Odu{odus.length > 1 ? "s" : ""}
              </p>
              <div className="py-6">
                <div className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-primary">
                  <span className="text-5xl font-bold text-primary-foreground">+{xpGained}</span>
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

  const currentOdu = odus[currentIndex];
  const progress = ((currentIndex + 1) / odus.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <XPNotification 
        xp={lastXPGain} 
        show={showXPNotification} 
        onComplete={() => setShowXPNotification(false)} 
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sair da Sessão
          </Button>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Sessão de Memorização</h1>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {currentIndex + 1} / {odus.length}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
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
          />
        ) : (
          <Quiz question={generateQuizQuestion()} onAnswer={handleQuizAnswer} />
        )}
      </div>
    </div>
  );
}
