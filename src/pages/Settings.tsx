import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, Type, Gift, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import NotificationSettings from '@/components/NotificationSettings';
import DashboardHeader from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResetProgressDialog } from '@/components/ResetProgressDialog';
import StudyCalendar from '@/components/StudyCalendar';
import StudyPlanGenerator from '@/components/StudyPlanGenerator';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fontSize, setFontSize } = useAccessibility();
  const [usedCode, setUsedCode] = useState<{ referral_code: string; used_at: string; status: string } | null>(null);
  const [applyCodeInput, setApplyCodeInput] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUsedCode();
    }
  }, [user]);

  const loadUsedCode = async () => {
    try {
      const { data } = await supabase
        .from('referral_usage')
        .select('referral_code, used_at, status')
        .eq('referred_user_id', user?.id)
        .single();

      if (data) {
        setUsedCode(data);
      }
    } catch (error) {
      console.error('Error loading used code:', error);
    } finally {
      setLoading(false);
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
      await loadUsedCode();
    } catch (error: any) {
      console.error('Error applying code:', error);
      toast.error(error.message || 'Erro ao aplicar código');
    } finally {
      setApplyingCode(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <DashboardHeader />
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-4xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Personalize sua experiência de aprendizado
          </p>
        </div>

        <div className="space-y-6">
          {/* Referral Code Section */}
          {!loading && (
            !usedCode ? (
              <Card className="border-2 border-accent/30 bg-accent/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-accent" />
                    Código de Indicação
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
                      {applyingCode ? 'Aplicando...' : 'Aplicar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-green-500/30 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    Código de Indicação Aplicado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Código:</span>
                      <Badge variant="secondary" className="font-mono">{usedCode.referral_code}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Data:</span>
                      <span className="text-sm">{new Date(usedCode.used_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant={usedCode.status === 'converted' ? 'default' : 'secondary'}>
                        {usedCode.status === 'pending' ? '⏳ Aguardando' : '✅ Ativo'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Tamanho do Texto
              </CardTitle>
              <CardDescription>
                Ajuste o tamanho do texto para melhor leitura (ideal para todas as idades)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={fontSize} onValueChange={(value) => setFontSize(value as any)}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Selecione o tamanho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeno</SelectItem>
                  <SelectItem value="normal">Normal (Padrão)</SelectItem>
                  <SelectItem value="large">Grande (Mais fácil de ler)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                💡 Textos maiores facilitam a leitura para todas as idades
              </p>
            </CardContent>
          </Card>

          <StudyCalendar />
          
          <StudyPlanGenerator />
          
          <NotificationSettings />

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Zona de Perigo
              </CardTitle>
              <CardDescription>
                Ações irreversíveis que afetam permanentemente seu progresso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResetProgressDialog />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
