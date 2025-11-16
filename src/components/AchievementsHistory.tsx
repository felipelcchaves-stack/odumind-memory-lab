import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conquista {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  icone: string;
  valor_conquista: number;
  conquistado_em: string;
}

export default function AchievementsHistory() {
  const { user } = useAuth();
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConquistas();
    }
  }, [user]);

  const fetchConquistas = async () => {
    try {
      const { data, error } = await supabase
        .from("conquistas")
        .select("*")
        .eq("user_id", user?.id)
        .order("conquistado_em", { ascending: false });

      if (error) throw error;
      setConquistas(data || []);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (tipo: string) => {
    if (tipo.startsWith("progresso")) return "bg-blue-500";
    if (tipo.startsWith("streak")) return "bg-orange-500";
    if (tipo.startsWith("xp")) return "bg-purple-500";
    if (tipo.startsWith("revisoes")) return "bg-green-500";
    return "bg-gray-500";
  };

  const getCategoryLabel = (tipo: string) => {
    if (tipo.startsWith("progresso")) return "Progresso";
    if (tipo.startsWith("streak")) return "Sequência";
    if (tipo.startsWith("xp")) return "Experiência";
    if (tipo.startsWith("revisoes")) return "Revisões";
    if (tipo === "primeiro_odu") return "Início";
    return "Conquista";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Histórico de Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (conquistas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Histórico de Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Comece sua jornada para desbloquear conquistas! 🎯
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Histórico de Conquistas
          </div>
          <Badge variant="secondary">{conquistas.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {conquistas.map((conquista) => (
              <div
                key={conquista.id}
                className="flex gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="text-4xl">{conquista.icone}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold">{conquista.titulo}</h4>
                    <Badge className={getCategoryColor(conquista.tipo)}>
                      {getCategoryLabel(conquista.tipo)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {conquista.descricao}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(conquista.conquistado_em), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                      locale: ptBR
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
