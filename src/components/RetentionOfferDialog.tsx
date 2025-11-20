import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertCircle, Gift, Sparkles, Clock, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface RetentionOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcceptOffer: () => Promise<void>;
  onDeclineOffer: () => Promise<void>;
  currentPlan: string;
  discountPercent: number;
  durationMonths: number;
  loading?: boolean;
}

export default function RetentionOfferDialog({
  open,
  onOpenChange,
  onAcceptOffer,
  onDeclineOffer,
  currentPlan,
  discountPercent,
  durationMonths,
  loading = false,
}: RetentionOfferDialogProps) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAcceptOffer();
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error('Erro ao aceitar oferta');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await onDeclineOffer();
      onOpenChange(false);
    } catch (error) {
      console.error('Error declining offer:', error);
      toast.error('Erro ao processar');
    } finally {
      setDeclining(false);
    }
  };

  // Calculate savings
  const planPrices: Record<string, number> = {
    'Akapo': 49.90,
    'Awo': 99.90,
    'Egbe': 129.90,
  };

  const currentPrice = planPrices[currentPlan] || 49.90;
  const discountAmount = (currentPrice * discountPercent) / 100;
  const newPrice = currentPrice - discountAmount;
  const totalSavings = discountAmount * durationMonths;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] gap-6">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-center mb-2">
            <div className="relative">
              <Gift className="h-16 w-16 text-primary animate-pulse" />
              <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
            </div>
          </div>
          
          <DialogTitle className="text-center text-2xl">
            Espere! Temos uma Oferta Especial para Você 🎁
          </DialogTitle>
          
          <DialogDescription className="text-center text-base">
            Antes de fazer downgrade, queremos oferecer um desconto exclusivo para você continuar com o plano <span className="font-semibold text-foreground">{currentPlan}</span>!
          </DialogDescription>
        </DialogHeader>

        {/* Offer Card */}
        <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-gradient-secondary">
                {discountPercent}% OFF
              </Badge>
              <span className="text-sm text-muted-foreground">por {durationMonths} meses</span>
            </div>
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Válido por 7 dias</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-sm text-muted-foreground line-through">
                R$ {currentPrice.toFixed(2)}
              </span>
              <span className="text-4xl font-bold text-primary">
                R$ {newPrice.toFixed(2)}
              </span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              Você economiza <span className="font-semibold text-primary">R$ {totalSavings.toFixed(2)}</span> nos próximos {durationMonths} meses!
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-primary/20">
            <p className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Você mantém todos os benefícios do plano {currentPlan}
            </p>
            <p className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Acesso completo aos 256 Odu Ifá
            </p>
            <p className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Recursos avançados de memorização com IA
            </p>
            <p className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Suporte prioritário
            </p>
          </div>
        </Card>

        {/* Warning about downgrade */}
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Se você fizer downgrade para Gratuito:
              </p>
              <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1 list-disc list-inside">
                <li>Terá acesso apenas a 5 Odu (de 256)</li>
                <li>Perderá recursos avançados de IA</li>
                <li>Perderá mapas mentais interativos</li>
                <li>Suporte limitado</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={accepting || declining || loading}
            className="w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            {declining ? 'Processando...' : 'Não, fazer downgrade'}
          </Button>
          
          <Button
            onClick={handleAccept}
            disabled={accepting || declining || loading}
            className="w-full sm:w-auto bg-gradient-secondary"
            size="lg"
          >
            <Gift className="mr-2 h-4 w-4" />
            {accepting ? 'Processando...' : `Sim! Quero ${discountPercent}% OFF`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
