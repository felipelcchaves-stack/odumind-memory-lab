import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
import { LearningJourney } from '@/components/LearningJourney';
import { useLearningPhases, PhaseProgress, OduWithStatus } from '@/hooks/useLearningPhases';

export default function CaminhoIfa() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { 
    phaseProgress, 
    loading, 
    getOdusForPhase, 
    getOverallProgress,
    refresh 
  } = useLearningPhases();

  const [selectedPhase, setSelectedPhase] = useState<PhaseProgress | null>(null);
  const [selectedPhaseOdus, setSelectedPhaseOdus] = useState<OduWithStatus[]>([]);
  const [loadingOdus, setLoadingOdus] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Handle phase selection from URL
  useEffect(() => {
    const phaseSlug = searchParams.get('fase');
    if (phaseSlug && phaseProgress.length > 0) {
      const phase = phaseProgress.find(p => p.phase.slug === phaseSlug);
      if (phase && phase.status !== 'locked') {
        setSelectedPhase(phase);
      }
    }
  }, [searchParams, phaseProgress]);

  // Load Odus when phase is selected
  useEffect(() => {
    async function loadOdus() {
      if (!selectedPhase) {
        setSelectedPhaseOdus([]);
        return;
      }
      
      setLoadingOdus(true);
      try {
        const odus = await getOdusForPhase(selectedPhase.phase.id);
        setSelectedPhaseOdus(odus);
      } finally {
        setLoadingOdus(false);
      }
    }
    
    loadOdus();
  }, [selectedPhase, getOdusForPhase]);

  const handlePhaseSelect = useCallback((phaseId: string) => {
    const phase = phaseProgress.find(p => p.phase.id === phaseId);
    if (phase && phase.status !== 'locked') {
      if (selectedPhase?.phase.id === phaseId) {
        // Deselect if clicking the same phase
        setSelectedPhase(null);
        setSearchParams({});
      } else {
        setSelectedPhase(phase);
        setSearchParams({ fase: phase.phase.slug });
      }
    }
  }, [phaseProgress, selectedPhase, setSearchParams]);

  const handleStartStudy = useCallback((phaseSlug: string) => {
    // Navigate to study session with phase filter
    navigate(`/study?fase=${phaseSlug}`);
  }, [navigate]);

  const overallProgress = getOverallProgress();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        
        <main className="container mx-auto px-4 py-6 pb-24">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Caminho de Ifá
            </h1>
            <p className="text-muted-foreground">
              Sua jornada estruturada para memorizar os 256 Odu. 
              Complete cada fase antes de avançar para a próxima.
            </p>
          </div>

          {/* Learning Journey Component */}
          <LearningJourney
            phaseProgress={phaseProgress}
            loading={loading}
            overallProgress={overallProgress}
            onPhaseSelect={handlePhaseSelect}
            selectedPhase={selectedPhase}
            selectedPhaseOdus={selectedPhaseOdus}
            loadingOdus={loadingOdus}
            onStartStudy={handleStartStudy}
          />
        </main>
      </div>
    </>
  );
}
