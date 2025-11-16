import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import NotificationSettings from '@/components/NotificationSettings';

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-4xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Personalize sua experiência de aprendizado
          </p>
        </div>

        <div className="space-y-6">
          <NotificationSettings />
        </div>
      </div>
    </div>
  );
}
