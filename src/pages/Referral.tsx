import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useReferralSettings } from "@/hooks/useReferralSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Copy, Share2, Gift, Trophy, Clock, CheckCircle2, XCircle, Award, Users, Target, Lock } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

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

interface ReferralReward {
  id: string;
  reward_type: string;
  reward_description: string;
  claimed: boolean;
  expires_at: string | null;
  created_at: string;
}

interface UsedReferralCode {
  referral_code: string;
  used_at: string;
  status: string;
}

const Referral = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isReferralEnabled, loading: settingsLoading } = useReferralSettings();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistory[]>([]);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [usedCode, setUsedCode] = useState<UsedReferralCode | null>(null);
  const [applyCodeInput, setApplyCodeInput] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Redirecionar se sistema de indicações estiver desabilitado
    if (!settingsLoading && !isReferralEnabled) {
      navigate('/dashboard');
      toast.info('O sistema de indicações está temporariamente desativado.');
      return;
    }
    
    if (!settingsLoading && isReferralEnabled) {
      loadReferralData();
    }
  }, [user, navigate, settingsLoading, isReferralEnabled]);

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

      // Load rewards
      const { data: rewardsData } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (rewardsData) {
        setRewards(rewardsData);
      }

      // Check if user has used a referral code
      const { data: usedCodeData } = await supabase
        .from('referral_usage')
        .select('referral_code, used_at, status')
        .eq('referred_user_id', user?.id)
        .single();

      if (usedCodeData) {
        setUsedCode(usedCodeData);
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

  const applyReferralCode = async () => {
    if (!applyCodeInput.trim()) {
      toast.error('Digite um código de indicação');
      return;
    }

    try {
      setApplyingCode(true);
      const { data, error } = await supabase.functions.invoke('apply-referral-code', {
        body: { referral_code: applyCodeInput.toUpperCase().trim() }
      });

      if (error) throw error;

      toast.success(data.message || 'Código aplicado com sucesso! 🎉');
      setApplyCodeInput("");
      await loadReferralData();
    } catch (error: any) {
      console.error('Error applying code:', error);
      toast.error(error.message || 'Erro ao aplicar código');
    } finally {
      setApplyingCode(false);
    }
  };

  if (loading) {
    return (
      <>
        <DashboardHeader />
        <div className="container mx-auto p-4 md:p-8">
          <div className="text-center">Carregando...</div>
        </div>
      </>
    );
  }

  const unclaimedRewards = rewards.filter(r => !r.claimed);
  const pendingReferrals = history.filter(h => h.status === 'pending').length;
  const convertedReferrals = history.filter(h => h.status === 'converted').length;

  return (
    <>
      <DashboardHeader />
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sistema de Indicação</h1>
          <p className="text-muted-foreground">
            Indique amigos e ganhe recompensas incríveis!
          </p>
        </div>

      {/* Apply Received Code Section */}
      {!usedCode ? (
        <Card className="border-2 border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" />
              Recebeu um Código?
            </CardTitle>
            <CardDescription>
              Use um código de indicação para ganhar 7 dias Premium grátis!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Digite o código (ex: MARIA2024)" 
                value={applyCodeInput}
                onChange={(e) => setApplyCodeInput(e.target.value.toUpperCase())}
                disabled={applyingCode}
                className="flex-1"
              />
              <Button 
                onClick={applyReferralCode} 
                disabled={applyingCode || !applyCodeInput.trim()}
              >
                {applyingCode ? 'Aplicando...' : 'Aplicar Código'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Código Aplicado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Código usado:</span>
                <Badge variant="secondary" className="font-mono">{usedCode.referral_code}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data:</span>
                <span className="text-sm">{new Date(usedCode.used_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={usedCode.status === 'converted' ? 'default' : 'secondary'}>
                  {usedCode.status === 'pending' ? '⏳ Aguardando assinatura' : '✅ Benefício ativado'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Rewards Section */}
      {unclaimedRewards.length > 0 && (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Suas Recompensas Disponíveis
            </CardTitle>
            <CardDescription>
              Você tem {unclaimedRewards.length} recompensa(s) aguardando!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unclaimedRewards.map((reward) => (
                <div key={reward.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold">{reward.reward_description}</div>
                      <div className="text-sm text-muted-foreground">
                        Tipo: {reward.reward_type}
                      </div>
                      {reward.expires_at && (
                        <div className="text-sm text-muted-foreground">
                          Válido até: {new Date(reward.expires_at).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                    <Badge className="bg-green-500 text-white">Disponível ✅</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Resumo das Suas Indicações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold text-primary">{stats?.total_referrals || 0}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                <div className="text-2xl font-bold text-yellow-600">{pendingReferrals}</div>
                <div className="text-sm text-muted-foreground">Aguardando</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-green-600">{convertedReferrals}</div>
                <div className="text-sm text-muted-foreground">Convertidas</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-accent/10">
                <Trophy className="w-6 h-6 mx-auto mb-2 text-accent" />
                <div className="text-2xl font-bold text-accent">{stats?.total_earned_days || 0}</div>
                <div className="text-sm text-muted-foreground">Dias Ganhos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico Detalhado</CardTitle>
            <CardDescription>Acompanhe o status de cada indicação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {item.status === 'converted' ? (
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                      ) : item.status === 'pending' ? (
                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">
                          {item.status === 'converted' ? '🟢 Convertido' : 
                           item.status === 'pending' ? '🟡 Pendente' : '🔴 Expirado'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Usou seu código em {new Date(item.used_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <Badge variant={item.status === 'converted' ? 'default' : 'secondary'}>
                      {item.reward_value} dias
                    </Badge>
                  </div>
                  
                  {item.status === 'pending' && (
                    <div className="mt-2 p-2 rounded bg-yellow-500/5 border border-yellow-500/20">
                      <p className="text-sm text-muted-foreground">
                        💡 Aguardando assinatura Premium para liberar sua recompensa
                      </p>
                    </div>
                  )}
                  
                  {item.status === 'converted' && item.converted_at && (
                    <div className="mt-2 p-2 rounded bg-green-500/5 border border-green-500/20">
                      <p className="text-sm text-green-600">
                        🎁 Convertido em {new Date(item.converted_at).toLocaleDateString('pt-BR')} - +{item.reward_value} dias Premium ganhos!
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {history.length === 0 && stats?.referral_code && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma indicação ainda</h3>
            <p className="text-muted-foreground mb-4">
              Compartilhe seu código para começar a ganhar recompensas!
            </p>
            <Button onClick={shareReferral}>
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar Código
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
};

export default Referral;
