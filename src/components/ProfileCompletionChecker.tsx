import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useAuth } from '@/contexts/AuthContext';

export function ProfileCompletionChecker() {
  const { user } = useAuth();
  const { isProfileComplete, isOnboardingComplete, loading, refetch } = useProfileCompletion();

  // Mostra ProfileCompletionModal se perfil não está completo
  const shouldShowProfileModal = user && !loading && isProfileComplete === false;
  
  // Mostra OnboardingModal se perfil está completo mas onboarding não
  const shouldShowOnboarding = user && !loading && isProfileComplete === true && isOnboardingComplete === false;

  if (shouldShowProfileModal) {
    return (
      <ProfileCompletionModal 
        open={true}
        onComplete={refetch}
      />
    );
  }

  if (shouldShowOnboarding) {
    return (
      <OnboardingModal 
        open={true}
        onComplete={refetch}
      />
    );
  }

  return null;
}
