import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { usePublicReviews } from "@/hooks/useUserReview";
import { Skeleton } from "@/components/ui/skeleton";

// Fallback testimonials when there aren't enough real reviews
const fallbackTestimonials = [
  {
    id: "fallback-1",
    display_name: "Bàbá Adésànyà",
    comment: "Memorizei 100 Odu em apenas 10 dias! O sistema de repetição espaçada é revolucionário.",
    rating: 5,
  },
  {
    id: "fallback-2",
    display_name: "Ìyá Ọ̀ṣun",
    comment: "Finalmente consigo ensinar meus alunos de forma estruturada. Os mapas mentais são incríveis!",
    rating: 5,
  },
  {
    id: "fallback-3",
    display_name: "João Silva",
    comment: "Tentei decorar sozinho por anos. Com o Isesemind, aprendi mais em 2 semanas do que em 3 anos.",
    rating: 5,
  },
  {
    id: "fallback-4",
    display_name: "Maria Santos",
    comment: "Nunca imaginei que seria possível aprender tão rápido. O método realmente funciona!",
    rating: 5,
  },
];

const getInitials = (name: string | null) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

interface TestimonialCardProps {
  name: string | null;
  comment: string | null;
  rating: number;
}

const TestimonialCard = ({ name, comment, rating }: TestimonialCardProps) => (
  <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
    <CardContent className="p-6 flex flex-col h-full">
      <Quote className="h-8 w-8 text-primary/30 mb-4" />
      
      <p className="text-foreground/80 flex-1 mb-4 italic">
        "{comment}"
      </p>
      
      <div className="flex items-center gap-3 pt-4 border-t border-border/30">
        <Avatar className="h-10 w-10 border-2 border-primary/20">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <p className="font-semibold text-foreground">{name || "Usuário"}</p>
          <div className="flex gap-0.5">
            {[...Array(rating)].map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4 fill-yellow-400 text-yellow-400"
              />
            ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const TestimonialsSection = () => {
  const { reviews, totalCount, shouldShow, loading } = usePublicReviews();

  // Não renderiza nada até atingir o threshold de 50 avaliações 5 estrelas
  if (!loading && !shouldShow) {
    return null;
  }

  // Use real reviews when threshold is met
  const displayTestimonials = reviews.length > 0
    ? reviews.map(r => ({
        id: r.id,
        display_name: r.display_name,
        comment: r.comment,
        rating: r.rating
      }))
    : fallbackTestimonials;

  if (loading) {
    return (
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            O que nossos alunos dizem
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {shouldShow && totalCount > 0
              ? `Mais de ${totalCount} usuários avaliaram com 5 estrelas`
              : "Depoimentos de quem já transformou seu aprendizado"
            }
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {displayTestimonials.map((testimonial) => (
              <CarouselItem
                key={testimonial.id}
                className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3"
              >
                <TestimonialCard
                  name={testimonial.display_name}
                  comment={testimonial.comment}
                  rating={testimonial.rating}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-12" />
          <CarouselNext className="hidden md:flex -right-12" />
        </Carousel>
      </div>
    </section>
  );
};
