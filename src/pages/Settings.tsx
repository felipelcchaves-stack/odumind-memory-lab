import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, AlertTriangle } from 'lucide-react';
import NotificationSettings from '@/components/NotificationSettings';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductTour } from '@/hooks/useProductTour';
import { ResetProgressDialog } from '@/components/ResetProgressDialog';

export default function Settings() {
  const navigate = useNavigate();
  const { resetTour } = useProductTour();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <DashboardHeader />
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
          <Card>
            <CardHeader>
              <CardTitle>Tour da Plataforma</CardTitle>
              <CardDescription>
                Refaça o tour guiado para conhecer novamente todas as funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={resetTour} variant="outline" className="w-full sm:w-auto">
                <Play className="h-4 w-4 mr-2" />
                Refazer Tour da Plataforma
              </Button>
            </CardContent>
          </Card>
          
          <NotificationSettings />

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Zona de Perigo
              </CardTitle>
              <CardDescription>
                Ações irreversíveis que afetam permanentemente seu progresso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResetProgressDialog />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
