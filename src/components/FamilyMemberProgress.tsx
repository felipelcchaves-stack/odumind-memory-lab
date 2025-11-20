import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, BookOpen, Flame, Target, TrendingUp } from 'lucide-react';

interface MemberStats {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  xp: number;
  streak: number;
  odus_memorizados: number;
  total_revisoes: number;
  progresso_percentual: number;
}

interface FamilyMemberProgressProps {
  memberIds: string[];
}

export function FamilyMemberProgress({ memberIds }: FamilyMemberProgressProps) {
  const [membersStats, setMembersStats] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembersStats();
  }, [memberIds]);

  const loadMembersStats = async () => {
    if (memberIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Buscar perfis dos membros
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, nome, avatar_url, xp, streak')
        .in('user_id', memberIds);

      if (!profiles) {
        setLoading(false);
        return;
      }

      // Buscar estatísticas de memorização para cada membro
      const statsPromises = profiles.map(async (profile) => {
        const { data: memorizacao } = await supabase
          .from('memorizacao')
          .select('status, revisoes')
          .eq('user_id', profile.user_id);

        const odus_memorizados = memorizacao?.filter(m => m.status === 'memorizado').length || 0;
        const total_revisoes = memorizacao?.reduce((acc, m) => acc + m.revisoes, 0) || 0;
        const progresso_percentual = Math.round((odus_memorizados / 256) * 100);

        return {
          ...profile,
          odus_memorizados,
          total_revisoes,
          progresso_percentual,
        };
      });

      const stats = await Promise.all(statsPromises);
      setMembersStats(stats.sort((a, b) => b.xp - a.xp)); // Ordenar por XP
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Carregando estatísticas...</div>
        </CardContent>
      </Card>
    );
  }

  if (membersStats.length === 0) {
    return null;
  }

  const topPerformer = membersStats[0];
  const totalXP = membersStats.reduce((acc, m) => acc + m.xp, 0);
  const avgProgress = Math.round(membersStats.reduce((acc, m) => acc + m.progresso_percentual, 0) / membersStats.length);

  return (
    <div className="space-y-6">
      {/* Estatísticas Gerais do Grupo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={topPerformer.avatar_url || undefined} />
                <AvatarFallback>{topPerformer.nome?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{topPerformer.nome}</p>
                <p className="text-sm text-muted-foreground">{topPerformer.xp} XP</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              XP Total do Grupo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalXP.toLocaleString('pt-BR')}</p>
            <p className="text-sm text-muted-foreground">
              Média: {Math.round(totalXP / membersStats.length).toLocaleString('pt-BR')} XP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Progresso Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{avgProgress}%</p>
            <Progress value={avgProgress} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Lista Detalhada de Membros */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso Individual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {membersStats.map((member, index) => (
              <div key={member.user_id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>{member.nome?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {index === 0 && (
                        <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                          <Trophy className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{member.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{member.xp} XP</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <BookOpen className="h-3 w-3" />
                      <span className="text-xs">Odus</span>
                    </div>
                    <p className="text-lg font-semibold">{member.odus_memorizados}</p>
                    <p className="text-xs text-muted-foreground">de 256</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Flame className="h-3 w-3" />
                      <span className="text-xs">Streak</span>
                    </div>
                    <p className="text-lg font-semibold">{member.streak}</p>
                    <p className="text-xs text-muted-foreground">dias</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Target className="h-3 w-3" />
                      <span className="text-xs">Revisões</span>
                    </div>
                    <p className="text-lg font-semibold">{member.total_revisoes}</p>
                    <p className="text-xs text-muted-foreground">total</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progresso Geral</span>
                    <span className="font-medium">{member.progresso_percentual}%</span>
                  </div>
                  <Progress value={member.progresso_percentual} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
