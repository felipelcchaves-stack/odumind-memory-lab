import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GlossaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlossaryDialog({ open, onOpenChange }: GlossaryDialogProps) {
  const glossaryItems = [
    {
      title: 'O que é um Odu?',
      description: 'Odu são os 256 signos sagrados do Ifá, o sistema de adivinhação Yorubá. Cada Odu contém histórias, ensinamentos e sabedoria ancestral.'
    },
    {
      title: 'Como funciona a revisão?',
      description: 'Nosso sistema te lembra de revisar Odu no momento ideal para fortalecer sua memória. Quanto mais você acerta, mais tempo entre as revisões.'
    },
    {
      title: 'O que são Pontos de Estudo?',
      description: 'Pontos que você ganha ao estudar e revisar Odu. Quanto mais você aprende, mais pontos acumula!'
    },
    {
      title: 'O que significa "Dias Seguidos"?',
      description: 'É a sua sequência de dias estudando sem parar. Continue estudando todos os dias para manter sua sequência!'
    },
    {
      title: 'O que é Força da Memória?',
      description: 'Mostra o quanto você domina cada Odu. De 0 a 100, quanto maior o número, melhor você memorizou!'
    },
    {
      title: 'O que são Rituais?',
      description: 'Práticas sagradas da tradição Yorubá que complementam o conhecimento dos Odu. Você pode explorá-los na Biblioteca.'
    },
    {
      title: 'Como usar o Palácio da Memória?',
      description: 'É uma técnica poderosa onde você associa cada Odu a um lugar na sua mente, facilitando a memorização.'
    },
    {
      title: 'O que fazer quando esqueço um Odu?',
      description: 'Não se preocupe! É normal esquecer. O sistema vai te mostrar esse Odu com mais frequência até você dominar.'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">❓ Guia Rápido do Sistema</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {glossaryItems.map((item, index) => (
              <div key={index} className="space-y-2">
                <h4 className="text-lg font-bold text-primary">{item.title}</h4>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
