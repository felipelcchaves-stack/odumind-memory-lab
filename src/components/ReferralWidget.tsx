import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Share2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReferralSettings } from "@/hooks/useReferralSettings";

interface ReferralStats {
  total_referrals: number;
  successful_conversions: number;
}

export const ReferralWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isReferralEnabled, loading: settingsLoading } = useReferralSettings();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const { data } = await supabase
        .from('referral_program')
        .select('total_referrals, successful_conversions')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Não mostrar se desabilitado ou carregando
  if (loading || settingsLoading || !isReferralEnabled || !stats || stats.total_referrals === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              🎉 Você indicou {stats.total_referrals} pessoa{stats.total_referrals !== 1 ? 's' : ''}!
            </h3>
            {stats.successful_conversions > 0 && (
              <p className="text-sm text-muted-foreground mb-3">
                {stats.successful_conversions} já assinara{stats.successful_conversions !== 1 ? 'm' : 'ou'} Premium
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/indicar')}
                className="flex-1 sm:flex-none"
              >
                <Users className="w-4 h-4 mr-2" />
                Ver Detalhes
              </Button>
              <Button 
                size="sm"
                onClick={() => navigate('/indicar')}
                className="flex-1 sm:flex-none"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
