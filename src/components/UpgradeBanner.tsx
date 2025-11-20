import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';

interface UpgradeBannerProps {
  message?: string;
}

const UpgradeBanner = ({ message = "Você está no plano gratuito. Faça upgrade para desbloquear todos os 256 Odu e recursos avançados!" }: UpgradeBannerProps) => {
  const { isAdmin, isColaborador } = useAdmin();
  const navigate = useNavigate();

  // Hide for admins/collaborators
  if (isAdmin || isColaborador) return null;

  return (
    <Alert className="mb-6 bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-2 border-orange-500/50 relative">
      
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Crown className="h-6 w-6 text-orange-500" />
        </div>
        <div className="flex-1">
          <AlertDescription className="text-base font-medium">
            {message}
          </AlertDescription>
        </div>
        <Button 
          variant="default"
          className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          onClick={() => navigate('/subscription')}
        >
          <Crown className="mr-2 h-4 w-4" />
          Fazer Upgrade
        </Button>
      </div>
    </Alert>
  );
};

export default UpgradeBanner;
