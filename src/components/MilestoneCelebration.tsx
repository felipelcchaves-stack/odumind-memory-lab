import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, Sparkles, Star, Flame } from "lucide-react";

export type MilestoneType = 'first_review' | 'second_review' | 'final_review' | 'strength_milestone' | 'memorized';

interface MilestoneCelebrationProps {
  milestone: MilestoneType;
  oduName: string;
  onComplete?: () => void;
}

const milestoneConfig = {
  first_review: {
    icon: Star,
    title: "Primeira Revisão Completa! ⭐",
    message: "Você completou a primeira revisão! Faltam 2 revisões para memorizar.",
    color: "blue",
    confettiConfig: {
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    },
    sound: 440 // Nota A4
  },
  second_review: {
    icon: Flame,
    title: "Segunda Revisão Completa! 🔥",
    message: "Você está quase lá! Falta apenas 1 revisão para memorizar.",
    color: "orange",
    confettiConfig: {
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    },
    sound: 523 // Nota C5
  },
  final_review: {
    icon: Trophy,
    title: "Terceira Revisão Completa! 🏆",
    message: "Excelente! Continue assim para fortalecer sua memória.",
    color: "purple",
    confettiConfig: {
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 }
    },
    sound: 659 // Nota E5
  },
  strength_milestone: {
    icon: Sparkles,
    title: "60% de Força Alcançada! ✨",
    message: "Sua memória está forte! Continue revisando para manter.",
    color: "yellow",
    confettiConfig: {
      particleCount: 60,
      spread: 65,
      colors: ['#FFD700', '#FFA500', '#FF6347']
    },
    sound: 587 // Nota D5
  },
  memorized: {
    icon: Trophy,
    title: "ODU MEMORIZADO! 🎉",
    message: "Parabéns! Você memorizou este Odu com sucesso!",
    color: "green",
    confettiConfig: {
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#00FF00', '#32CD32', '#228B22']
    },
    sound: 784 // Nota G5
  }
};

export default function MilestoneCelebration({ milestone, oduName, onComplete }: MilestoneCelebrationProps) {
  const config = milestoneConfig[milestone];
  const Icon = config.icon;

  useEffect(() => {
    // Play celebration sound
    playMilestoneSound(config.sound);

    // Trigger confetti
    triggerConfetti(config.confettiConfig);

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      onComplete?.();
    }, 4000);

    return () => clearTimeout(timer);
  }, [milestone]);

  const playMilestoneSound = (frequency: number) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio not available:', error);
    }
  };

  const triggerConfetti = (confettiConfig: any) => {
    // Main confetti burst
    confetti(confettiConfig);

    // Additional burst after 200ms for dramatic effect
    setTimeout(() => {
      confetti({
        ...confettiConfig,
        particleCount: confettiConfig.particleCount / 2,
        spread: confettiConfig.spread - 20
      });
    }, 200);

    // Side confetti for memorized milestone
    if (milestone === 'memorized') {
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 300);
    }
  };

  const getAlertClasses = () => {
    const baseClasses = "mb-4 border-2 animate-fade-in animate-scale-in";
    const colorClasses = {
      blue: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
      orange: "border-orange-500 bg-orange-50 dark:bg-orange-900/20",
      purple: "border-purple-500 bg-purple-50 dark:bg-purple-900/20",
      yellow: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
      green: "border-green-500 bg-green-50 dark:bg-green-900/20"
    };
    return `${baseClasses} ${colorClasses[config.color as keyof typeof colorClasses]}`;
  };

  const getIconClasses = () => {
    const colorClasses = {
      blue: "text-blue-600 dark:text-blue-400",
      orange: "text-orange-600 dark:text-orange-400",
      purple: "text-purple-600 dark:text-purple-400",
      yellow: "text-yellow-600 dark:text-yellow-400",
      green: "text-green-600 dark:text-green-400"
    };
    return `h-5 w-5 ${colorClasses[config.color as keyof typeof colorClasses]} animate-pulse`;
  };

  const getTextClasses = () => {
    const colorClasses = {
      blue: "text-blue-700 dark:text-blue-300",
      orange: "text-orange-700 dark:text-orange-300",
      purple: "text-purple-700 dark:text-purple-300",
      yellow: "text-yellow-700 dark:text-yellow-300",
      green: "text-green-700 dark:text-green-300"
    };
    return colorClasses[config.color as keyof typeof colorClasses];
  };

  return (
    <Alert className={getAlertClasses()}>
      <Icon className={getIconClasses()} />
      <AlertTitle className={`font-bold text-lg ${getTextClasses()}`}>
        {config.title}
      </AlertTitle>
      <AlertDescription className={`font-medium ${getTextClasses()}`}>
        {config.message}
        {milestone !== 'memorized' && (
          <div className="mt-2 text-sm opacity-80">
            Odu: <span className="font-semibold">{oduName}</span>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
