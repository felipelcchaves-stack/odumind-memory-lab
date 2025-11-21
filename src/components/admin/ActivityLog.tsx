import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileEdit, UserPlus, Scroll, Activity } from "lucide-react";

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  icon: any;
}

export function ActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    try {
      // Buscar últimas edições de Odu
      const { data: oduHistory } = await supabase
        .from("odu_history")
        .select("*, odu(nome)")
        .order("edited_at", { ascending: false })
        .limit(5);

      // Buscar últimos usuários criados
      const { data: profiles } = await supabase
        .from("profiles")
        .select("nome, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      const activities: ActivityItem[] = [];

      // Processar histórico de Odu
      oduHistory?.forEach((item) => {
        activities.push({
          id: item.id,
          type: "odu_edit",
          description: `Odu "${item.odu?.nome}" foi editado`,
          timestamp: item.edited_at,
          icon: FileEdit,
        });
      });

      // Processar novos usuários
      profiles?.forEach((profile) => {
        activities.push({
          id: profile.created_at,
          type: "user_created",
          description: `Novo usuário: ${profile.nome || "Anônimo"}`,
          timestamp: profile.created_at,
          icon: UserPlus,
        });
      });

      // Ordenar por data
      activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(activities.slice(0, 10));
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Atividade Recente
        </CardTitle>
        <CardDescription>Últimas 10 ações no sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma atividade recente
              </p>
            ) : (
              activities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                    <div className="mt-1 p-2 rounded-lg bg-accent/50">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
