import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, AlertTriangle, Type } from 'lucide-react';
import NotificationSettings from '@/components/NotificationSettings';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductTour } from '@/hooks/useProductTour';
import { ResetProgressDialog } from '@/components/ResetProgressDialog';
import StudyCalendar from '@/components/StudyCalendar';
import StudyPlanGenerator from '@/components/StudyPlanGenerator';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Settings() {
  const navigate = useNavigate();
  const { resetTour } = useProductTour();
  const { fontSize, setFontSize } = useAccessibility();

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
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Tamanho do Texto
              </CardTitle>
              <CardDescription>
                Ajuste o tamanho do texto para melhor leitura (ideal para todas as idades)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={fontSize} onValueChange={(value) => setFontSize(value as any)}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Selecione o tamanho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeno</SelectItem>
                  <SelectItem value="normal">Normal (Padrão)</SelectItem>
                  <SelectItem value="large">Grande (Mais fácil de ler)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                💡 Textos maiores facilitam a leitura para todas as idades
              </p>
            </CardContent>
          </Card>

          <StudyCalendar />
          
          <StudyPlanGenerator />
          
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
