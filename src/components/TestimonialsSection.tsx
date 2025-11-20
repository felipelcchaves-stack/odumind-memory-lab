import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Bàbá Adésànyà",
    role: "Babalorixa - 15 anos de prática",
    content: "Memorizei 100 Odu em apenas 10 dias! O sistema de repetição espaçada é revolucionário.",
    avatar: "BA",
    rating: 5,
    result: "100 Odu em 10 dias",
  },
  {
    name: "Ìyá Ọ̀ṣun",
    role: "Professora de Ifá",
    content: "Finalmente consigo ensinar meus alunos de forma estruturada. Os mapas mentais são incríveis!",
    avatar: "IỌ",
    rating: 5,
    result: "256 Odu dominados",
  },
  {
    name: "João Silva",
    role: "Estudante há 3 anos",
    content: "Tentei decorar sozinho por anos. Com o Isesemind, aprendi mais em 2 semanas do que em 3 anos.",
    avatar: "JS",
    rating: 5,
    result: "150 Odu em 14 dias",
  },
  {
    name: "Maria Santos",
    role: "Iniciante no Ifá",
    content: "Nunca imaginei que seria possível aprender tão rápido. O método realmente funciona!",
    avatar: "MS",
    rating: 5,
    result: "80 Odu em 1 semana",
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <Badge variant="secondary" className="mb-4">
            Aprovado por Mestres e Estudantes
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold">
            Mais de{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              2.500 Estudantes
            </span>
            {" "}Confiam no Método
          </h2>
          <p className="text-lg text-muted-foreground">
            Veja o que nossos alunos têm a dizer sobre sua transformação
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="border-2 hover:border-primary/50 transition-smooth hover:shadow-medium animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6 space-y-4">
                {/* Quote Icon */}
                <Quote className="w-8 h-8 text-primary/20" />

                {/* Rating */}
                <div className="flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-sm text-muted-foreground italic">
                  "{testimonial.content}"
                </p>

                {/* Result Badge */}
                <Badge variant="secondary" className="font-semibold">
                  ✨ {testimonial.result}
                </Badge>

                {/* Author */}
                <div className="flex items-center gap-3 pt-2 border-t">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Social Proof Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">2.543</div>
            <p className="text-sm text-muted-foreground">Estudantes Ativos</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-secondary mb-2">256</div>
            <p className="text-sm text-muted-foreground">Odu Disponíveis</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-accent mb-2">14</div>
            <p className="text-sm text-muted-foreground">Dias em Média</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">98%</div>
            <p className="text-sm text-muted-foreground">Satisfação</p>
          </div>
        </div>
      </div>
    </section>
  );
};
