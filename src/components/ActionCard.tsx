import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface ActionCardProps {
  reviewCount: number;
  hasReviews: boolean;
}

export function ActionCard({ reviewCount, hasReviews }: ActionCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-4 border-primary shadow-2xl bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="pt-8 pb-8 text-center">
        <h2 className="text-3xl font-bold mb-4">
          📚 O Que Fazer Agora?
        </h2>
        
        {hasReviews ? (
          <>
            <p className="text-xl mb-6">
              Você tem <span className="text-primary font-bold text-4xl">{reviewCount}</span> Odu para revisar hoje!
            </p>
            <Button 
              size="lg" 
              className="text-2xl px-12 py-8 h-auto font-bold"
              onClick={() => navigate('/study')}
            >
              🚀 Revisar Agora
            </Button>
          </>
        ) : (
          <>
            <p className="text-xl mb-6">
              🎉 Parabéns! Você está em dia. Que tal explorar novos Odu?
            </p>
            <Button 
              size="lg" 
              className="text-2xl px-12 py-8 h-auto font-bold"
              onClick={() => navigate('/biblioteca-yoruba')}
            >
              📖 Explorar Biblioteca
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
