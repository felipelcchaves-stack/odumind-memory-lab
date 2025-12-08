import { Card, CardContent } from "@/components/ui/card";
import { Brain, BookOpen, Target, Zap, Users, Trophy } from "lucide-react";
import memoryIllustration from "@/assets/memory-illustration.jpg";
import flashcardsIllustration from "@/assets/flashcards-illustration.jpg";
import { useContentFeatures } from "@/hooks/useContentFeatures";
import { Skeleton } from "@/components/ui/skeleton";

const Features = () => {
  const { features, loading, isFeatureEnabled, getFeatureCount } = useContentFeatures();

  // Build dynamic features based on what's enabled
  const getFeaturesList = () => {
    const baseFeatures = [
      {
        icon: Brain,
        title: `${getFeatureCount('odu')} Odu Ifá Completos`,
        description: "Memorize todos os Odu sagrados com mapas mentais inteligentes e repetição espaçada científica.",
        color: "text-primary",
        enabled: true, // Odu is always enabled
      },
    ];

    if (isFeatureEnabled('rituais')) {
      baseFeatures.push({
        icon: BookOpen,
        title: `${getFeatureCount('rituais')}+ Rituais Tradicionais`,
        description: "Aprenda e pratique rituais yorubá autênticos com passo a passo detalhado e materiais necessários.",
        color: "text-secondary",
        enabled: true,
      });
    }

    if (isFeatureEnabled('rezas') || isFeatureEnabled('invocacoes')) {
      baseFeatures.push({
        icon: Target,
        title: "Rezas & Invocações",
        description: "Domine orações sagradas com áudio de pronúncia correta e transcrições fonéticas.",
        color: "text-accent",
        enabled: true,
      });
    }

    // Always show these core features
    baseFeatures.push(
      {
        icon: Zap,
        title: "Flashcards Inteligentes",
        description: "Sistema adaptativo que foca nos conteúdos que você mais precisa revisar para memorização eficaz.",
        color: "text-primary",
        enabled: true,
      },
      {
        icon: Users,
        title: "Biblioteca Unificada",
        description: "Acesso completo a biblioteca com os 256 Odu Ifá para acessar a qualquer hora.",
        color: "text-secondary",
        enabled: true,
      },
      {
        icon: Trophy,
        title: "Gamificação Completa",
        description: "Conquiste badges específicos para cada tipo de conteúdo: Ritualista, Devoto, Invocador e Mestre dos Odu.",
        color: "text-accent",
        enabled: true,
      }
    );

    return baseFeatures;
  };

  // Build dynamic subtitle text
  const getSubtitleText = () => {
    const parts = [`${getFeatureCount('odu')} Odu Ifá`];
    
    if (isFeatureEnabled('rituais')) {
      parts.push(`${getFeatureCount('rituais')} Rituais`);
    }
    if (isFeatureEnabled('rezas')) {
      parts.push(`${getFeatureCount('rezas')} Rezas`);
    }
    if (isFeatureEnabled('invocacoes')) {
      parts.push(`${getFeatureCount('invocacoes')} Invocações`);
    }

    return parts.join(' + ') + '. Tudo que você precisa em uma única plataforma.';
  };

  const featuresList = getFeaturesList();

  if (loading) {
    return (
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Biblioteca Completa de{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Conhecimento Yorubá
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {getSubtitleText()}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {featuresList.map((feature, index) => (
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
