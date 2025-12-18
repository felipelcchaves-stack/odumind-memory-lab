import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useAuth } from '@/contexts/AuthContext';

// Rotas públicas onde o checker NÃO deve executar
const PUBLIC_ROUTES = ['/', '/auth', '/subscription', '/success', '/familia/aceitar'];

export function ProfileCompletionChecker() {
  const { user } = useAuth();
  const location = useLocation();
  const { isProfileComplete, isOnboardingComplete, loading, refetch } = useProfileCompletion();
  
  // Estados reativos para flags de sessão (localStorage como fonte inicial)
  const [profileCompletedSession, setProfileCompletedSession] = useState(() => 
    localStorage.getItem('profile_modal_completed_session') === 'true'
  );
  const [onboardingCompletedSession, setOnboardingCompletedSession] = useState(() => 
    localStorage.getItem('onboarding_modal_completed_session') === 'true'
  );
  
  // Flag para evitar re-abertura durante transição
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Estado local para controle de visibilidade dos modais
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Verificar se estamos em rota pública
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith('/familia/aceitar')
  );

  // Efeito para determinar qual modal mostrar
  useEffect(() => {
    console.log('[ProfileChecker] State check:', {
      isPublicRoute,
      user: !!user,
      loading,
      isProfileComplete,
      isOnboardingComplete,
      profileCompletedSession,
      onboardingCompletedSession,
      isTransitioning
    });

    // Não executar em rotas públicas, sem usuário, carregando ou em transição
    if (isPublicRoute || !user || loading || isTransitioning) {
      if (isPublicRoute) {
        setShowProfileModal(false);
        setShowOnboardingModal(false);
      }
      return;
    }

    // Se perfil não está completo E não foi completado nesta sessão
    if (isProfileComplete === false && !profileCompletedSession) {
      console.log('[ProfileChecker] Showing profile modal');
      setShowProfileModal(true);
      setShowOnboardingModal(false);
      return;
    }

    // Se perfil está completo mas onboarding não E não foi completado nesta sessão
    if ((isProfileComplete === true || profileCompletedSession) && 
        isOnboardingComplete === false && 
        !onboardingCompletedSession) {
      console.log('[ProfileChecker] Showing onboarding modal');
      setShowProfileModal(false);
      setShowOnboardingModal(true);
      return;
    }

    // Caso contrário, não mostrar nenhum modal
    console.log('[ProfileChecker] No modal needed');
    setShowProfileModal(false);
    setShowOnboardingModal(false);
  }, [user, loading, isProfileComplete, isOnboardingComplete, isPublicRoute, profileCompletedSession, onboardingCompletedSession, isTransitioning]);

  const handleProfileComplete = useCallback(async () => {
    console.log('[ProfileChecker] Profile completed, setting session flags');
    
    // Marcar transição para evitar re-abertura
    setIsTransitioning(true);
    
    // Atualizar estado PRIMEIRO (reativo) e localStorage
    setProfileCompletedSession(true);
    localStorage.setItem('profile_modal_completed_session', 'true');
    
    // Fechar modal imediatamente
    setShowProfileModal(false);
    
    // Aguardar DB sincronizar antes de refetch
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Refetch para verificar se onboarding é necessário
    await refetch();
    
    // Liberar transição
    setIsTransitioning(false);
  }, [refetch]);

  const handleOnboardingComplete = useCallback(async () => {
    console.log('[ProfileChecker] Onboarding completed, setting session flags');
    
    // Marcar transição
    setIsTransitioning(true);
    
    // Atualizar estado e localStorage
    setOnboardingCompletedSession(true);
    localStorage.setItem('onboarding_modal_completed_session', 'true');
    
    // Fechar modal imediatamente
    setShowOnboardingModal(false);
    
    // Aguardar DB sincronizar
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Refetch final
    await refetch();
    
    // Liberar transição
    setIsTransitioning(false);
  }, [refetch]);

  // Não renderizar nada em rotas públicas
  if (isPublicRoute) {
    return null;
  }

  return (
    <>
      <ProfileCompletionModal 
        open={showProfileModal}
        onComplete={handleProfileComplete}
      />
      <OnboardingModal 
        open={showOnboardingModal}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
}
