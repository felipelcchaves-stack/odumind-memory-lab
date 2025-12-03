import { useState } from 'react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useAuth } from '@/contexts/AuthContext';

export function ProfileCompletionChecker() {
  const { user } = useAuth();
  const { isProfileComplete, isOnboardingComplete, loading, refetch } = useProfileCompletion();
  
  // Proteção contra loop: uma vez que o modal foi completado nesta sessão, não mostra novamente
  const [hasCompletedProfileThisSession, setHasCompletedProfileThisSession] = useState(false);
  const [hasCompletedOnboardingThisSession, setHasCompletedOnboardingThisSession] = useState(false);

  const handleProfileComplete = () => {
    setHasCompletedProfileThisSession(true);
    refetch();
  };

  const handleOnboardingComplete = () => {
    setHasCompletedOnboardingThisSession(true);
    refetch();
  };

  // Mostra ProfileCompletionModal se perfil não está completo E não foi completado nesta sessão
  const shouldShowProfileModal = user && !loading && isProfileComplete === false && !hasCompletedProfileThisSession;
  
  // Mostra OnboardingModal se perfil está completo mas onboarding não E não foi completado nesta sessão
  const shouldShowOnboarding = user && !loading && isProfileComplete === true && isOnboardingComplete === false && !hasCompletedOnboardingThisSession;

  if (shouldShowProfileModal) {
    return (
      <ProfileCompletionModal 
        open={true}
        onComplete={handleProfileComplete}
      />
    );
  }

  if (shouldShowOnboarding) {
    return (
      <OnboardingModal 
        open={true}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return null;
}
