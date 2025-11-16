import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

interface BadgeData {
  id: string;
  code: string;
  nome: string;
  descricao: string;
  icon: string;
  requisito_tipo: string;
  requisito_valor: number;
  conquistado: boolean;
  conquistado_em?: string;
}

interface BadgesDisplayProps {
  userId: string;
  compact?: boolean;
}

export default function BadgesDisplay({ userId, compact = false }: BadgesDisplayProps) {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, [userId]);

  async function loadBadges() {
    try {
      // Get all badges
      const { data: allBadges } = await supabase
        .from("badges")
        .select("*")
        .order("requisito_valor", { ascending: true });

      // Get user's badges
      const { data: userBadges } = await supabase
        .from("user_badges")
        .select("badge_id, conquistado_em")
        .eq("user_id", userId);

      const userBadgeIds = new Set(userBadges?.map((ub) => ub.badge_id) || []);
      const userBadgesMap = new Map(
        userBadges?.map((ub) => [ub.badge_id, ub.conquistado_em]) || []
      );

      const badgesWithStatus: BadgeData[] = (allBadges || []).map((badge) => ({
        ...badge,
        conquistado: userBadgeIds.has(badge.id),
        conquistado_em: userBadgesMap.get(badge.id),
      }));

      setBadges(badgesWithStatus);
    } catch (error) {
      console.error("Error loading badges:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  const conquistadas = badges.filter((b) => b.conquistado);
  const naoConquistadas = badges.filter((b) => !b.conquistado);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {conquistadas.slice(0, 5).map((badge) => (
          <div
            key={badge.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
            title={badge.descricao}
          >
            <span className="text-lg">{badge.icon}</span>
            <span className="text-xs font-medium">{badge.nome}</span>
          </div>
        ))}
        {conquistadas.length > 5 && (
          <Badge variant="secondary">+{conquistadas.length - 5}</Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Conquistas ({conquistadas.length}/{badges.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Conquistadas */}
          {conquistadas.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 text-foreground">Desbloqueadas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {conquistadas.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="text-3xl">{badge.icon}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{badge.nome}</p>
                      <p className="text-xs text-muted-foreground">{badge.descricao}</p>
                      {badge.conquistado_em && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(badge.conquistado_em).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Não Conquistadas */}
          {naoConquistadas.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Bloqueadas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {naoConquistadas.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 opacity-60"
                  >
                    <div className="text-3xl grayscale">{badge.icon}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{badge.nome}</p>
                      <p className="text-xs text-muted-foreground">{badge.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Meta: {badge.requisito_valor}{" "}
                        {badge.requisito_tipo === "xp"
                          ? "XP"
                          : badge.requisito_tipo === "streak"
                          ? "dias"
                          : "Odu"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
