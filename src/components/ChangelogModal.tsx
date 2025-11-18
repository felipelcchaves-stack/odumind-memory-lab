import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, Wrench, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

interface ChangelogItem {
  tipo: "novo" | "melhoria" | "correcao";
  titulo: string;
  descricao: string;
  icone?: string;
}

interface ChangelogVersion {
  id: string;
  version: string;
  titulo: string;
  release_date: string;
  items: ChangelogItem[];
  destaque: boolean;
}

interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
  changelog: ChangelogVersion | null;
  onMarkAsViewed: () => void;
}

const getTypeIcon = (tipo: string) => {
  switch (tipo) {
    case "novo":
      return <Sparkles className="h-5 w-5 text-primary" />;
    case "melhoria":
      return <Zap className="h-5 w-5 text-accent" />;
    case "correcao":
      return <Wrench className="h-5 w-5 text-muted-foreground" />;
    default:
      return null;
  }
};

const getTypeBadge = (tipo: string) => {
  switch (tipo) {
    case "novo":
      return <Badge className="bg-primary">✨ Novo</Badge>;
    case "melhoria":
      return <Badge className="bg-accent">🚀 Melhoria</Badge>;
    case "correcao":
      return <Badge variant="secondary">🔧 Correção</Badge>;
    default:
      return null;
  }
};

export default function ChangelogModal({
  open,
  onClose,
  changelog,
  onMarkAsViewed,
}: ChangelogModalProps) {
  const navigate = useNavigate();

  console.log('[ChangelogModal] Renderizando com:', { open, hasChangelog: !!changelog });

  if (!changelog) {
    console.log('[ChangelogModal] Sem changelog para exibir');
    return null;
  }

  const handleViewAll = () => {
    onMarkAsViewed();
    navigate("/novidades");
  };

  const groupedItems = changelog.items.reduce(
    (acc, item) => {
      if (!acc[item.tipo]) {
        acc[item.tipo] = [];
      }
      acc[item.tipo].push(item);
      return acc;
    },
    {} as Record<string, ChangelogItem[]>
  );

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        console.log('[ChangelogModal] Estado do modal mudou:', isOpen);
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            {changelog.titulo}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Versão {changelog.version} • {new Date(changelog.release_date).toLocaleDateString("pt-BR")}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {/* Novos recursos */}
            {groupedItems.novo && groupedItems.novo.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getTypeBadge("novo")}
                </div>
                <div className="space-y-3">
                  {groupedItems.novo.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      <div className="flex-shrink-0 text-2xl">
                        {item.icone || "✨"}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{item.titulo}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.descricao}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Melhorias */}
            {groupedItems.melhoria && groupedItems.melhoria.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getTypeBadge("melhoria")}
                </div>
                <div className="space-y-3">
                  {groupedItems.melhoria.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20 animate-fade-in"
                      style={{ animationDelay: `${(groupedItems.novo?.length || 0 + idx) * 0.1}s` }}
                    >
                      <div className="flex-shrink-0 text-2xl">
                        {item.icone || "🚀"}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{item.titulo}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.descricao}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Correções */}
            {groupedItems.correcao && groupedItems.correcao.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getTypeBadge("correcao")}
                </div>
                <div className="space-y-3">
                  {groupedItems.correcao.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border animate-fade-in"
                      style={{
                        animationDelay: `${((groupedItems.novo?.length || 0) + (groupedItems.melhoria?.length || 0) + idx) * 0.1}s`,
                      }}
                    >
                      <div className="flex-shrink-0 text-2xl">
                        {item.icone || "🔧"}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{item.titulo}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.descricao}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleViewAll} className="w-full sm:w-auto">
            Ver histórico completo
          </Button>
          <Button onClick={onMarkAsViewed} className="w-full sm:w-auto gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Entendi!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
