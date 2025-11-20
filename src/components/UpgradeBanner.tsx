import { Crown, Zap, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UpgradeBannerProps {
  message?: string;
}

// A/B Test Variant Type
type VariantType = typeof AB_TEST_VARIANTS[number];

// A/B Test Variants
const AB_TEST_VARIANTS = [
  {
    id: 'control',
    message: "Você está no plano gratuito. Faça upgrade para desbloquear todos os 256 Odu e recursos avançados!",
    ctaText: "Fazer Upgrade",
    icon: Crown,
    gradient: "from-orange-500/20 to-orange-600/20",
    borderColor: "border-orange-500/50"
  },
  {
    id: 'urgency',
    message: "⚡ Apenas 5 Odu desbloqueados! Libere acesso total aos 256 Odu agora mesmo.",
    ctaText: "Desbloquear Agora",
    icon: Zap,
    gradient: "from-yellow-500/20 to-orange-600/20",
    borderColor: "border-yellow-500/50"
  },
  {
    id: 'social_proof',
    message: "Junte-se a +2.500 estudantes que já dominam todos os 256 Odu com o plano Premium!",
    ctaText: "Quero Premium",
    icon: Star,
    gradient: "from-purple-500/20 to-pink-600/20",
    borderColor: "border-purple-500/50"
  },
  {
    id: 'benefit',
    message: "Memorize 256 Odu em 14 dias + Mapas Mentais + IA + Revisão Inteligente = Plano Premium",
    ctaText: "Ver Planos",
    icon: TrendingUp,
    gradient: "from-blue-500/20 to-cyan-600/20",
    borderColor: "border-blue-500/50"
  }
] as const;

const UpgradeBanner = ({ message: customMessage }: UpgradeBannerProps) => {
  const { isAdmin, isColaborador } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [variant, setVariant] = useState<VariantType>(AB_TEST_VARIANTS[0]);

  // A/B Test: Select and persist variant
  useEffect(() => {
    const getOrAssignVariant = () => {
      // Check if user already has a variant assigned
      const storedVariantId = localStorage.getItem('ab_test_upgrade_banner');
      
      if (storedVariantId) {
        const storedVariant = AB_TEST_VARIANTS.find(v => v.id === storedVariantId);
        if (storedVariant) {
          setVariant(storedVariant);
          return;
        }
      }

      // Assign random variant (25% chance each)
      const randomVariant = AB_TEST_VARIANTS[Math.floor(Math.random() * AB_TEST_VARIANTS.length)];
      localStorage.setItem('ab_test_upgrade_banner', randomVariant.id);
      setVariant(randomVariant);

      // Track variant assignment
      if (user) {
        supabase
          .from('gamification_logs')
          .insert({
            user_id: user.id,
            tipo_evento: 'ab_test_banner_assigned',
            valor: 0,
            detalhes: { variant_id: randomVariant.id }
          })
          .then(() => console.log('[AB-TEST] Variant assigned:', randomVariant.id));
      }
    };

    getOrAssignVariant();
  }, [user]);

  // Hide for admins/collaborators
  if (isAdmin || isColaborador) return null;

  const handleUpgradeClick = () => {
    // Track CTA click for A/B test
    if (user) {
      supabase
        .from('gamification_logs')
        .insert({
          user_id: user.id,
          tipo_evento: 'ab_test_banner_click',
          valor: 0,
          detalhes: { variant_id: variant.id }
        })
        .then(() => console.log('[AB-TEST] CTA clicked:', variant.id));
    }
    
    navigate('/subscription');
  };

  const Icon = variant.icon;
  const displayMessage = customMessage || variant.message;

  return (
    <Alert className={`mb-6 bg-gradient-to-r ${variant.gradient} border-2 ${variant.borderColor} relative`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Icon className={`h-6 w-6 ${variant.id === 'urgency' ? 'text-yellow-500' : variant.id === 'social_proof' ? 'text-purple-500' : variant.id === 'benefit' ? 'text-blue-500' : 'text-orange-500'}`} />
        </div>
        <div className="flex-1">
          <AlertDescription className="text-base font-medium">
            {displayMessage}
          </AlertDescription>
        </div>
        <Button 
          variant="default"
          className={`flex-shrink-0 ${
            variant.id === 'urgency' ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700' :
            variant.id === 'social_proof' ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700' :
            variant.id === 'benefit' ? 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700' :
            'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
          }`}
          onClick={handleUpgradeClick}
        >
          <Icon className="mr-2 h-4 w-4" />
          {variant.ctaText}
        </Button>
      </div>
    </Alert>
  );
};

export default UpgradeBanner;
