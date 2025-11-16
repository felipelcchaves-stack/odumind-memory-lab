import { Card, CardContent } from "@/components/ui/card";
import { Brain, BookOpen, Target, Zap, Users, Trophy } from "lucide-react";
import memoryIllustration from "@/assets/memory-illustration.jpg";
import flashcardsIllustration from "@/assets/flashcards-illustration.jpg";

const features = [
  {
    icon: Brain,
    title: "Mapas Mentais Inteligentes",
    description: "Associe os Odu Ifá a imagens e conceitos poderosos para memorização rápida e duradoura.",
    color: "text-primary",
  },
  {
    icon: BookOpen,
    title: "Storytelling Envolvente",
    description: "Aprenda através das narrativas sagradas, transformando conhecimento em histórias memoráveis.",
    color: "text-secondary",
  },
  {
    icon: Target,
    title: "Repetição Espaçada",
    description: "Sistema científico que otimiza suas revisões no momento ideal para máxima retenção.",
    color: "text-accent",
  },
  {
    icon: Zap,
    title: "Flashcards Interativos",
    description: "Pratique com flashcards dinâmicos que se adaptam ao seu ritmo de aprendizado.",
    color: "text-primary",
  },
  {
    icon: Users,
    title: "Comunidade de Estudo",
    description: "Conecte-se com outros estudantes e mestres em uma comunidade vibrante.",
    color: "text-secondary",
  },
  {
    icon: Trophy,
    title: "Gamificação Motivadora",
    description: "Conquiste badges, suba de nível e acompanhe seu progresso de forma visual e envolvente.",
    color: "text-accent",
  },
];

const Features = () => {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Metodologias Científicas de{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Memorização
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Combinamos tradição ancestral com neurociência moderna para criar a experiência de aprendizado mais eficaz
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-2 hover:border-primary/50 transition-smooth hover:shadow-medium group"
            >
              <CardContent className="p-6 space-y-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-smooth`}>
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-2 gap-12 items-center mt-20">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold">
              Memória Potencializada com Tecnologia
            </h3>
            <p className="text-lg text-muted-foreground">
              Nosso sistema utiliza algoritmos de repetição espaçada baseados em pesquisas científicas para garantir que você revise cada Odu no momento ideal, maximizando a retenção de longo prazo.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span>Algoritmos adaptativos que aprendem com você</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span>Revisões otimizadas para economia de tempo</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span>Progresso rastreado com métricas detalhadas</span>
              </li>
            </ul>
          </div>
          <div className="relative">
            <img
              src={memoryIllustration}
              alt="Ilustração de memorização"
              className="rounded-2xl shadow-medium w-full"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mt-20">
          <div className="relative order-2 md:order-1">
            <img
              src={flashcardsIllustration}
              alt="Flashcards interativos"
              className="rounded-2xl shadow-medium w-full"
            />
          </div>
          <div className="space-y-6 order-1 md:order-2">
            <h3 className="text-3xl font-bold">
              Flashcards que Evoluem com Você
            </h3>
            <p className="text-lg text-muted-foreground">
              Nossos flashcards inteligentes se adaptam ao seu desempenho, focando nos Odu que você mais precisa revisar. Compatíveis com impressão física ou uso digital.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                </div>
                <span>Design frente e verso otimizado</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                </div>
                <span>Exportação para PDF e impressão</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                </div>
                <span>Modo de estudo interativo com feedback instantâneo</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
