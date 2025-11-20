import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const ReferralBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-hero rounded-lg p-4 flex items-center justify-between gap-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="bg-background/20 p-2 rounded-lg">
          <Gift className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="text-primary-foreground">
          <div className="font-semibold">Indique amigos e ganhe Premium grátis!</div>
          <div className="text-sm opacity-90">
            Ganhe 30 dias por cada amigo que assinar
          </div>
        </div>
      </div>
      <Button
        variant="secondary"
        onClick={() => navigate('/indicar')}
        className="whitespace-nowrap"
      >
        Meu Código
      </Button>
    </div>
  );
};
