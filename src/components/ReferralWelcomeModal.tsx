import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const ReferralWelcomeModal = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkFirstLogin();
  }, [user]);

  const checkFirstLogin = async () => {
    if (!user) return;

    // Check if user already used a referral code
    const { data: usedCode } = await supabase
      .from('referral_usage')
      .select('id')
      .eq('referred_user_id', user.id)
      .single();

    if (usedCode) return;

    // Check if user just signed up (created less than 1 minute ago)
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      const createdAt = new Date(profile.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

      if (diffMinutes < 2) {
        setOpen(true);
      }
    }
  };

  const handleApplyCode = async () => {
    if (!referralCode.trim()) {
      toast.error('Digite um código de indicação');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('apply-referral-code', {
        body: { referral_code: referralCode.toUpperCase() },
      });

      if (error) throw error;

      toast.success(data.message);
      setOpen(false);
    } catch (error: any) {
      console.error('Error applying code:', error);
      toast.error(error.message || 'Erro ao aplicar código');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Bem-vindo ao Isesemind!
          </DialogTitle>
          <DialogDescription>
            Ganhe 7 dias Premium grátis! Tem um código de indicação?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Input
            placeholder="Digite o código (ex: MARIA2024)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className="text-center text-lg"
            maxLength={20}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              Pular
            </Button>
            <Button
              onClick={handleApplyCode}
              disabled={loading || !referralCode.trim()}
              className="flex-1"
            >
              Aplicar Código
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Você pode adicionar um código depois em Configurações
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
