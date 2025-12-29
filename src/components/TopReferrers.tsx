import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

interface TopReferrer {
  user_id: string;
  nome: string | null;
  avatar_url: string | null;
  total_referrals: number;
  successful_conversions: number;
  rank: number;
}

export const TopReferrers = () => {
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopReferrers();
  }, []);

  const loadTopReferrers = async () => {
    try {
      // Get top 10 referrers
      const { data: referralData, error: referralError } = await supabase
        .from('referral_program')
        .select('user_id, total_referrals, successful_conversions')
        .gte('total_referrals', 1)
        .order('successful_conversions', { ascending: false })
        .order('total_referrals', { ascending: false })
        .limit(10);

      if (referralError) throw referralError;

      if (referralData && referralData.length > 0) {
        // Get user profiles for these referrers
        const userIds = referralData.map(r => r.user_id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, nome, avatar_url')
          .in('user_id', userIds);

        if (profileError) throw profileError;

        // Combine data
        const combined = referralData.map((ref, index) => {
          const profile = profileData?.find(p => p.user_id === ref.user_id);
          return {
            ...ref,
            nome: profile?.nome || 'Embaixador',
            avatar_url: profile?.avatar_url,
            rank: index + 1,
          };
        });

        setTopReferrers(combined);
      }
    } catch (error) {
      console.error('Error loading top referrers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-700" />;
      default:
        return null;
    }
  };

  if (loading || topReferrers.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            🏆 Top Embaixadores
          </Badge>
          <h2 className="text-3xl font-bold mb-4">
            Embaixadores do Ifá
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Conheça os estudantes que mais compartilham o conhecimento e ajudam a comunidade a crescer
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topReferrers.map((referrer) => (
            <Card 
              key={referrer.user_id}
              className={`relative overflow-hidden ${
                referrer.rank <= 3 ? 'border-2 border-primary/50' : ''
              }`}
            >
              {referrer.rank <= 3 && (
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent -mr-10 -mt-10 rounded-full" />
              )}
              
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={referrer.avatar_url || undefined} />
                      <AvatarFallback>
                        {referrer.nome?.charAt(0) || 'E'}
                      </AvatarFallback>
                    </Avatar>
                    {referrer.rank <= 3 && (
                      <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 shadow-md">
                        {getMedalIcon(referrer.rank)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">
                        {referrer.nome}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        #{referrer.rank}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">
                          {referrer.total_referrals}
                        </span>{' '}
                        indicaç{referrer.total_referrals !== 1 ? 'ões' : 'ão'}
                      </p>
                      {referrer.successful_conversions > 0 && (
                        <p>
                          <span className="font-medium text-primary">
                            {referrer.successful_conversions}
                          </span>{' '}
                          convers{referrer.successful_conversions !== 1 ? 'ões' : 'ão'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopReferrers;