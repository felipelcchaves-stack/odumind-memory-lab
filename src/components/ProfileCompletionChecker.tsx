import { useEffect, useState } from 'react';
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
  
  // Estado local para controle de visibilidade dos modais
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Verificar se estamos em rota pública
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith('/familia/aceitar')
  );

  // Verificar flags de localStorage
  const profileCompletedSession = localStorage.getItem('profile_modal_completed_session') === 'true';
  const onboardingCompletedSession = localStorage.getItem('onboarding_modal_completed_session') === 'true';

  // Efeito para determinar qual modal mostrar
  useEffect(() => {
    // Não executar em rotas públicas ou sem usuário
    if (isPublicRoute || !user || loading) {
      setShowProfileModal(false);
      setShowOnboardingModal(false);
      return;
    }

    // Se perfil não está completo E não foi completado nesta sessão
    if (isProfileComplete === false && !profileCompletedSession) {
      setShowProfileModal(true);
      setShowOnboardingModal(false);
      return;
    }

    // Se perfil está completo mas onboarding não E não foi completado nesta sessão
    if (isProfileComplete === true && isOnboardingComplete === false && !onboardingCompletedSession) {
      setShowProfileModal(false);
      setShowOnboardingModal(true);
      return;
    }

    // Caso contrário, não mostrar nenhum modal
    setShowProfileModal(false);
    setShowOnboardingModal(false);
  }, [user, loading, isProfileComplete, isOnboardingComplete, isPublicRoute, profileCompletedSession, onboardingCompletedSession]);

  const handleProfileComplete = async () => {
    console.log('[ProfileChecker] Profile completed, setting localStorage flag');
    localStorage.setItem('profile_modal_completed_session', 'true');
    setShowProfileModal(false);
    
    // Aguardar um pouco para o DB sincronizar antes de refetch
    await new Promise(resolve => setTimeout(resolve, 500));
    refetch();
  };

  const handleOnboardingComplete = async () => {
    console.log('[ProfileChecker] Onboarding completed, setting localStorage flag');
    localStorage.setItem('onboarding_modal_completed_session', 'true');
    setShowOnboardingModal(false);
    
    // Aguardar um pouco para o DB sincronizar antes de refetch
    await new Promise(resolve => setTimeout(resolve, 500));
    refetch();
  };

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
