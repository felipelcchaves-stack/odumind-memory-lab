import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, BookOpen, Target, Trophy } from "lucide-react";

const levels = [
  {
    icon: GraduationCap,
    title: "Iniciante",
    subtitle: "Fundamentos dos Odu",
    description: "Comece sua jornada aprendendo os primeiros Odu Ifá através de histórias envolventes e mapas mentais visuais.",
    duration: "1-3 meses",
    odus: "16 Odu principais",
    color: "from-primary/20 to-primary/10",
  },
  {
    icon: BookOpen,
    title: "Intermediário",
    subtitle: "Aprofundamento",
    description: "Expanda seu conhecimento dominando as combinações e nuances de cada Odu com técnicas avançadas de memorização.",
    duration: "3-6 meses",
    odus: "64 Odu combinados",
    color: "from-secondary/20 to-secondary/10",
  },
  {
    icon: Target,
    title: "Avançado",
    subtitle: "Domínio Completo",
    description: "Alcance maestria completa com todos os 256 Odu, seus significados profundos e aplicações práticas.",
    duration: "6-12 meses",
    odus: "256 Odu completos",
    color: "from-accent/20 to-accent/10",
  },
  {
    icon: Trophy,
    title: "Mestre",
    subtitle: "Ensino e Transmissão",
    description: "Compartilhe seu conhecimento, crie seus próprios materiais e contribua para a comunidade de estudantes.",
    duration: "Contínuo",
    odus: "Todos + Criação",
    color: "from-primary/30 to-secondary/20",
  },
];

const LearningPath = () => {
  return (
    <section className="py-24 px-4 bg-background">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Sua Jornada de{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Aprendizado
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Um caminho estruturado do iniciante ao mestre, adaptado ao seu ritmo
          </p>
        </div>

        {/* Learning Path Timeline */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {levels.map((level, index) => (
            <Card
              key={index}
              className="border-2 hover:border-primary/50 transition-smooth hover:shadow-medium group relative overflow-hidden"
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${level.color} opacity-0 group-hover:opacity-100 transition-smooth`} />
              
              <CardContent className="p-6 space-y-4 relative z-10">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-smooth">
                  <level.icon className="w-7 h-7 text-primary-foreground" />
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-xl font-bold mb-1">{level.title}</h3>
                  <p className="text-sm text-muted-foreground">{level.subtitle}</p>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {level.description}
                </p>

                {/* Stats */}
                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duração:</span>
                    <span className="font-medium">{level.duration}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Conteúdo:</span>
                    <span className="font-medium">{level.odus}</span>
                  </div>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center justify-center pt-2">
                  <div className="text-2xl font-bold text-primary/30 group-hover:text-primary transition-smooth">
                    {index + 1}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center space-y-4">
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Não importa onde você está em sua jornada, o Odùmind se adapta ao seu nível e ritmo de aprendizado
          </p>
        </div>
      </div>
    </section>
  );
};

export default LearningPath;
