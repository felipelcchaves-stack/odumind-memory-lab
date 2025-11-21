import { CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface FirstStepsWidgetProps {
  hasCompletedFirstStudy: boolean;
  onStartStudy: () => void;
}

export function FirstStepsWidget({ hasCompletedFirstStudy, onStartStudy }: FirstStepsWidgetProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-primary shadow-medium bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          👋 Bem-vindo! Seus Primeiros Passos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span className="font-medium">1. Cadastro completo ✓</span>
          </div>
          
          <div className={`flex items-center gap-3 p-2 rounded-lg ${hasCompletedFirstStudy ? 'bg-background/50' : 'bg-primary/10'}`}>
            {hasCompletedFirstStudy ? (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={hasCompletedFirstStudy ? 'font-medium' : 'font-semibold'}>
              2. Faça seu primeiro estudo
            </span>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span>3. Explorar os 256 Odu e 50+ Rituais</span>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span>4. Praticar seu primeiro Ritual</span>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span>5. Configurar sua meta diária</span>
          </div>
        </div>

        {!hasCompletedFirstStudy ? (
          <Button 
            size="lg" 
            className="w-full mt-4 text-lg font-semibold" 
            onClick={onStartStudy}
          >
            🚀 Começar Meu Primeiro Estudo
          </Button>
        ) : (
          <div className="space-y-2 mt-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/biblioteca-yoruba')}
              >
                📚 Ver Biblioteca
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/settings')}
              >
                ⚙️ Configurar
              </Button>
            </div>
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => navigate('/biblioteca-yoruba?tab=rituais')}
            >
              🕯️ Explorar Rituais
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
