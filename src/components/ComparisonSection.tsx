import { Card, CardContent } from "@/components/ui/card";
import { Check, X } from "lucide-react";

const comparisons = [
  {
    traditional: "6-12 meses para memorizar",
    isesemind: "14 dias ou menos",
  },
  {
    traditional: "Cadernos desorganizados",
    isesemind: "Mapas mentais + IA",
  },
  {
    traditional: "Revisão manual confusa",
    isesemind: "Algoritmo inteligente",
  },
  {
    traditional: "Sem acompanhamento",
    isesemind: "Gráficos de progresso",
  },
  {
    traditional: "Estudo solitário",
    isesemind: "Comunidade ativa",
  },
  {
    traditional: "Sem motivação",
    isesemind: "Gamificação envolvente",
  },
];

export const ComparisonSection = () => {
  return (
    <section className="py-24 px-4 bg-background">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Por Que o{" "}
            <span className="bg-gradient-secondary bg-clip-text text-transparent">
              Isesemind
            </span>
            {" "}é Diferente?
          </h2>
          <p className="text-lg text-muted-foreground">
            Compare o método tradicional com nossa abordagem científica
          </p>
        </div>

        {/* Comparison Table */}
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mb-3">
                <X className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Método Tradicional</h3>
              <p className="text-sm text-muted-foreground">Lento, desorganizado e solitário</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-primary/5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Isesemind</h3>
              <p className="text-sm text-muted-foreground">Rápido, estruturado e colaborativo</p>
            </div>
          </div>

          <Card className="border-2">
            <CardContent className="p-0">
              {comparisons.map((item, index) => (
                <div
                  key={index}
                  className={`grid md:grid-cols-2 gap-4 p-6 ${
                    index !== comparisons.length - 1 ? "border-b" : ""
                  } hover:bg-muted/30 transition-smooth`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center mt-0.5">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-muted-foreground">{item.traditional}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <p className="font-semibold">{item.isesemind}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Bottom CTA */}
          <div className="mt-12 text-center p-8 rounded-xl bg-gradient-hero">
            <h3 className="text-2xl font-bold text-primary-foreground mb-4">
              Pronto para Transformar Seu Aprendizado?
            </h3>
            <p className="text-primary-foreground/90 mb-6">
              Junte-se a milhares de estudantes que já escolheram o caminho mais eficiente
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
