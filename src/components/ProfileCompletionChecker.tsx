import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';
import { useAuth } from '@/contexts/AuthContext';

export function ProfileCompletionChecker() {
  const { user } = useAuth();
  const { isProfileComplete, loading, refetch } = useProfileCompletion();

  // Só mostra o modal se:
  // 1. Usuário está autenticado
  // 2. Não está carregando
  // 3. Perfil não está completo (false)
  const shouldShowModal = user && !loading && isProfileComplete === false;

  return (
    <ProfileCompletionModal 
      open={!!shouldShowModal}
      onComplete={refetch}
    />
  );
}
