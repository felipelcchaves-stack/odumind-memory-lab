import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Trophy, Lock, Clock, TrendingUp, Zap, Brain, Home, RotateCcw, CheckCircle, XCircle, Target } from "lucide-react";
import { toast } from "sonner";
import confetti from 'canvas-confetti';
import Flashcard from "@/components/Flashcard";
import OduPresentation from "@/components/OduPresentation";
import Quiz from "@/components/Quiz";
import ClozeExercise from "@/components/ClozeExercise";
import DragDropWords from "@/components/DragDropWords";
import { SentenceOrderExercise } from "@/components/SentenceOrderExercise";
import XPNotification from "@/components/XPNotification";
import BadgesDisplay from "@/components/BadgesDisplay";
import DashboardHeader from "@/components/DashboardHeader";
import { ProtectedContent } from "@/components/ProtectedContent";
import { SessionControls } from "@/components/SessionControls";
import { StoryModeToggle } from "@/components/StoryModeToggle";
import {
  calculateLearningProfile,
  calculateAdaptiveInterval,
  prioritizeOdusForReview,
  createInterleavedMix,
  determineStudyBlock,
  predictForgetProbability,
  type UserLearningProfile,
  type SessionMetrics
} from "@/lib/adaptiveLearning";
import {
  calculateUnlockProgress,
  startStudySession,
  endStudySession,
  type UnlockProgress
} from "@/lib/learningAnalytics";
import { useExerciseMonitoring } from "@/hooks/useExerciseMonitoring";

interface Odu {
  id: string;
  numero: number;
  nome: string;
  texto_principal: string;
  verso: string | null;
  verso_resumido: string | null;
  significado: string | null;
  exemplos_praticos: string | null;
  tags: string[] | null;
  contexto_historico?: string | null;
  personagens?: string | null;
  tema_principal?: string | null;
  tema_secundario?: string | null;
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
  type: "nome" | "verso_para_nome" | "nome_para_verso" | "verso_para_significado" | "aplicacao_pratica";
  versoResumido?: string;
  significado?: string;
  context?: string;
  explanation?: string;
}

interface SessionStats {
  cardsStudied: number;
  totalXP: number;
  startTime: number;
}

type StudyMode = "flashcard" | "quiz" | "cloze" | "dragdrop" | "sentence-order";

const FREE_LIMIT = 5; // Limite para usuários gratuitos (agora progressivo)

interface PhaseInfo {
  id: string;
  nome: string;
  slug: string;
  odus_incluidos: number[];
}

export default function StudySession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { hasActiveSubscription, loading: subscriptionLoading } = useSubscription();
  const { isAdmin, isColaborador, loading: adminLoading } = useAdmin();
  
  // Phase context or single Odu mode
  const faseSlug = searchParams.get('fase');
  const singleOduId = searchParams.get('odu'); // Novo: modo de Odu individual
  const isSingleOduMode = !!singleOduId;
  const sessionMode = searchParams.get('mode'); // 'review' = só revisões pendentes
  const isReviewOnlyMode = sessionMode === 'review';
  const [currentPhaseInfo, setCurrentPhaseInfo] = useState<PhaseInfo | null>(null);
  const [phaseLoading, setPhaseLoading] = useState(true);
  
  // Single Odu mode state - LOOP CONTÍNUO
  const [singleOduExerciseIndex, setSingleOduExerciseIndex] = useState(0);
  const [loopCount, setLoopCount] = useState(0); // Contador de ciclos completados
  const [viableExercises, setViableExercises] = useState<StudyMode[]>([]); // Exercícios viáveis para este Odu
  const [currentFlashcardFocus, setCurrentFlashcardFocus] = useState<'verso' | 'significado' | 'texto'>('verso'); // Variação de conteúdo
  
  // Core session state
  const [availableOdus, setAvailableOdus] = useState<Odu[]>([]);
  const [currentOdu, setCurrentOdu] = useState<Odu | null>(null);
  const [studiedInSession, setStudiedInSession] = useState<Set<string>>(new Set());
  const { logModeFallback } = useExerciseMonitoring();
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    cardsStudied: 0,
    totalXP: 0,
    startTime: Date.now()
  });
  const [sessionRounds, setSessionRounds] = useState(0);
  const [isRecycling, setIsRecycling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [autoSaveActive, setAutoSaveActive] = useState(true);
  
  // Learning intelligence state
  const [userProfile, setUserProfile] = useState<UserLearningProfile | null>(null);
  const [unlockProgress, setUnlockProgress] = useState<UnlockProgress | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics>({
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    totalCards: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    averageResponseTime: 0,
    sessionStartTime: new Date()
  });
  const [cardStartTime, setCardStartTime] = useState<number>(0);
  const [storyMode, setStoryMode] = useState(false);
  const [hasShownFirstOduCelebration, setHasShownFirstOduCelebration] = useState(false);
  
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [loading, setLoading] = useState(true);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false); // Proteção anti-clique-duplo
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showXPNotification, setShowXPNotification] = useState(false);
  const [lastXPGain, setLastXPGain] = useState(0);
  const [currentMemorizationData, setCurrentMemorizationData] = useState<{
    revisoes: number;
    forca_memoria: number;
    status: string;
  }>({ revisoes: 0, forca_memoria: 0, status: "nao_estudado" });
  const [nextReview, setNextReview] = useState<{
    proxima_revisao: string;
    odu: { numero: number; nome: string };
  } | null>(null);
  
  // Track total Odus in database for low-odu mode detection
  const [totalOdusInDb, setTotalOdusInDb] = useState(0);
  const isLowOduMode = totalOdusInDb > 0 && totalOdusInDb < 5;
  
  // Presentation mode state - for first contact with new Odus
  const [isShowingPresentation, setIsShowingPresentation] = useState(false);

  // Phase progress for completion screen
  const [phaseProgress, setPhaseProgress] = useState<{ memorized: number; total: number } | null>(null);

  // Calculate accuracy rate
  const accuracyRate = sessionMetrics.totalCards > 0 
    ? Math.round((sessionMetrics.correctAnswers / sessionMetrics.totalCards) * 100) 
    : 0;

  // Trigger confetti when session completes
  useEffect(() => {
    if (sessionComplete && sessionStats.cardsStudied > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [sessionComplete, sessionStats.cardsStudied]);

  // Fetch phase progress when session completes
  useEffect(() => {
    async function fetchPhaseProgress() {
      if (!sessionComplete || !user || !currentPhaseInfo) return;
      
      try {
        const phaseOduNumbers = currentPhaseInfo.odus_incluidos;
        
        const { data: phaseOdus } = await supabase
          .from('odu')
          .select('id')
          .in('numero', phaseOduNumbers);
        
        if (!phaseOdus) return;
        
        const phaseOduIds = phaseOdus.map(o => o.id);
        
        const { count } = await supabase
          .from('memorizacao')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'memorizado')
          .in('odu_id', phaseOduIds);
        
        setPhaseProgress({
          memorized: count || 0,
          total: phaseOduNumbers.length
        });
      } catch (error) {
        console.error('Error fetching phase progress:', error);
      }
    }
    
    fetchPhaseProgress();
  }, [sessionComplete, user, currentPhaseInfo]);

  // Load phase info from slug OR single Odu mode
  useEffect(() => {
    async function loadPhaseInfo() {
      // Modo Odu Individual: não precisa de fase
      if (isSingleOduMode) {
        setPhaseLoading(false);
        return;
      }

      if (!faseSlug) {
        setPhaseLoading(false);
        return;
      }

      try {
        const { data: phase, error } = await supabase
          .from('learning_phases')
          .select('id, nome, slug, odus_incluidos')
          .eq('slug', faseSlug)
          .single();

        if (error || !phase) {
          console.error('Fase não encontrada:', faseSlug);
          toast.error('Fase não encontrada');
          navigate('/caminho-ifa');
          return;
        }

        setCurrentPhaseInfo(phase);
      } catch (err) {
        console.error('Erro ao carregar fase:', err);
      } finally {
        setPhaseLoading(false);
      }
    }

    loadPhaseInfo();
  }, [faseSlug, isSingleOduMode, navigate]);

  // Redirect if no phase parameter AND not in single Odu mode
  useEffect(() => {
    if (!phaseLoading && !faseSlug && !isSingleOduMode && user) {
      toast.info('Selecione uma fase no Caminho de Ifá para estudar');
      navigate('/caminho-ifa');
    }
  }, [phaseLoading, faseSlug, isSingleOduMode, user, navigate]);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    
    // Wait for admin role check and phase to load
    if (adminLoading || phaseLoading) {
      console.log('⏳ Aguardando verificação de roles ou fase...');
      return;
    }

    // Single Odu mode: load just that Odu
    if (isSingleOduMode && singleOduId) {
      console.log('🎯 Modo Odu Individual:', singleOduId);
      initializeSingleOduSession(singleOduId);
      return;
    }

    // Only initialize if we have a valid phase
    if (!currentPhaseInfo) {
      return;
    }

    console.log('✅ Roles carregadas:', { isAdmin, isColaborador, fase: currentPhaseInfo.nome });
    initializeSession();
  }, [user, adminLoading, phaseLoading, currentPhaseInfo, isSingleOduMode, singleOduId]);

  // Auto-save session on unmount or page close
  useEffect(() => {
    return () => {
      // Cleanup: Auto-save session when component unmounts
      if (sessionId && user && isSessionActive && sessionStats.cardsStudied > 0) {
        console.log('🔄 Auto-salvando sessão ao sair...');
        endStudySession(
          sessionId,
          sessionStats.cardsStudied,
          sessionMetrics.correctAnswers || 0,
          sessionMetrics.wrongAnswers || 0,
          sessionMetrics.averageResponseTime || 0
        ).catch(error => {
          console.error('Erro ao auto-salvar sessão:', error);
        });
      }
    };
  }, [sessionId, isSessionActive, sessionStats.cardsStudied, sessionMetrics]);

  // Auto-save session before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sessionId && user && isSessionActive && sessionStats.cardsStudied > 0) {
        console.log('🔄 Auto-salvando sessão antes de fechar página...');
        // Usar sendBeacon para garantir que a requisição seja enviada
        const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/study_sessions?id=eq.${sessionId}`;
        const payload = JSON.stringify({
          ended_at: new Date().toISOString(),
          total_cards: sessionStats.cardsStudied,
          correct_answers: sessionMetrics.correctAnswers || 0,
          wrong_answers: sessionMetrics.wrongAnswers || 0,
          average_response_time: sessionMetrics.averageResponseTime || 0,
        });
        
        navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
        toast.success('✅ Progresso salvo automaticamente', { duration: 1500 });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId, isSessionActive, sessionStats, sessionMetrics, user]);


  async function initializeSession() {
    if (!user) return;
    
    try {
      const newSessionId = await startStudySession(user.id, 'intelligent');
      setSessionId(newSessionId);
      
      const profile = await calculateLearningProfile(user.id);
      setUserProfile(profile);
      
      const progress = await calculateUnlockProgress(user.id);
      setUnlockProgress(progress);
      
      // Pass admin status directly to avoid race condition
      await fetchOdusForReview(progress, isAdmin, isColaborador);
    } catch (error) {
      console.error("Error initializing session:", error);
      toast.error("Erro ao inicializar sessão");
    }
  }

  // Inicializa sessão para estudar um único Odu específico
  async function initializeSingleOduSession(oduId: string) {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Buscar o Odu específico
      const { data: odu, error } = await supabase
        .from('odu')
        .select('*')
        .eq('id', oduId)
        .single();
      
      if (error || !odu) {
        toast.error('Odu não encontrado');
        navigate('/odu-library');
        return;
      }
      
      console.log('🎯 Carregando Odu individual:', odu.nome);
      
      // Iniciar sessão
      const newSessionId = await startStudySession(user.id, 'single-odu');
      setSessionId(newSessionId);
      
      // Carregar perfil de aprendizado
      const profile = await calculateLearningProfile(user.id);
      setUserProfile(profile);
      
      // Carregar progresso de desbloqueio
      const progress = await calculateUnlockProgress(user.id);
      setUnlockProgress(progress);
      
      // Configurar Odu único
      setAvailableOdus([odu]);
      setCurrentOdu(odu);
      setTotalOdusInDb(1);
      setCardStartTime(Date.now());
      
      // Verificar se já estudou este Odu antes
      const { data: memData } = await supabase
        .from('memorizacao')
        .select('revisoes, forca_memoria, status')
        .eq('user_id', user.id)
        .eq('odu_id', odu.id)
        .maybeSingle();
      
      if (memData) {
        setCurrentMemorizationData({
          revisoes: memData.revisoes,
          forca_memoria: memData.forca_memoria,
          status: memData.status
        });
        // Se já estudou, começa direto com flashcard
        setIsShowingPresentation(false);
      } else {
        setCurrentMemorizationData({
          revisoes: 0,
          forca_memoria: 0,
          status: 'nao_estudado'
        });
        // Odu novo: mostrar apresentação primeiro
        setIsShowingPresentation(true);
      }
      
      // Determinar exercícios viáveis baseado no conteúdo
      const versoContent = odu.verso_resumido?.trim() || '';
      const significadoContent = odu.significado?.trim() || '';
      const hasTextContent = versoContent.length >= 20 || significadoContent.length >= 20;
      
      const exercises: StudyMode[] = ['flashcard'];
      if (hasTextContent) {
        exercises.push('cloze', 'dragdrop', 'sentence-order');
      }
      
      console.log('🎯 Exercícios viáveis para loop:', exercises);
      setViableExercises(exercises);
      
      // Iniciar com flashcard
      setMode('flashcard');
      setSingleOduExerciseIndex(0);
      setLoopCount(0);
      setCurrentFlashcardFocus('verso');
      
    } catch (error) {
      console.error('Erro ao carregar Odu individual:', error);
      toast.error('Erro ao iniciar sessão');
      navigate('/odu-library');
    } finally {
      setLoading(false);
    }
  }

  // Avança para o próximo exercício no modo Odu individual - LOOP CONTÍNUO
  function advanceToNextExercise() {
    if (viableExercises.length === 0) {
      console.log('⚠️ Nenhum exercício viável definido');
      return;
    }
    
    const nextIndex = singleOduExerciseIndex + 1;
    
    // Se completou todos os exercícios viáveis, REINICIAR o ciclo (LOOP)
    if (nextIndex >= viableExercises.length) {
      const newLoopCount = loopCount + 1;
      console.log(`🔄 Ciclo ${newLoopCount + 1} iniciando! Reiniciando exercícios...`);
      
      // Incrementar contador de ciclos
      setLoopCount(newLoopCount);
      
      // Voltar ao primeiro exercício
      setSingleOduExerciseIndex(0);
      setMode(viableExercises[0]);
      setCardStartTime(Date.now());
      
      // Variar foco do flashcard a cada ciclo
      const focusOptions: Array<'verso' | 'significado' | 'texto'> = ['verso', 'significado', 'texto'];
      const newFocus = focusOptions[newLoopCount % focusOptions.length];
      setCurrentFlashcardFocus(newFocus);
      
      toast.success(`🔄 Ciclo ${newLoopCount + 1} iniciado! Continue praticando.`, { 
        duration: 2500,
        description: `Foco: ${newFocus === 'verso' ? 'Verso' : newFocus === 'significado' ? 'Significado' : 'Texto Principal'}`
      });
      
      return;
    }
    
    // Avançar para próximo exercício no ciclo atual
    const nextMode = viableExercises[nextIndex];
    console.log(`➡️ Exercício ${nextIndex + 1}/${viableExercises.length}: ${nextMode}`);
    
    setSingleOduExerciseIndex(nextIndex);
    setMode(nextMode);
    setCardStartTime(Date.now());
  }

  // Handler para pular exercício - funciona para todos os exercícios
  function handleSkipExercise() {
    toast.info('Exercício pulado', { duration: 1500 });
    
    if (isSingleOduMode) {
      // Modo individual: avançar para próximo exercício do loop
      advanceToNextExercise();
    } else {
      // Modo normal: selecionar outro Odu
      selectRandomOdu();
    }
  }

  // Função para variar conteúdo do Flashcard baseado no ciclo atual
  function getFlashcardContent() {
    if (!currentOdu) return { texto: '', versoResumido: null, significado: null };
    
    if (!isSingleOduMode) {
      // Modo normal: conteúdo padrão
      return {
        texto: currentOdu.texto_principal,
        versoResumido: currentOdu.verso_resumido,
        significado: currentOdu.significado
      };
    }
    
    // Modo individual: variar baseado no foco do ciclo atual
    switch (currentFlashcardFocus) {
      case 'significado':
        // Foco no significado - mostrar significado como verso (invertido)
        return {
          texto: currentOdu.significado || currentOdu.texto_principal,
          versoResumido: currentOdu.texto_principal?.substring(0, 200) || null,
          significado: currentOdu.verso_resumido
        };
      case 'texto':
        // Foco no texto principal completo
        return {
          texto: currentOdu.texto_principal,
          versoResumido: null,
          significado: currentOdu.verso_resumido
        };
      case 'verso':
      default:
        // Foco padrão no verso resumido
        return {
          texto: currentOdu.texto_principal,
          versoResumido: currentOdu.verso_resumido,
          significado: currentOdu.significado
        };
    }
  }

  async function fetchNextReviewDate() {
    if (!user) return null;
    
    const { data } = await supabase
      .from("memorizacao")
      .select("proxima_revisao, odu(numero, nome)")
      .eq("user_id", user.id)
      .not("proxima_revisao", "is", null)
      .gt("proxima_revisao", new Date().toISOString())
      .order("proxima_revisao", { ascending: true })
      .limit(1)
      .maybeSingle();
      
    return data;
  }

  function formatNextReviewDate(dateString: string): string {
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
  }

  async function fetchOdusForReview(
    progress?: UnlockProgress | null,
    adminStatus?: boolean,
    colaboradorStatus?: boolean
  ) {
    if (!user) return;

    try {
      const isActiveSubscription = hasActiveSubscription();
      const currentLimit = progress?.currentLimit || FREE_LIMIT;
      
      // Use passed admin status to avoid race condition with useAdmin hook
      const hasFullAccess = isActiveSubscription || adminStatus || colaboradorStatus;
      
      // Fetch ALL Odus ordenados por número
      const { data: allOdus } = await supabase
        .from("odu")
        .select("*")
        .order("numero", { ascending: true });

      if (!allOdus || allOdus.length === 0) {
        setLoading(false);
        setTotalOdusInDb(0);
        return;
      }

      // Store total for low-odu mode detection
      setTotalOdusInDb(allOdus.length);

      // NOVO: Filtrar por fase se tiver parâmetro
      let phaseOdus = allOdus;
      if (currentPhaseInfo && currentPhaseInfo.odus_incluidos.length > 0) {
        phaseOdus = allOdus.filter(odu => 
          currentPhaseInfo.odus_incluidos.includes(odu.numero)
        );
        console.log(`📌 Filtrando por fase "${currentPhaseInfo.nome}":`, {
          odusNaFase: currentPhaseInfo.odus_incluidos,
          odusEncontrados: phaseOdus.length,
        });
      }

      // Aplicar limite de QUANTIDADE (não filtro por campo numero)
      // Assinantes, admins e colaboradores têm acesso a todos os da fase
      let accessibleOdus = hasFullAccess ? phaseOdus : phaseOdus.slice(0, currentLimit);
      
      // MODO REVISÃO: Filtrar apenas Odus com revisão pendente
      if (isReviewOnlyMode) {
        const now = new Date().toISOString();
        const { data: pendingReviews } = await supabase
          .from('memorizacao')
          .select('odu_id')
          .eq('user_id', user.id)
          .lte('proxima_revisao', now)
          .not('proxima_revisao', 'is', null);
        
        const pendingOduIds = new Set((pendingReviews || []).map(r => r.odu_id));
        accessibleOdus = accessibleOdus.filter(odu => pendingOduIds.has(odu.id));
        
        console.log('📖 Modo Revisão:', {
          totalPendentes: pendingOduIds.size,
          odusParaRevisar: accessibleOdus.length,
        });
      }
      
      console.log('📊 Sessão de Estudo:', {
        totalOdusNoBanco: allOdus.length,
        odusNaFase: phaseOdus.length,
        faseAtual: currentPhaseInfo?.nome || 'N/A',
        modoRevisao: isReviewOnlyMode,
        limiteAtual: currentLimit,
        hasFullAccess,
        isAdmin: adminStatus,
        isColaborador: colaboradorStatus,
        odusDisponiveis: accessibleOdus.length,
        modoTeste: phaseOdus.length < 5
      });

      // Criar mix intercalado inteligente
      const interleavedOdus = await createInterleavedMix(user.id, accessibleOdus);
      
      // Priorizar Odus
      const prioritizedOdus = await prioritizeOdusForReview(user.id, interleavedOdus, userProfile);
      
      setAvailableOdus(prioritizedOdus);
      
      if (prioritizedOdus.length === 0) {
        const nextReviewData = await fetchNextReviewDate();
        setNextReview(nextReviewData);
      } else {
        selectRandomOdu(prioritizedOdus, phaseOdus.length);
      }
    } catch (error) {
      console.error("Error fetching Odus for review:", error);
      toast.error("Erro ao carregar sessão de estudo");
    } finally {
      setLoading(false);
    }
  }

  async function selectRandomOdu(odusPool?: Odu[], totalInDb?: number) {
    let pool = odusPool || availableOdus;
    const totalOdus = totalInDb || totalOdusInDb;
    const lowOduMode = totalOdus > 0 && totalOdus < 5;
    
    console.log('🔍 selectRandomOdu - INÍCIO:', {
      poolRecebido: odusPool?.length ?? 'N/A',
      poolAtual: pool.length,
      poolOdus: pool.slice(0, 3).map(o => `${o.numero}-${o.nome}`),
      totalOdusInDb: totalOdus,
      isRecycling,
      studiedInSession: studiedInSession.size,
      mode,
      lowOduMode
    });
    
    // Se não há Odus disponíveis
    if (pool.length === 0 && !isRecycling) {
      // In low-odu mode, automatically recycle without error
      if (lowOduMode && studiedInSession.size > 0) {
        console.log("📚 Modo poucos Odus: reciclando automaticamente...");
        setIsLoadingNext(true);
        await recycleStudiedOdus();
        setIsLoadingNext(false);
        return;
      }
      
      console.log("Pool vazio, aguardando reciclagem...");
      setIsLoadingNext(true);
      await recycleStudiedOdus();
      setIsLoadingNext(false);
      return;
    }
    
    // Only try to preload if there are more Odus in DB than in current pool
    // Skip preloading in low-odu mode to avoid unnecessary fetches
    if (pool.length <= 3 && !isRecycling && user && !lowOduMode && pool.length < totalOdus) {
      console.log("Pool crítico, aguardando pré-carregamento...");
      setIsLoadingNext(true);
      const newOdus = await preloadMoreOdus();
      setIsLoadingNext(false);
      
      // ✅ CORREÇÃO: Usar o array retornado diretamente em vez de confiar no estado
      if (newOdus && newOdus.length > 0) {
        pool = newOdus;
        console.log('✅ Pool atualizado com Odus pré-carregados:', pool.length);
      }
    } else if (pool.length <= 3 && lowOduMode) {
      console.log('📊 Poucos Odus cadastrados, usando todos disponíveis sem pré-carregar');
    }
    
    if (pool.length === 0) {
      setSessionComplete(true);
      return;
    }

    // Select first from prioritized list
    const selectedOdu = pool[0];
    
    // Imediatamente mostrar o card (sem "Carregando...")
    setCurrentOdu(selectedOdu);
    setStudiedInSession(prev => new Set(prev).add(selectedOdu.id));
    setCardStartTime(Date.now());
    
    // Load current memorization data for this Odu (em paralelo)
    if (user) {
      supabase
        .from("memorizacao")
        .select("revisoes, forca_memoria, status")
        .eq("user_id", user.id)
        .eq("odu_id", selectedOdu.id)
        .maybeSingle()
        .then(({ data: memData }) => {
          if (memData) {
            setCurrentMemorizationData({
              revisoes: memData.revisoes,
              forca_memoria: memData.forca_memoria,
              status: memData.status
            });
            
            // Se já estudou antes, vai direto para flashcard/quiz
            setIsShowingPresentation(false);
          } else {
            // NOVO ODU: Mostrar tela de apresentação primeiro
            setCurrentMemorizationData({
              revisoes: 0,
              forca_memoria: 0,
              status: "nao_estudado"
            });
            setIsShowingPresentation(true);
            console.log('📖 Odu novo detectado, mostrando apresentação:', selectedOdu.nome);
          }
        });
    }
    
    // Select study mode: flashcard, quiz, cloze, dragdrop, or sentence-order
    // Cloze/dragdrop/sentence-order only works if verso_resumido exists with sufficient content
    const versoContent = selectedOdu.verso_resumido?.trim() || '';
    const hasClozeContent = versoContent.length >= 20;
    const canDoQuiz = pool.length >= 4 && !lowOduMode;
    
    // Log de diagnóstico para rastrear seleção de modo
    console.log('📊 [ModeSelection] Verificando condições:', {
      odu: `${selectedOdu.numero}-${selectedOdu.nome}`,
      versoLength: versoContent.length,
      hasClozeContent,
      canDoQuiz,
      poolSize: pool.length,
      lowOduMode
    });
    
    // Weighted random selection: 30% flashcard, 25% quiz, 18% cloze, 15% dragdrop, 12% sentence-order
    const random = Math.random();
    let selectedMode: StudyMode;
    let fallbackReason = '';
    
    if (random < 0.30) {
      selectedMode = "flashcard";
    } else if (random < 0.55 && canDoQuiz) {
      selectedMode = "quiz";
    } else if (random < 0.73 && hasClozeContent) {
      selectedMode = "cloze";
    } else if (random < 0.88 && hasClozeContent) {
      selectedMode = "dragdrop";
    } else if (hasClozeContent) {
      selectedMode = "sentence-order";
    } else {
      selectedMode = "flashcard";
      if (!hasClozeContent) {
        fallbackReason = `verso_resumido insuficiente (${versoContent.length} chars)`;
      } else if (!canDoQuiz) {
        fallbackReason = `pool insuficiente para quiz (${pool.length} odus)`;
      }
    }
    
    if (fallbackReason) {
      console.log(`⚠️ [ModeSelection] Fallback para flashcard: ${fallbackReason}`);
      // Log para monitoramento em produção
      logModeFallback(
        random < 0.55 ? 'quiz' : random < 0.73 ? 'cloze' : random < 0.88 ? 'dragdrop' : 'sentence-order',
        'flashcard',
        { id: selectedOdu.id, numero: selectedOdu.numero, nome: selectedOdu.nome },
        faseSlug || undefined
      );
    }
    
    console.log(`🎲 Modo selecionado: ${selectedMode} (hasCloze: ${hasClozeContent}, canQuiz: ${canDoQuiz})`);
    setMode(selectedMode);
  }
  async function handleFlashcardRate(difficulty: number) {
    // ✅ Proteção anti-clique-duplo
    if (!user || !currentOdu || isProcessingAnswer) {
      console.log('⚠️ handleFlashcardRate bloqueado:', { 
        noUser: !user, 
        noOdu: !currentOdu, 
        isProcessing: isProcessingAnswer 
      });
      return;
    }
    
    setIsProcessingAnswer(true);
    console.log('🎯 handleFlashcardRate - INÍCIO:', {
      odu: currentOdu.nome,
      numero: currentOdu.numero,
      difficulty,
      poolRestante: availableOdus.length
    });

    const qualidade = difficulty; // 1=difícil, 3=médio, 5=fácil
    const responseTime = Math.floor((Date.now() - cardStartTime) / 1000);
    const isCorrect = qualidade >= 3;

    try {
      // Update session metrics
      const newMetrics = {
        ...sessionMetrics,
        totalCards: sessionMetrics.totalCards + 1,
        correctAnswers: sessionMetrics.correctAnswers + (isCorrect ? 1 : 0),
        wrongAnswers: sessionMetrics.wrongAnswers + (isCorrect ? 0 : 1),
        consecutiveCorrect: isCorrect ? sessionMetrics.consecutiveCorrect + 1 : 0,
        consecutiveWrong: isCorrect ? 0 : sessionMetrics.consecutiveWrong + 1,
        averageResponseTime: Math.floor(
          (sessionMetrics.averageResponseTime * sessionMetrics.totalCards + responseTime) / 
          (sessionMetrics.totalCards + 1)
        )
      };
      setSessionMetrics(newMetrics);

      // 🔥 FEEDBACK EM TEMPO REAL - Consecutive wrong
      if (newMetrics.consecutiveWrong >= 3) {
        toast.info("😴 3 erros seguidos. Recomendamos uma pausa de 5 minutos!", {
          duration: 5000
        });
      }

      // 🎯 FEEDBACK EM TEMPO REAL - Perfect streak
      if (newMetrics.consecutiveCorrect >= 10) {
        toast.success("🎯 10 acertos seguidos! Você está dominando!", {
          duration: 3000
        });
      }

      // 🧠 FEEDBACK EM TEMPO REAL - Attention drop
      const sessionTime = (Date.now() - sessionStats.startTime) / (1000 * 60);
      const accuracyRate = newMetrics.totalCards > 0 
        ? newMetrics.correctAnswers / newMetrics.totalCards 
        : 1;

      // Recomendação de pausa inteligente
      if (newMetrics.totalCards > 0 && newMetrics.totalCards % 20 === 0 && !isPaused) {
        toast.info("💡 Você já estudou 20 cards! Considere fazer uma pausa de 5 minutos.", {
          duration: 8000,
          action: {
            label: "Pausar Agora",
            onClick: handlePauseSession
          }
        });
      }

      if (sessionTime > 45 && accuracyRate < 0.7) {
        toast.warning("🧠 Sua atenção pode estar caindo. Recomendamos um intervalo!", {
          duration: 5000
        });
      }

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
      
      // 🚀 ALGORITMO ADAPTATIVO - Use new adaptive algorithm
      const { novaFacilidade, novoIntervalo } = calculateAdaptiveInterval(
        facilidade,
        intervalo,
        qualidade,
        userProfile,
        revisoes
      );
      
      const newMemoryStrength = Math.min(100, (currentRecord?.forca_memoria || 0) + qualidade * 8);
      const newStatus = revisoes >= 3 && newMemoryStrength >= 60 ? "memorizado" : "estudando";
      
      // Calculate next review date
      const proximaData = new Date();
      proximaData.setDate(proximaData.getDate() + novoIntervalo);

      // Update memorization record with additional intelligence fields
      const { data: upsertResult, error: upsertError } = await supabase
        .from("memorizacao")
        .upsert({
          user_id: user.id,
          odu_id: currentOdu.id,
          revisoes,
          ultima_revisao: new Date().toISOString(),
          proxima_revisao: proximaData.toISOString(),
          facilidade: novaFacilidade,
          intervalo: novoIntervalo,
          forca_memoria: newMemoryStrength,
          status: newStatus,
          marked_difficult: qualidade === 1,
          consecutive_correct: isCorrect ? (currentRecord?.consecutive_correct || 0) + 1 : 0,
          consecutive_wrong: isCorrect ? 0 : (currentRecord?.consecutive_wrong || 0) + 1,
          total_study_time: (currentRecord?.total_study_time || 0) + responseTime,
          last_response_time: responseTime
        }, { onConflict: 'user_id,odu_id' })
        .select();

      if (upsertError) {
        console.error('❌ Erro ao atualizar memorização:', upsertError);
        toast.error('Erro ao salvar progresso. Tente novamente.');
        throw upsertError;
      }

      console.log('✅ Memorização atualizada:', {
        odu: currentOdu.nome,
        revisoes,
        ultima_revisao: new Date().toISOString(),
        forca_memoria: newMemoryStrength
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

      // Update profile
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("xp")
        .eq("user_id", user.id)
        .single();

      const newXp = (currentProfile?.xp || 0) + xp;
      await supabase
        .from("profiles")
        .update({ xp: newXp })
        .eq("user_id", user.id);

      // Update streak
      await supabase.rpc("update_user_streak", { _user_id: user.id });

      // Check achievements and badges
      await supabase.rpc("check_and_award_achievements", { _user_id: user.id });
      await supabase.rpc("check_and_award_badges", { _user_id: user.id });

      // Log event
      await supabase.from("gamification_logs").insert({
        user_id: user.id,
        tipo_evento: "xp_ganho",
        valor: xp,
        detalhes: { odu_id: currentOdu.id, qualidade, odu_nome: currentOdu.nome },
      });

      // Check for new badges
      const { data: recentBadges } = await supabase
        .from("user_badges")
        .select(`badge_id, badges (nome, icon)`)
        .eq("user_id", user.id)
        .gte("conquistado_em", new Date(Date.now() - 5000).toISOString());

      if (recentBadges && recentBadges.length > 0) {
        recentBadges.forEach((badge: any) => {
          toast.success(
            `🎖️ Novo Badge: ${badge.badges.nome}!`,
            { duration: 4000 }
          );
        });
      }

      // 📊 FEEDBACK EM TEMPO REAL - Study block recommendation
      const studyBlock = determineStudyBlock(newMetrics);
      if (studyBlock.breakAfter && newMetrics.totalCards % studyBlock.targetCards === 0) {
        toast.info(`✨ Você completou ${studyBlock.targetCards} cards! Recomendamos uma pausa.`, {
          duration: 5000
        });
      }

      // 🧠 PREDIÇÃO DE ESQUECIMENTO - Feedback após revisão
      if (currentRecord && isCorrect) {
        const oldForgetProb = predictForgetProbability(
          currentRecord.forca_memoria,
          currentRecord.ultima_revisao,
          currentRecord.revisoes
        );
        
        const newForgetProb = predictForgetProbability(
          newMemoryStrength,
          new Date().toISOString(),
          revisoes
        );
        
        if (oldForgetProb > 0.5 && newForgetProb < 0.3) {
          toast.success(
            `🎯 Odu ${currentOdu.numero} salvo do esquecimento! Risco reduzido de ${Math.round(oldForgetProb * 100)}% → ${Math.round(newForgetProb * 100)}%`,
            { duration: 5000 }
          );
        } else if (newForgetProb < 0.1) {
          toast.success(
            `✨ Odu ${currentOdu.numero} fortemente memorizado! Próxima revisão em ${novoIntervalo} dias`,
            { duration: 4000 }
          );
        }
      }

      // ✅ CORREÇÃO: Não remover Odu do pool no modo individual (loop contínuo)
      let remainingOdus = availableOdus;
      
      if (!isSingleOduMode) {
        // Modo normal (fase): remove do pool após estudar
        remainingOdus = availableOdus.filter(o => o.id !== currentOdu.id);
        setAvailableOdus(remainingOdus);
        
        console.log('🔄 Transição de Odu:', {
          estudado: `${currentOdu.numero}-${currentOdu.nome}`,
          poolAntes: availableOdus.length,
          poolDepois: remainingOdus.length,
          proximosNaFila: remainingOdus.slice(0, 3).map(o => `${o.numero}-${o.nome}`)
        });
      } else {
        // Modo individual: manter Odu no pool para loop contínuo
        console.log('🔁 Modo Individual - Odu permanece no pool para próximo ciclo');
      }
      
      // ✅ CORREÇÃO: Usar callback com tempo aumentado para melhor feedback visual
      setTimeout(() => {
        setShowXPNotification(false);
        setIsProcessingAnswer(false);
        
        // Modo Odu Individual: avançar para próximo exercício
        if (isSingleOduMode) {
          advanceToNextExercise();
        } else {
          // Modo normal: passar remainingOdus diretamente para evitar usar estado desatualizado
          selectRandomOdu(remainingOdus);
        }
      }, 1200);

    } catch (error) {
      console.error("Error handling flashcard rate:", error);
      toast.error("Erro ao processar resposta");
      setIsProcessingAnswer(false); // Liberar lock em caso de erro
    }
  }

  async function recycleStudiedOdus() {
    if (!user || isRecycling) return;
    
    setIsRecycling(true);
    setIsLoadingNext(true);
    
    try {
      const studiedIds = Array.from(studiedInSession);
      
      if (studiedIds.length === 0) {
        // Se não há Odus estudados ainda, buscar TODOS os Odus disponíveis
        console.log("Nenhum Odu estudado, buscando todos disponíveis...");
        await fetchOdusForReview();
        return;
      }
      
      console.log(`🔄 Reciclando ${studiedIds.length} Odus estudados...`);
      
      // Buscar dados atualizados dos Odus estudados
      const { data: recycledOdus, error } = await supabase
        .from("odu")
        .select("*")
        .in("id", studiedIds);
      
      if (error) throw error;
      
      if (recycledOdus && recycledOdus.length > 0) {
        // Re-priorizar baseado na nova força de memória
        const reprioritized = await prioritizeOdusForReview(user.id, recycledOdus, userProfile);
        
        setAvailableOdus(reprioritized);
        setSessionRounds(prev => prev + 1);
        
        toast.success(`🔄 Rodada ${sessionRounds + 1} iniciada! ${reprioritized.length} Odus disponíveis`, {
          duration: 3000
        });
        
        // ✅ AGUARDAR antes de selecionar próximo
        setTimeout(() => {
          selectRandomOdu(reprioritized);
        }, 500);
      } else {
        // Se não conseguiu reciclar, buscar TODOS os Odus
        console.log("Falha ao reciclar, buscando todos Odus...");
        await fetchOdusForReview();
      }
    } catch (error) {
      console.error("Erro ao reciclar Odus:", error);
      toast.error("Erro ao reciclar Odus. Buscando novos...");
      await fetchOdusForReview();
    } finally {
      setIsRecycling(false);
      setIsLoadingNext(false);
    }
  }
  
  // ✅ CORREÇÃO: Retornar array de Odus em vez de boolean para evitar race condition
  async function preloadMoreOdus(): Promise<Odu[] | null> {
    if (!user || isRecycling) return null;
    
    try {
      console.log("⏳ Pré-carregando mais Odus...");
      
      const { data: allOdus } = await supabase
        .from("odu")
        .select("*")
        .order("numero", { ascending: true });
      
      if (!allOdus || allOdus.length === 0) {
        console.warn("Nenhum Odu disponível para pré-carregar");
        return null;
      }
      
      // Criar novo mix intercalado
      const interleavedOdus = await createInterleavedMix(user.id, allOdus);
      const prioritizedOdus = await prioritizeOdusForReview(user.id, interleavedOdus, userProfile);
      
      // Mesclar com os Odus atuais (sem duplicatas)
      const currentIds = new Set(availableOdus.map(o => o.id));
      const newOdus = prioritizedOdus.filter(o => !currentIds.has(o.id));
      
      if (newOdus.length > 0) {
        const mergedOdus = [...availableOdus, ...newOdus];
        setAvailableOdus(mergedOdus);
        console.log(`✅ Pré-carregados ${newOdus.length} novos Odus, total: ${mergedOdus.length}`);
        return mergedOdus; // Retornar array atualizado para uso imediato
      }
      
      return availableOdus; // Retornar pool atual se não há novos
    } catch (error) {
      console.error("Erro ao pré-carregar Odus:", error);
      return null;
    }
  }

  async function handleQuizAnswer(isCorrect: boolean) {
    const difficulty = isCorrect ? 5 : 1;
    await handleFlashcardRate(difficulty);
  }

  // Handler para exercício de completar a frase (Cloze Deletion)
  async function handleClozeAnswer(isCorrect: boolean, score: number) {
    // Converter score (0-100) para difficulty (1-5)
    // score 100 = difficulty 5 (fácil)
    // score 0 = difficulty 1 (difícil)
    let difficulty: number;
    if (score >= 80) {
      difficulty = 5; // Excelente
    } else if (score >= 60) {
      difficulty = 4; // Bom
    } else if (score >= 40) {
      difficulty = 3; // Médio
    } else if (score >= 20) {
      difficulty = 2; // Difícil
    } else {
      difficulty = 1; // Muito difícil
    }
    
    // Bonus XP por usar técnica Cloze (mais engajamento)
    const bonusXP = isCorrect ? 10 : 0;
    setSessionStats(prev => ({
      ...prev,
      totalXP: prev.totalXP + bonusXP
    }));
    
    if (bonusXP > 0) {
      toast.success(`🧩 +${bonusXP} XP bônus por Complete a Frase!`, { duration: 2000 });
    }
    
    await handleFlashcardRate(difficulty);
  }

  async function handleEndSession() {
    const shouldEnd = window.confirm(
      `Você estudou ${sessionMetrics.totalCards} cards em ${sessionRounds + 1} rodada(s).\n\nTem certeza que deseja finalizar?`
    );
    
    if (!shouldEnd) return;
    
    setIsSessionActive(false);
    setSessionComplete(true);
    
    // Fetch next review date for completion screen
    const nextReviewData = await fetchNextReviewDate();
    setNextReview(nextReviewData);
    
    if (sessionId && user) {
      await endStudySession(
        sessionId,
        sessionMetrics.totalCards,
        sessionMetrics.correctAnswers,
        sessionMetrics.wrongAnswers,
        sessionMetrics.averageResponseTime
      );
    }
    
    toast.success("Sessão finalizada! Ótimo trabalho! 🎉");
  }
  
  function handlePauseSession() {
    if (isPaused) {
      // Retomar sessão
      setIsPaused(false);
      setPauseStartTime(null);
      toast.success("Sessão retomada! Vamos continuar! 💪");
    } else {
      // Pausar sessão
      setIsPaused(true);
      setPauseStartTime(Date.now());
      toast.info("Sessão pausada. Descanse um pouco! 😌");
    }
  }

  // Handler para quando o usuário completa a apresentação de um Odu novo
  async function handlePresentationComplete() {
    if (!user || !currentOdu) return;
    
    console.log('✅ Apresentação concluída, iniciando primeira prática:', currentOdu.nome);
    
    // Marcar o Odu como "estudando" (primeiro contato)
    try {
      await supabase
        .from("memorizacao")
        .upsert({
          user_id: user.id,
          odu_id: currentOdu.id,
          revisoes: 0,
          forca_memoria: 5, // Força inicial baixa
          status: "estudando",
          ultima_revisao: new Date().toISOString(),
          facilidade: 2.5,
          intervalo: 0,
        }, { onConflict: 'user_id,odu_id' });
      
      // Atualizar estado local
      setCurrentMemorizationData({
        revisoes: 0,
        forca_memoria: 5,
        status: "estudando"
      });
    } catch (error) {
      console.error("Erro ao marcar Odu como estudando:", error);
    }
    
    // ✅ CORREÇÃO: Apenas sair do modo apresentação
    // O modo (cloze, dragdrop, flashcard, quiz) já foi definido em selectRandomOdu
    setIsShowingPresentation(false);
    
    toast.success("🎯 Agora vamos praticar o que você aprendeu!", { duration: 3000 });
  }

  const generateQuizQuestion = useMemo((): QuizQuestion | null => {
    if (!currentOdu) return null;
    
    // ✅ FALLBACK: Se não há Odus suficientes para quiz, forçar flashcard
    if (!availableOdus || availableOdus.length < 4) {
      if (mode === "quiz") {
        console.log("⚠️ Quiz indisponível (< 4 Odus), forçando flashcard");
        setMode("flashcard");
      }
      return null;
    }
    
    // Determinar tipo de quiz baseado no progresso (número de revisões)
    const revisoes = currentMemorizationData.revisoes || 0;
    
    // Determine quiz types based on revision count - FOCO EM HISTÓRIA E APLICAÇÃO
    let availableTypes: QuizQuestion["type"][];
    if (revisoes < 4) {
      // Iniciante: 40% verso→nome, 30% nome→verso, 30% aplicação
      availableTypes = [
        "verso_para_nome", "verso_para_nome", 
        "nome_para_verso", "nome_para_verso",
        "aplicacao_pratica", "aplicacao_pratica"
      ];
    } else if (revisoes < 7) {
      // Intermediário: 30% cada tipo + 10% nome básico
      availableTypes = [
        "nome_para_verso", "nome_para_verso",
        "verso_para_significado", "verso_para_significado",
        "aplicacao_pratica", "aplicacao_pratica",
        "nome"
      ];
    } else {
      // Avançado: 40% verso→significado, 30% aplicação, 30% nome→verso
      availableTypes = [
        "verso_para_significado", "verso_para_significado", "verso_para_significado",
        "aplicacao_pratica", "aplicacao_pratica",
        "nome_para_verso", "nome_para_verso"
      ];
    }
    
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    // Get wrong answers
    const otherOdus = availableOdus.filter((o) => o.id !== currentOdu.id);
    
    let correctAnswer = "";
    let wrongAnswers: string[] = [];
    let context = "";
    let explanation = "";
    
    if (type === "verso_para_nome") {
      // Pergunta: Dado o verso, qual é o nome do Odu?
      correctAnswer = currentOdu.nome;
      wrongAnswers = otherOdus
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((o) => o.nome);
      explanation = `${currentOdu.nome} representa: ${currentOdu.significado || 'este conceito'}`;
    } else if (type === "nome_para_verso") {
      // Pergunta: Dado o nome, qual é o verso?
      correctAnswer = currentOdu.verso_resumido || "";
      wrongAnswers = otherOdus
        .filter(o => o.verso_resumido)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((o) => o.verso_resumido || "");
      explanation = `Este verso representa a essência de ${currentOdu.nome}`;
    } else if (type === "verso_para_significado") {
      // Pergunta: Dado o verso, qual é o significado?
      correctAnswer = currentOdu.significado || currentOdu.nome;
      wrongAnswers = otherOdus
        .filter(o => o.significado)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((o) => o.significado || o.nome);
      explanation = `O Odu ${currentOdu.nome} representa este conceito`;
    } else if (type === "aplicacao_pratica") {
      // Novo tipo: Aplicação Prática
      correctAnswer = currentOdu.nome;
      wrongAnswers = otherOdus
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((o) => o.nome);
      context = currentOdu.exemplos_praticos || 
                `Em uma situação que envolve: ${currentOdu.significado || 'este contexto'}`;
      explanation = `${currentOdu.nome} é o Odu que rege esta situação pois representa ${currentOdu.significado}`;
    } else if (type === "nome") {
      correctAnswer = currentOdu.nome;
      wrongAnswers = otherOdus
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((o) => o.nome);
    } else {
      correctAnswer = `#${currentOdu.numero}`;
      wrongAnswers = otherOdus
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((o) => `#${o.numero}`);
    }

    const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

    return {
      oduId: currentOdu.id,
      numero: currentOdu.numero,
      nome: currentOdu.nome,
      correctAnswer,
      options,
      type,
      versoResumido: currentOdu.verso_resumido || undefined,
      significado: currentOdu.significado || undefined,
      context,
      explanation,
    };
  }, [availableOdus, currentOdu, mode, currentMemorizationData]);

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const sessionDuration = Date.now() - sessionStats.startTime;

  if (loading || subscriptionLoading || adminLoading) {
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
              <Button onClick={() => navigate("/caminho-ifa")} variant="outline" className="w-full">
                Voltar ao Caminho de Ifá
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (availableOdus.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-center">Parabéns! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Você está em dia com todas as suas revisões!
            </p>
            
            {nextReview && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  Próxima Revisão:
                </div>
                <p className="text-lg font-semibold">
                  {formatNextReviewDate(nextReview.proxima_revisao)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Odu #{nextReview.odu.numero} - {nextReview.odu.nome}
                </p>
              </div>
            )}
            
            {!nextReview && (
              <p className="text-center text-sm text-muted-foreground">
                Comece estudando novos Odus na biblioteca!
              </p>
            )}
            
            <div className="space-y-2">
              <Button onClick={() => navigate("/caminho-ifa")} className="w-full">
                Continuar no Caminho de Ifá
              </Button>
              <Button onClick={() => navigate("/biblioteca-yoruba")} variant="outline" className="w-full">
                Explorar Biblioteca
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center animate-scale-in">
                <Trophy className="h-14 w-14 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-center text-3xl">Sessão Completa!</CardTitle>
            {isSingleOduMode && currentOdu && (
              <p className="text-center text-muted-foreground mt-2">
                Odu estudado: <strong>{currentOdu.nome}</strong>
              </p>
            )}
            {!isSingleOduMode && currentPhaseInfo && (
              <p className="text-center text-muted-foreground mt-2">
                Fase: {currentPhaseInfo.nome}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Single Odu Mode - Loops Badge */}
            {isSingleOduMode && loopCount > 0 && (
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <div className="text-3xl font-bold text-primary">🔄 {loopCount}</div>
                <div className="text-sm text-muted-foreground">Ciclos Completados</div>
              </div>
            )}
            
            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold text-foreground">
                  {sessionStats.cardsStudied}
                </div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Target className="h-3 w-3" />
                  {isSingleOduMode ? 'Exercícios' : 'Cards Estudados'}
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold text-foreground">
                  {formatDuration(sessionDuration)}
                </div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Tempo Total
                </div>
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {sessionMetrics.correctAnswers}
                </div>
                <div className="text-sm text-green-600/80 dark:text-green-400/80 flex items-center justify-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Acertos
                </div>
              </div>
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg text-center">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {sessionMetrics.wrongAnswers}
                </div>
                <div className="text-sm text-red-600/80 dark:text-red-400/80 flex items-center justify-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Erros
                </div>
              </div>
            </div>

            {/* Accuracy Rate */}
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <div className="text-4xl font-bold text-primary">
                {accuracyRate}%
              </div>
              <div className="text-sm text-muted-foreground">Taxa de Acerto</div>
            </div>

            {/* Phase Progress */}
            {phaseProgress && currentPhaseInfo && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Progresso na Fase</span>
                  <span className="text-muted-foreground">
                    {phaseProgress.memorized}/{phaseProgress.total} Odus memorizados
                  </span>
                </div>
                <Progress 
                  value={(phaseProgress.memorized / phaseProgress.total) * 100} 
                  className="h-2" 
                />
                {phaseProgress.memorized === phaseProgress.total && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium text-center mt-2">
                    🎉 Fase completa!
                  </p>
                )}
              </div>
            )}

            {/* Next Review Info */}
            {nextReview && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <Clock className="h-4 w-4" />
                  <span>Próxima revisão: <strong>{formatNextReviewDate(nextReview.proxima_revisao)}</strong></span>
                </div>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                  Odu #{nextReview.odu.numero} - {nextReview.odu.nome}
                </p>
              </div>
            )}
              
            {/* XP Earned */}
            <div className="py-4">
              <div className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-primary w-full">
                <span className="text-4xl font-bold text-primary-foreground">+{sessionStats.totalXP}</span>
                <span className="text-xl text-primary-foreground">XP</span>
              </div>
            </div>
              
            {/* Badges Earned */}
            {user && <BadgesDisplay userId={user.id} compact />}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button 
                onClick={() => navigate("/dashboard")} 
                className="w-full" 
                variant="hero" 
                size="lg"
              >
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Button>
              {isSingleOduMode && currentOdu && (
                <Button 
                  onClick={() => navigate(`/odu/${currentOdu.id}`)} 
                  className="w-full" 
                  variant="outline" 
                  size="lg"
                >
                  Ver Detalhes do Odu
                </Button>
              )}
              {!isSingleOduMode && (
                <Button 
                  onClick={() => navigate("/caminho-ifa")} 
                  className="w-full" 
                  variant="outline" 
                  size="lg"
                >
                  Continuar no Caminho de Ifá
                </Button>
              )}
              <Button 
                onClick={() => {
                  if (isSingleOduMode && currentOdu) {
                    navigate(`/study?odu=${currentOdu.id}`);
                  } else if (currentPhaseInfo) {
                    navigate(`/study?fase=${currentPhaseInfo.slug}`);
                  } else {
                    window.location.reload();
                  }
                }} 
                className="w-full" 
                variant="ghost"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {isSingleOduMode ? 'Estudar este Odu Novamente' : 'Nova Sessão nesta Fase'}
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
              Não há Odus disponíveis para estudo nesta fase.
            </p>
            <Button onClick={() => navigate("/caminho-ifa")} className="w-full">
              Voltar ao Caminho de Ifá
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
      
      <div className="container mx-auto px-4 py-8 pb-28 md:pb-8">
        {/* Story Mode Toggle */}
        <div className="mb-4 flex justify-center">
          <StoryModeToggle enabled={storyMode} onChange={setStoryMode} />
        </div>

        {/* Low Odu Mode Alert */}
        {isLowOduMode && (
          <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <Brain className="h-4 w-4" />
            <AlertDescription className="ml-2">
              📚 Sistema em modo de teste com {totalOdusInDb} Odu(s) cadastrado(s). 
              Os mesmos Odus serão reciclados automaticamente para prática contínua.
            </AlertDescription>
          </Alert>
        )}

        {/* Header with Session Stats */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(isSingleOduMode ? `/odu/${currentOdu?.id}` : "/caminho-ifa")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isSingleOduMode ? 'Voltar ao Odu' : 'Voltar ao Caminho de Ifá'}
          </Button>

          {/* Single Odu Mode - Loop Progress Indicator */}
          {isSingleOduMode && currentOdu && (
            <div className="mb-4 p-4 border rounded-lg bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xl font-bold">{currentOdu.numero}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{currentOdu.nome}</p>
                  <p className="text-sm text-muted-foreground">Modo Prática Intensiva</p>
                </div>
              </div>
              
              {/* Loop Progress */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-background">
                  🔄 Ciclo {loopCount + 1}
                </Badge>
                <Badge variant="outline" className="bg-background">
                  📝 Exercício {singleOduExerciseIndex + 1}/{viableExercises.length}
                </Badge>
                <Badge variant="secondary">
                  ✅ {sessionStats.cardsStudied} completados
                </Badge>
              </div>
              
              {/* Viable Exercises Visual */}
              <div className="mt-3 flex gap-1">
                {viableExercises.map((exercise, idx) => (
                  <div 
                    key={exercise}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      idx < singleOduExerciseIndex 
                        ? 'bg-green-500' 
                        : idx === singleOduExerciseIndex 
                          ? 'bg-primary animate-pulse' 
                          : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>Flashcard</span>
                {viableExercises.length > 1 && <span>Cloze</span>}
                {viableExercises.length > 2 && <span>Drag & Drop</span>}
                {viableExercises.length > 3 && <span>Ordenar</span>}
              </div>
            </div>
          )}

          {/* Phase Context Badge */}
          {currentPhaseInfo && !isSingleOduMode && (
            <div className={`mb-4 p-4 border rounded-lg ${isReviewOnlyMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-primary/5 border-primary/20'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isReviewOnlyMode ? 'bg-amber-500/20' : 'bg-primary/10'}`}>
                  <span className="text-xl">{isReviewOnlyMode ? '📖' : (currentPhaseInfo.nome.includes('Oju') ? '📖' : '👨‍👩‍👧‍👦')}</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isReviewOnlyMode ? 'Revisando na Fase' : 'Estudando na Fase'}
                  </p>
                  <p className="font-semibold text-lg">{currentPhaseInfo.nome}</p>
                  {isReviewOnlyMode && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Modo Revisão: Apenas Odus que precisam ser revisados
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator - Only for Phase mode */}
          {!isSingleOduMode && availableOdus.length > 0 && (
            <div className="mb-6 p-4 bg-card rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Você está no Odu {sessionStats.cardsStudied + 1}</span>
                <span className="text-sm text-muted-foreground">{sessionStats.cardsStudied} de {availableOdus.length} estudados</span>
              </div>
              <Progress value={(sessionStats.cardsStudied / availableOdus.length) * 100} className="h-2" />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h1 className="text-3xl font-bold">
                {isSingleOduMode ? 'Prática Intensiva' : 'Sessão de Estudo'}
              </h1>
            </div>
            
            {/* Session Stats */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" className="text-base px-4 py-2">
                📚 {sessionStats.cardsStudied} exercícios
              </Badge>
              <Badge variant="secondary" className="text-base px-4 py-2">
                ⭐ {sessionStats.totalXP} XP
              </Badge>
              {isSingleOduMode && loopCount > 0 && (
                <Badge variant="default" className="text-base px-4 py-2">
                  🔄 {loopCount} ciclos
                </Badge>
              )}
            </div>
            
            {sessionStats.cardsStudied === 1 && !hasShownFirstOduCelebration && (() => {
              setHasShownFirstOduCelebration(true);
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              });
              toast.success('🎉 Parabéns! Você completou seu primeiro exercício!', { duration: 5000 });
              return null;
            })()}
            
            <p className="text-sm text-muted-foreground text-center">
              {isSingleOduMode 
                ? '💡 Os exercícios repetem em loop. Clique em "Finalizar" quando se sentir confiante.' 
                : '💡 Dica: Continue até se sentir confiante com o conteúdo'}
            </p>
          </div>
        </div>

        {/* Real-time Feedback Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Session Accuracy Card */}
          <Card className={
            sessionMetrics.totalCards >= 5 
              ? sessionMetrics.correctAnswers / sessionMetrics.totalCards >= 0.85
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : sessionMetrics.correctAnswers / sessionMetrics.totalCards >= 0.6
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                  : "border-red-500 bg-red-50 dark:bg-red-900/20"
              : ""
          }>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Precisão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {sessionMetrics.totalCards > 0 
                    ? Math.round((sessionMetrics.correctAnswers / sessionMetrics.totalCards) * 100)
                    : 0}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {sessionMetrics.correctAnswers}/{sessionMetrics.totalCards}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Consecutive Streak Card */}
          <Card className={
            sessionMetrics.consecutiveCorrect >= 10
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : sessionMetrics.consecutiveWrong >= 3
                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                : ""
          }>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Sequência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {sessionMetrics.consecutiveCorrect > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔥</span>
                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {sessionMetrics.consecutiveCorrect} corretos
                    </span>
                  </div>
                )}
                {sessionMetrics.consecutiveWrong > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">😓</span>
                    <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                      {sessionMetrics.consecutiveWrong} erros
                    </span>
                  </div>
                )}
                {sessionMetrics.consecutiveCorrect === 0 && sessionMetrics.consecutiveWrong === 0 && (
                  <span className="text-sm text-muted-foreground">Comece a estudar</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Average Response Time Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Tempo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {sessionMetrics.averageResponseTime}
                </span>
                <span className="text-sm text-muted-foreground">segundos</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unlock Progress Card (for free users) */}
        {!hasActiveSubscription() && unlockProgress && (
          <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🎯 Próximo Desbloqueio
                {unlockProgress.requirementType === 'upgrade' && (
                  <Badge variant="secondary" className="ml-2">Premium</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    {unlockProgress.requirementType === 'mastery' && `Memorize ${unlockProgress.requirementValue} Odu`}
                    {unlockProgress.requirementType === 'streak' && `${unlockProgress.requirementValue} dias de sequência`}
                    {unlockProgress.requirementType === 'xp' && `${unlockProgress.requirementValue} XP`}
                    {unlockProgress.requirementType === 'upgrade' && 'Faça upgrade para Premium'}
                  </span>
                  <span className="font-semibold">
                    {unlockProgress.requirementType !== 'upgrade' 
                      ? `${unlockProgress.currentProgress}/${unlockProgress.requirementValue}`
                      : ''}
                  </span>
                </div>
                {unlockProgress.requirementType !== 'upgrade' && (
                  <Progress value={unlockProgress.progressPercentage} className="h-2" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Desbloqueie +{unlockProgress.nextUnlock - unlockProgress.currentLimit} novos Odu ao completar!
              </p>
              {unlockProgress.requirementType === 'upgrade' && (
                <Button 
                  onClick={() => navigate("/subscription")} 
                  variant="hero" 
                  size="sm"
                  className="w-full"
                >
                  Ver Planos Premium
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Study Content */}
        {isLoadingNext ? (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">
                Preparando próximo Odu...
              </p>
              <p className="text-sm text-muted-foreground">
                {isRecycling ? "Reciclando Odus estudados..." : "Carregando novos cards..."}
              </p>
            </CardContent>
          </Card>
        ) : isShowingPresentation ? (
          // NOVO: Tela de apresentação para primeiro contato com Odu
          <OduPresentation
            oduId={currentOdu.id}
            numero={currentOdu.numero}
            nome={currentOdu.nome}
            texto_principal={currentOdu.texto_principal}
            verso={currentOdu.verso}
            verso_resumido={currentOdu.verso_resumido}
            significado={currentOdu.significado}
            contexto_historico={currentOdu.contexto_historico}
            onComplete={handlePresentationComplete}
            minReadingTime={30}
          />
        ) : mode === "flashcard" ? (
          <Flashcard
            key={`flashcard-${loopCount}-${singleOduExerciseIndex}-${currentFlashcardFocus}`}
            numero={currentOdu.numero}
            nome={currentOdu.nome}
            texto={getFlashcardContent().texto}
            verso={currentOdu.verso}
            versoResumido={getFlashcardContent().versoResumido}
            significado={getFlashcardContent().significado}
            onRate={handleFlashcardRate}
            currentRevisoes={currentMemorizationData.revisoes}
            currentStrength={currentMemorizationData.forca_memoria}
            status={currentMemorizationData.status}
            hideNumber={storyMode}
          />
        ) : mode === "quiz" && generateQuizQuestion ? (
          <Quiz 
            key={`quiz-${loopCount}-${singleOduExerciseIndex}`}
            question={generateQuizQuestion} 
            onAnswer={handleQuizAnswer} 
          />
        ) : mode === "cloze" && currentOdu.verso_resumido ? (
          <ClozeExercise
            key={`cloze-${loopCount}-${singleOduExerciseIndex}`}
            numero={currentOdu.numero}
            nome={currentOdu.nome}
            oduId={currentOdu.id}
            versoResumido={currentOdu.verso_resumido}
            significado={currentOdu.significado}
            onAnswer={handleClozeAnswer}
            onSkip={handleSkipExercise}
            hideNumber={storyMode}
          />
        ) : mode === "dragdrop" && currentOdu.verso_resumido ? (
          <DragDropWords
            key={`dragdrop-${loopCount}-${singleOduExerciseIndex}`}
            oduName={currentOdu.nome}
            oduNumber={currentOdu.numero}
            versoResumido={currentOdu.verso_resumido}
            onComplete={handleClozeAnswer}
            onSkip={handleSkipExercise}
          />
        ) : mode === "sentence-order" && currentOdu.verso_resumido ? (
          <SentenceOrderExercise
            key={`sentence-order-${loopCount}-${singleOduExerciseIndex}`}
            numero={currentOdu.numero}
            nome={currentOdu.nome}
            versoResumido={currentOdu.verso_resumido}
            onComplete={handleClozeAnswer}
            onSkip={handleSkipExercise}
          />
        ) : (
          // ✅ FALLBACK: Se modo não disponível, mostrar flashcard
          <Flashcard
            numero={currentOdu.numero}
            nome={currentOdu.nome}
            texto={currentOdu.texto_principal}
            verso={currentOdu.verso}
            versoResumido={currentOdu.verso_resumido}
            significado={currentOdu.significado}
            onRate={handleFlashcardRate}
            currentRevisoes={currentMemorizationData.revisoes}
            currentStrength={currentMemorizationData.forca_memoria}
            status={currentMemorizationData.status}
          />
        )}
      </div>
      
      {/* Single Odu Mode - Floating Finish Button */}
      {isSingleOduMode && !sessionComplete && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50">
          <Button 
            variant="default"
            size="lg"
            onClick={handleEndSession}
            className="shadow-xl bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Finalizar Sessão
            <Badge variant="secondary" className="ml-1 bg-green-800 text-white border-0">
              {loopCount > 0 ? `${loopCount} ciclos` : `${sessionStats.cardsStudied}`}
            </Badge>
          </Button>
        </div>
      )}
      
      {/* Session Controls - Floating UI (only for Phase mode) */}
      {!isSingleOduMode && (
        <SessionControls
          onEndSession={handleEndSession}
          onPauseSession={handlePauseSession}
          isPaused={isPaused}
          sessionStats={{
            cardsStudied: sessionStats.cardsStudied,
            totalCards: sessionMetrics.totalCards,
            correctAnswers: sessionMetrics.correctAnswers,
            wrongAnswers: sessionMetrics.wrongAnswers,
            startTime: sessionStats.startTime
          }}
          sessionRounds={sessionRounds}
          isSessionActive={isSessionActive}
        />
      )}
      </div>
    </ProtectedContent>
  );
}
