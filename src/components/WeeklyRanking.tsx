import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";

interface RankingUser {
  user_id: string;
  email: string;
  xp: number;
  rank: number;
  isCurrentUser: boolean;
}

interface WeeklyRankingProps {
  currentUserId: string;
}

export default function WeeklyRanking({ currentUserId }: WeeklyRankingProps) {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadRanking();
  }, [currentUserId]);

  async function loadRanking() {
    try {
      // Get top 10 users by XP with their emails
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, xp")
        .order("xp", { ascending: false })
        .limit(10);

      if (!profiles) {
        setLoading(false);
        return;
      }

      // Get emails for these users
      const userIds = profiles.map((p) => p.user_id);
      
      // Create ranking with positions
      const rankingData: RankingUser[] = profiles.map((profile, index) => ({
        user_id: profile.user_id,
        email: "Usuário Anônimo", // For privacy, we don't expose emails
        xp: profile.xp,
        rank: index + 1,
        isCurrentUser: profile.user_id === currentUserId,
      }));

      setRanking(rankingData);

      // Find current user's rank
      const userRankData = rankingData.find((r) => r.user_id === currentUserId);
      if (userRankData) {
        setCurrentUserRank(userRankData.rank);
      } else {
        // User not in top 10, get their actual rank
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gt("xp", profiles.find((p) => p.user_id === currentUserId)?.xp || 0);
        
        if (count !== null) {
          setCurrentUserRank(count + 1);
        }
      }
    } catch (error) {
      console.error("Error loading ranking:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Ranking Semanal
        </CardTitle>
        <CardDescription>Top 10 usuários com mais XP</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ranking.map((user) => (
            <div
              key={user.user_id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                user.isCurrentUser
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-muted/30 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    user.rank === 1
                      ? "bg-yellow-500 text-white"
                      : user.rank === 2
                      ? "bg-gray-400 text-white"
                      : user.rank === 3
                      ? "bg-amber-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {user.rank}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {user.isCurrentUser ? "Você" : `Usuário #${user.rank}`}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {user.xp} XP
                  </p>
                </div>
              </div>
              {user.rank <= 3 && (
                <span className="text-2xl">
                  {user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : "🥉"}
                </span>
              )}
            </div>
          ))}
        </div>

        {currentUserRank && currentUserRank > 10 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Sua posição: <Badge variant="secondary">#{currentUserRank}</Badge>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
