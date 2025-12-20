import { useState, useCallback, useEffect } from "react";
import { Brain, Target, PenTool, Move, ListOrdered, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExercisePreviewCard } from "@/components/ExercisePreviewCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useFreePlanSettings } from "@/hooks/useFreePlanSettings";

// Texto real do Odu Ejiogbe para os previews
const SAMPLE_ODU = {
  nome: "Ejiogbe - Verso 1",
  versoResumido: "Em Ilé-Ifẹ̀, o ancião Bàbá Òjó vivia inquieto: de dia trabalhava e parecia firme, mas as noites eram pesadas, cheias de pensamentos e preocupações.",
};

// Preview do Flashcard
function FlashcardPreview() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground font-medium">Odu #1</div>
      <div className="bg-background rounded-lg p-3 border border-border shadow-sm">
        <div className="font-semibold text-sm text-foreground mb-2">{SAMPLE_ODU.nome}</div>
        <div className="text-xs text-muted-foreground line-clamp-3">
          {SAMPLE_ODU.versoResumido}
        </div>
      </div>
      <div className="flex justify-center gap-2 pt-2">
        <div className="w-8 h-1 rounded-full bg-destructive/50" />
        <div className="w-8 h-1 rounded-full bg-yellow-500/50" />
        <div className="w-8 h-1 rounded-full bg-primary/50" />
      </div>
    </div>
  );
}

// Preview do Quiz
function QuizPreview() {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground font-medium">Qual é este Odu?</div>
      <div className="space-y-1.5">
        {["Ejiogbe", "Oyeku", "Iwori", "Odi"].map((option, idx) => (
          <div
            key={option}
            className={cn(
              "text-xs px-3 py-2 rounded-md border transition-colors",
              idx === 0
                ? "bg-primary/10 border-primary text-primary font-medium"
                : "bg-background border-border text-foreground hover:bg-muted"
            )}
          >
            {option}
          </div>
        ))}
      </div>
    </div>
  );
}

// Preview do Cloze (Complete as lacunas)
function ClozePreview() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground font-medium">Complete a lacuna:</div>
      <div className="text-sm text-foreground leading-relaxed">
        Em Ilé-Ifẹ̀, o ancião{" "}
        <span className="inline-flex items-center justify-center min-w-16 h-6 border-b-2 border-primary bg-primary/5 rounded px-1">
          <span className="text-primary font-medium text-xs">Bàbá Òjó</span>
        </span>{" "}
        vivia inquieto...
      </div>
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs px-2 py-1 bg-muted rounded-md">Bàbá Òjó</span>
        <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">Òrúnmìlà</span>
      </div>
    </div>
  );
}

// Preview do Drag & Drop
function DragDropPreview() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground font-medium">Arraste as palavras:</div>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs px-2 py-1 bg-primary/10 border border-primary/30 rounded text-primary font-medium">ancião</span>
        <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground border border-transparent">vivia</span>
        <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground border border-transparent">inquieto</span>
      </div>
      <div className="border-2 border-dashed border-border rounded-lg p-2 flex items-center justify-center text-xs text-muted-foreground">
        Solte aqui
      </div>
    </div>
  );
}

// Preview de Ordenar Frase
function SentenceOrderPreview() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground font-medium">Ordene as frases:</div>
      <div className="space-y-1.5">
        {[
          { num: 1, text: "Em Ilé-Ifẹ̀...", correct: true },
          { num: 2, text: "...o ancião vivia inquieto", correct: true },
          { num: 3, text: "...as noites eram pesadas", correct: false },
        ].map((item) => (
          <div
            key={item.num}
            className={cn(
              "flex items-center gap-2 text-xs px-3 py-2 rounded-md border",
              item.correct
                ? "bg-primary/5 border-primary/30"
                : "bg-background border-border"
            )}
          >
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
              item.correct ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {item.num}
            </span>
            <span className="text-foreground">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const techniques = [
  {
    id: "flashcard",
    icon: Brain,
    title: "Flashcards Ativos",
    description: "Teste seu conhecimento antes de ver a resposta. O esforço mental fortalece a memória de longo prazo.",
    benefit: "+40% retenção",
    benefitColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    preview: <FlashcardPreview />,
  },
  {
    id: "quiz",
    icon: Target,
    title: "Quiz Interativo",
    description: "Identifique o Odu correto entre opções. Feedback imediato para cada resposta acelera o aprendizado.",
    benefit: "Gamificação",
    benefitColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    preview: <QuizPreview />,
  },
  {
    id: "cloze",
    icon: PenTool,
    title: "Complete as Lacunas",
    description: "Preencha palavras-chave que faltam no verso. Foca nos pontos mais importantes do texto.",
    benefit: "Foco direcionado",
    benefitColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    preview: <ClozePreview />,
  },
  {
    id: "dragdrop",
    icon: Move,
    title: "Arraste e Solte",
    description: "Encaixe cada palavra no lugar certo. Interação tátil que engaja e fixa o conhecimento.",
    benefit: "Cinestésico",
    benefitColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    preview: <DragDropPreview />,
  },
  {
    id: "order",
    icon: ListOrdered,
    title: "Ordene o Verso",
    description: "Coloque as frases na ordem correta. Entenda a estrutura narrativa e o fluxo do Odu.",
    benefit: "Compreensão",
    benefitColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    preview: <SentenceOrderPreview />,
  },
];

export function TechniqueShowcase() {
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const { isFreePlanEnabled } = useFreePlanSettings();

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrentIndex(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const scrollTo = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  const handleCtaClick = () => {
    if (isFreePlanEnabled) {
      navigate('/auth');
    } else {
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Veja Como Você Vai Aprender
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            5 métodos cientificamente comprovados para memorização, aplicados aos 256 Odu Ifá
          </p>
        </div>

        {/* Carousel */}
        <div className="relative px-4 md:px-12">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {techniques.map((technique) => (
                <CarouselItem key={technique.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <ExercisePreviewCard
                    icon={technique.icon}
                    title={technique.title}
                    description={technique.description}
                    benefit={technique.benefit}
                    benefitColor={technique.benefitColor}
                    previewComponent={technique.preview}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4" />
            <CarouselNext className="hidden md:flex -right-4" />
          </Carousel>
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-2 mt-8">
          {techniques.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                currentIndex === index
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Button
            size="lg"
            onClick={handleCtaClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all group"
          >
            {isFreePlanEnabled ? "Começar Agora - Grátis" : "Conhecer Planos"}
            <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            {isFreePlanEnabled 
              ? "Sem cartão de crédito • Acesso imediato"
              : "Escolha o plano ideal para você"
            }
          </p>
        </div>
      </div>
    </section>
  );
}
