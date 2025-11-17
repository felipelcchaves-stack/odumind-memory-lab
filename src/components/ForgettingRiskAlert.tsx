import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { useForgettingPrediction } from "@/hooks/useForgettingPrediction";
import { useNavigate } from "react-router-dom";

export default function ForgettingRiskAlert() {
  const { odusAtRisk, loading } = useForgettingPrediction();
  const navigate = useNavigate();

  if (loading) return null;
  if (odusAtRisk.length === 0) return null;

  // Mostrar apenas top 3 em risco
  const topRisk = odusAtRisk.slice(0, 3);

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Odus em Risco de Esquecimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AlertDescription className="text-sm text-muted-foreground">
          Baseado na Curva de Ebbinghaus, os Odus abaixo precisam de revisão urgente:
        </AlertDescription>

        {topRisk.map((odu) => (
          <Alert key={odu.id} variant="destructive" className="bg-background">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    #{odu.numero}
                  </Badge>
                  <span className="font-semibold">{odu.nome}</span>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-destructive" />
                    <span>Risco: {Math.round(odu.forgetProbability * 100)}%</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {odu.hoursUntilForgotten < 1 
                        ? 'Crítico agora!' 
                        : `${Math.round(odu.hoursUntilForgotten)}h até crítico`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Alert>
        ))}

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => navigate("/study")} 
            className="flex-1"
            variant="destructive"
          >
            Revisar Agora
          </Button>
          <Button 
            onClick={() => navigate("/odu-library")} 
            variant="outline"
            className="flex-1"
          >
            Ver Biblioteca
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          💡 Você receberá notificações preventivas antes do momento crítico
        </p>
      </CardContent>
    </Card>
  );
}
