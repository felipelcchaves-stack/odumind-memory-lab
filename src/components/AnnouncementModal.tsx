import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info, Sparkles, AlertTriangle, Gift } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AnnouncementModalProps {
  open: boolean;
  onClose: () => void;
  announcement: {
    titulo: string;
    conteudo: string;
    tipo: 'info' | 'novidade' | 'alerta' | 'promocao';
  } | null;
}

const tipoConfig = {
  info: {
    icon: Info,
    label: 'Informação',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  novidade: {
    icon: Sparkles,
    label: 'Novidade',
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  },
  alerta: {
    icon: AlertTriangle,
    label: 'Alerta',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  promocao: {
    icon: Gift,
    label: 'Promoção',
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
};

export function AnnouncementModal({ open, onClose, announcement }: AnnouncementModalProps) {
  if (!announcement) return null;

  const config = tipoConfig[announcement.tipo];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${config.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
          </div>
          <DialogTitle className="text-2xl">{announcement.titulo}</DialogTitle>
        </DialogHeader>
        
        <DialogDescription asChild>
          <div className="prose prose-sm dark:prose-invert max-w-none py-4">
            <ReactMarkdown>{announcement.conteudo}</ReactMarkdown>
          </div>
        </DialogDescription>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} className="min-w-[120px]">
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
