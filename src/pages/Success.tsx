import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

const Success = () => {
  const navigate = useNavigate();
  const { loadSubscription } = useSubscription();

  useEffect(() => {
    // Reload subscription after successful payment
    loadSubscription();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
          <CardDescription>
            Sua assinatura foi ativada com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Agora você tem acesso completo a todos os recursos premium do Odùmind.
            Comece sua jornada de memorização dos 256 Odu de Ifá!
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/dashboard')} size="lg" className="w-full">
              Ir para o Dashboard
            </Button>
            <Button onClick={() => navigate('/odu')} variant="outline" size="lg" className="w-full">
              Explorar Biblioteca de Odu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
