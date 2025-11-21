import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Book, Repeat, Sparkles, Trophy, Flame, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const onboardingSteps = [
  {
    icon: Book,
    title: 'Bem-vindo ao IseseMind! 🌟',
    description: 'Sua jornada para memorizar os 256 Odu Ifá começa aqui. Vamos conhecer as principais funcionalidades!',
    color: 'text-primary',
  },
  {
    icon: BookOpen,
    title: '256 Odu Ifá',
    description: 'Acesse todos os Odu organizados e estruturados. Estude o texto principal, narrativas, significados e exemplos práticos de cada Odu.',
    color: 'text-blue-500',
  },
  {
    icon: Repeat,
    title: 'Sistema de Revisão Inteligente',
    description: 'Nosso algoritmo de repetição espaçada calcula automaticamente o momento ideal para você revisar cada Odu, garantindo memorização duradoura.',
    color: 'text-green-500',
  },
  {
    icon: Sparkles,
    title: 'Rituais, Rezas e Invocações',
    description: 'Além dos Odu, explore uma biblioteca completa de rituais, rezas e invocações da tradição Yorubá para expandir seu conhecimento.',
    color: 'text-purple-500',
  },
  {
    icon: Flame,
    title: 'Streak e Consistência',
    description: 'Mantenha sua sequência de estudos diários! Quanto mais dias consecutivos você estudar, maior será seu streak e sua disciplina.',
    color: 'text-orange-500',
  },
  {
    icon: Trophy,
    title: 'Gamificação e Conquistas',
    description: 'Ganhe XP, desbloqueie badges e conquistas à medida que progride. Seu esforço é recompensado em cada etapa da jornada!',
    color: 'text-yellow-500',
  },
];

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const totalSteps = onboardingSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const CurrentIcon = onboardingSteps[currentStep].icon;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // NÃO marca onboarding como completo aqui
      // O DashboardTour vai marcar quando o usuário completar o tour
      
      // Celebração com confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success('🎉 Agora vamos conhecer o Dashboard!');
      
      // Sinaliza para iniciar o tour do dashboard
      localStorage.setItem('start_dashboard_tour', 'true');
      
      // Aguarda um pouco antes de fechar o modal
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Erro ao finalizar onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    
    try {
      // Ao pular, ainda marca como completo mas sinaliza para o tour
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user?.id);

      if (error) throw error;
      
      toast.info('Você pode rever o tour nas configurações a qualquer momento');
      onComplete();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      toast.error('Erro ao pular onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" 
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Passo {currentStep + 1} de {totalSteps}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              Pular
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Content */}
        <div className="text-center space-y-6 py-8">
          <div className="flex justify-center">
            <div className={`p-6 rounded-full bg-primary/10 ${onboardingSteps[currentStep].color}`}>
              <CurrentIcon className="w-16 h-16" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold">
              {onboardingSteps[currentStep].title}
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              {onboardingSteps[currentStep].description}
            </p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className="flex-1"
            >
              Voltar
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={loading}
            className="flex-1"
          >
            {currentStep === totalSteps - 1 
              ? (loading ? 'Finalizando...' : '🚀 Começar Jornada!')
              : 'Próximo'}
          </Button>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'w-8 bg-primary' 
                  : index < currentStep 
                    ? 'w-2 bg-primary/50' 
                    : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
