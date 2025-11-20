import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Copy, Share2, Gift, Trophy, Clock, CheckCircle2, XCircle } from "lucide-react";

interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  successful_conversions: number;
  total_earned_days: number;
}

interface ReferralHistory {
  id: string;
  referred_user_id: string;
  status: string;
  used_at: string;
  converted_at: string | null;
  reward_value: number;
}

const Referral = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistory[]>([]);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadReferralData();
  }, [user, navigate]);

  const loadReferralData = async () => {
    try {
      setLoading(true);

      // Load referral program stats
      const { data: programData } = await supabase
        .from('referral_program')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (programData) {
        setStats(programData);
      }

      // Load referral history
      const { data: historyData } = await supabase
        .from('referral_usage')
        .select('*')
        .eq('referrer_id', user?.id)
        .order('used_at', { ascending: false });

      if (historyData) {
        setHistory(historyData);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    try {
      setGeneratingCode(true);
      const { data, error } = await supabase.functions.invoke('generate-referral-code');

      if (error) throw error;

      setStats(prev => prev ? { ...prev, referral_code: data.referral_code } : {
        referral_code: data.referral_code,
        total_referrals: 0,
        successful_conversions: 0,
        total_earned_days: 0,
      });

      toast.success('Código de indicação gerado com sucesso!');
    } catch (error) {
      console.error('Error generating code:', error);
      toast.error('Erro ao gerar código de indicação');
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyToClipboard = () => {
    if (stats?.referral_code) {
      navigator.clipboard.writeText(stats.referral_code);
      toast.success('Código copiado!');
    }
  };

  const shareReferral = () => {
    const text = `Use meu código ${stats?.referral_code} para ganhar 7 dias Premium grátis no Isesemind!`;
    const url = `${window.location.origin}/auth?ref=${stats?.referral_code}`;
    
    if (navigator.share) {
      navigator.share({ title: 'Isesemind', text, url });
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success('Link copiado!');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Sistema de Indicação</h1>
        <p className="text-muted-foreground">
          Indique amigos e ganhe recompensas incríveis!
        </p>
      </div>

      {/* My Referral Code */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Meu Código de Indicação
          </CardTitle>
          <CardDescription>
            Compartilhe seu código e ganhe recompensas quando seus amigos se cadastrarem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!stats?.referral_code ? (
            <Button 
              onClick={generateReferralCode} 
              disabled={generatingCode}
              size="lg"
              className="w-full"
            >
              Gerar Meu Código de Indicação
            </Button>
          ) : (
            <>
              <div className="flex gap-2">
                <Input 
                  value={stats.referral_code} 
                  readOnly 
                  className="text-2xl font-bold text-center"
                />
                <Button onClick={copyToClipboard} variant="outline" size="icon">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button onClick={shareReferral} variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{stats.total_referrals}</div>
                  <div className="text-sm text-muted-foreground">Indicações</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary">{stats.successful_conversions}</div>
                  <div className="text-sm text-muted-foreground">Conversões</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">{stats.total_earned_days}</div>
                  <div className="text-sm text-muted-foreground">Dias Ganhos</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Seu amigo ganha</div>
                <div className="text-sm text-muted-foreground">7 dias Premium grátis ao usar seu código</div>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <div className="bg-secondary/10 p-2 rounded-lg">
                <Trophy className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="font-semibold">Você ganha</div>
                <div className="text-sm text-muted-foreground">
                  30 dias Premium grátis + Badge "Embaixador do Ifá" quando seu amigo assinar
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Indicações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {item.status === 'converted' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : item.status === 'pending' ? (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        {item.status === 'converted' ? 'Convertido' : 
                         item.status === 'pending' ? 'Pendente' : 'Expirado'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(item.used_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <Badge variant={item.status === 'converted' ? 'default' : 'secondary'}>
                    {item.reward_value} dias
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Referral;
