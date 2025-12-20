import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, TrendingUp, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUrgencySettings } from "@/hooks/useUrgencySettings";

export const UrgencySection = () => {
  const navigate = useNavigate();
  const { settings, loading, getTimeRemaining } = useUrgencySettings();
  
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59
  });

  useEffect(() => {
    if (!settings.enabled) return;

    const updateTimer = () => {
      const remaining = getTimeRemaining();
      if (remaining <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      
      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [settings.enabled, settings.endDate, getTimeRemaining]);

  if (loading || !settings.enabled) return null;

  // Replace {spots} placeholder in title
  const formattedTitle = settings.title.replace(/{spots}/g, String(settings.spotsRemaining));

  return (
    <section className="py-24 px-4 bg-gradient-hero relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10" />

      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto">
          <Card className="border-4 border-primary/20 shadow-2xl bg-background/95 backdrop-blur">
            <CardContent className="p-8 md:p-12 space-y-8">
              {/* Urgency Badge */}
              <div className="text-center">
                <Badge variant="destructive" className="text-sm px-4 py-2 animate-pulse">
                  🔥 Oferta por Tempo Limitado
                </Badge>
              </div>

              {/* Main Heading */}
              <div className="text-center space-y-4">
                {settings.showSpots && (
                  <h2 className="text-3xl md:text-5xl font-bold">
                    {formattedTitle.split(String(settings.spotsRemaining)).map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <span className="bg-gradient-secondary bg-clip-text text-transparent">
                            {settings.spotsRemaining}
                          </span>
                        )}
                      </span>
                    ))}
                  </h2>
                )}
                {!settings.showSpots && (
                  <h2 className="text-3xl md:text-5xl font-bold">{formattedTitle}</h2>
                )}
                {settings.showTimer && (
                  <p className="text-lg text-muted-foreground">
                    {settings.subtitle}
                  </p>
                )}
              </div>

              {/* Countdown Timer */}
              {settings.showTimer && (
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                  <div className="text-center p-4 rounded-lg bg-muted/50 border-2 border-border">
                    <div className="text-4xl font-bold text-primary mb-1">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">Horas</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50 border-2 border-border">
                    <div className="text-4xl font-bold text-primary mb-1">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">Minutos</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50 border-2 border-border">
                    <div className="text-4xl font-bold text-primary mb-1">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">Segundos</div>
                  </div>
                </div>
              )}

              {/* Social Proof */}
              {settings.showSocialProof && (
                <div className="grid md:grid-cols-3 gap-4 py-6 border-y">
                  <div className="flex items-center gap-3 justify-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold">2.543</div>
                      <div className="text-xs text-muted-foreground">Estudantes Ativos</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-center">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <div className="font-bold">+127</div>
                      <div className="text-xs text-muted-foreground">Novos Esta Semana</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-center">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <div className="font-bold">14 dias</div>
                      <div className="text-xs text-muted-foreground">Tempo Médio</div>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="text-center space-y-4">
                <Button size="lg" variant="hero" className="text-lg px-12 py-6 h-auto" onClick={() => navigate('/auth')}>
                  <Clock className="w-5 h-5 mr-2" />
                  Garantir Minha Vaga Agora
                </Button>
                <p className="text-sm text-muted-foreground">
                  ✅ Sem compromisso • 7 dias de garantia • Cancele quando quiser
                </p>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
                <Badge variant="outline" className="text-xs">
                  🔒 Pagamento Seguro
                </Badge>
                <Badge variant="outline" className="text-xs">
                  ✅ 7 Dias de Garantia
                </Badge>
                <Badge variant="outline" className="text-xs">
                  ⭐ 98% Satisfação
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
