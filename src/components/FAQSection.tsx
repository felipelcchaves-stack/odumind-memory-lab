import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "É realmente possível memorizar 256 Odu em 14 dias?",
    answer: "Sim! Nosso método combina repetição espaçada, mapas mentais e storytelling - técnicas comprovadas cientificamente. A média dos nossos alunos é de 14 dias, mas muitos conseguem em menos tempo com dedicação diária de 30-60 minutos.",
  },
  {
    question: "Preciso ter conhecimento prévio sobre Ifá?",
    answer: "Não! O Isesemind foi projetado tanto para iniciantes quanto para praticantes avançados. Começamos do básico e gradualmente aumentamos a complexidade conforme você progride.",
  },
  {
    question: "Funciona no celular e tablet?",
    answer: "Sim! Nossa plataforma é 100% responsiva e funciona perfeitamente em computadores, tablets e smartphones. Você pode estudar onde e quando quiser, com sincronização automática do progresso.",
  },
  {
    question: "Posso cancelar minha assinatura quando quiser?",
    answer: "Sim, sem burocracia! Você pode cancelar sua assinatura a qualquer momento. Não há taxa de cancelamento e você continua com acesso até o final do período pago.",
  },
  {
    question: "Tem garantia de devolução?",
    answer: "Sim! Oferecemos 7 dias de garantia incondicional. Se você não estiver satisfeito por qualquer motivo, devolvemos 100% do seu investimento, sem perguntas.",
  },
  {
    question: "Como funciona o sistema de repetição espaçada?",
    answer: "O algoritmo calcula o momento ideal para você revisar cada Odu, baseado na curva do esquecimento. Quanto melhor você conhece um Odu, maior o intervalo entre revisões, otimizando seu tempo de estudo.",
  },
  {
    question: "Posso usar o Isesemind para ensinar meus alunos?",
    answer: "Sim! O plano Profissional foi criado especialmente para professores e mestres, com funcionalidades exclusivas para acompanhamento de turmas e criação de conteúdo personalizado.",
  },
  {
    question: "Os conteúdos são autênticos e respeitam a tradição?",
    answer: "Absolutamente! Todo o conteúdo é revisado por babalaôs e ialorixás experientes, garantindo a fidelidade à tradição oral Yorubá enquanto utilizamos tecnologia moderna para facilitar o aprendizado.",
  },
];

export const FAQSection = () => {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-4xl">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Perguntas Frequentes</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            Tire Suas{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Dúvidas
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            As respostas que você precisa antes de começar sua jornada
          </p>
        </div>

        {/* FAQ Accordion */}
        <Card className="border-2 p-6">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left hover:text-primary transition-colors">
                  <span className="font-semibold">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        {/* Bottom Help Text */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Ainda tem dúvidas?{" "}
            <a href="mailto:contato@isesemind.com" className="text-primary hover:underline font-semibold">
              Entre em contato conosco
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};
