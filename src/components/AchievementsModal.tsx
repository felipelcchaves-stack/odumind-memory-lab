import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, Filter, X, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ShareAchievementDialog } from "./ShareAchievementDialog";

interface Conquista {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  icone: string;
  valor_conquista: number;
  conquistado_em: string;
}

interface AchievementsModalProps {
  conquistas: Conquista[];
  trigger: React.ReactNode;
}

export function AchievementsModal({ conquistas, trigger }: AchievementsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Conquista | null>(null);
  
  const categories = Array.from(new Set(conquistas.map(c => c.tipo)));
  
  const filteredConquistas = selectedCategory 
    ? conquistas.filter(c => c.tipo === selectedCategory)
    : conquistas;

  const handleShare = (conquista: Conquista) => {
    setSelectedAchievement(conquista);
    setShareDialogOpen(true);
  };

  const getCategoryColor = (tipo: string) => {
    const colors: Record<string, string> = {
      streak: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
      estudo: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      memorização: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      velocidade: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
      maestria: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    };
    return colors[tipo] || "bg-muted text-muted-foreground border-border";
  };

  const getCategoryLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      streak: "Consistência",
      estudo: "Estudo",
      memorização: "Memorização",
      velocidade: "Velocidade",
      maestria: "Maestria",
    };
    return labels[tipo] || tipo;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-primary" />
            Todas as Conquistas
          </DialogTitle>
        </DialogHeader>
        
        {/* Filters */}
        <div className="px-6 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="h-8"
            >
              Todas ({conquistas.length})
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="h-8"
              >
                {getCategoryLabel(category)} ({conquistas.filter(c => c.tipo === category).length})
              </Button>
            ))}
            {selectedCategory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="h-8 ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6">
          {filteredConquistas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Trophy className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                Nenhuma conquista nesta categoria
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Continue estudando para desbloquear conquistas!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {filteredConquistas.map((conquista, index) => (
                <Card 
                  key={conquista.id} 
                  className="group hover-scale overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 border-2"
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <CardContent className="p-0">
                    {/* Header com ícone */}
                    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 relative overflow-hidden">
                      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                      <div className="relative flex items-center justify-between">
                        <div className="text-6xl transform group-hover:scale-110 transition-transform duration-300">
                          {conquista.icone}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`${getCategoryColor(conquista.tipo)} font-medium`}
                        >
                          {getCategoryLabel(conquista.tipo)}
                        </Badge>
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                          {conquista.titulo}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {conquista.descricao}
                        </p>
                      </div>

                      {/* Detalhes */}
                      <div className="space-y-2 pt-3 border-t border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(conquista.conquistado_em), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                          </div>
                          {conquista.valor_conquista > 0 && (
                            <Badge variant="secondary" className="text-xs font-semibold">
                              +{conquista.valor_conquista} XP
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2 hover-scale"
                          onClick={() => handleShare(conquista)}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Compartilhar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer stats */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Total de conquistas desbloqueadas
            </span>
            <span className="font-bold text-foreground">
              {conquistas.length} {conquistas.length === 1 ? 'conquista' : 'conquistas'}
            </span>
          </div>
        </div>
      </DialogContent>

      {/* Share Dialog */}
      {selectedAchievement && (
        <ShareAchievementDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          achievement={selectedAchievement}
        />
      )}
    </Dialog>
  );
}
