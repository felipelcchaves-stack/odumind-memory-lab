import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Award, BookOpen, Flame, Star, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MemorizationStatusBadge from '@/components/MemorizationStatusBadge';

interface UserProfile {
  user_id: string;
  xp: number;
  streak: number;
  meta_diaria: number;
  created_at: string;
  nome?: string;
}

interface MemorizationProgress {
  id: string;
  status: string;
  forca_memoria: number;
  revisoes: number;
  ultima_revisao: string | null;
  odu: {
    numero: number;
    nome: string;
  };
}

interface Achievement {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  icone: string;
  conquistado_em: string;
  valor_conquista: number;
}

interface UserBadge {
  id: string;
  conquistado_em: string;
  badges: {
    nome: string;
    descricao: string;
    icon: string;
    code: string;
  };
}

interface ActivityLog {
  id: string;
  tipo_evento: string;
  valor: number;
  created_at: string;
  detalhes?: any;
}

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [memorization, setMemorization] = useState<MemorizationProgress[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  async function loadUserData() {
    try {
      setLoading(true);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load memorization progress
      const { data: memData, error: memError } = await supabase
        .from('memorizacao')
        .select(`
          id,
          status,
          forca_memoria,
          revisoes,
          ultima_revisao,
          odu:odu_id (
            numero,
            nome
          )
        `)
        .eq('user_id', userId)
        .order('ultima_revisao', { ascending: false, nullsFirst: false });

      if (memError) throw memError;
      setMemorization(memData || []);

      // Load achievements
      const { data: achData, error: achError } = await supabase
        .from('conquistas')
        .select('*')
        .eq('user_id', userId)
        .order('conquistado_em', { ascending: false });

      if (achError) throw achError;
      setAchievements(achData || []);

      // Load badges
      const { data: badgeData, error: badgeError } = await supabase
        .from('user_badges')
        .select(`
          id,
          conquistado_em,
          badges:badge_id (
            nome,
            descricao,
            icon,
            code
          )
        `)
        .eq('user_id', userId)
        .order('conquistado_em', { ascending: false });

      if (badgeError) throw badgeError;
      setBadges(badgeData || []);

      // Load activity logs
      const { data: actData, error: actError } = await supabase
        .from('gamification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (actError) throw actError;
      setActivities(actData || []);

    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Erro ao carregar dados do usuário');
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    return (
      <MemorizationStatusBadge 
        status={status as 'nao_estudado' | 'estudando' | 'memorizado'} 
      />
    );
  };

  const getEventTypeLabel = (tipo: string) => {
    const eventMap: Record<string, string> = {
      xp_ganho: 'XP Ganho',
      revisao_completa: 'Revisão Completa',
      odu_memorizado: 'Odu Memorizado',
      streak_updated: 'Streak Atualizada',
      streak_reset: 'Streak Resetada',
      badge_conquistado: 'Badge Conquistado',
    };
    return eventMap[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do usuário...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-8">
        <p className="text-center text-muted-foreground">Usuário não encontrado</p>
      </div>
    );
  }

  const memStats = {
    memorizado: memorization.filter(m => m.status === 'memorizado').length,
    estudando: memorization.filter(m => m.status === 'estudando').length,
    naoEstudado: memorization.filter(m => m.status === 'nao_estudado').length,
    total: memorization.length,
  };

  const progressPercentage = memStats.total > 0 
    ? Math.round((memStats.memorizado / memStats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <Button 
        variant="ghost" 
        className="mb-2"
        onClick={() => navigate('/admin/users')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Usuários
      </Button>

        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {profile.nome || 'Usuário'}
                </CardTitle>
                <CardDescription className="mt-2">
                  ID: {profile.user_id}
                </CardDescription>
                <CardDescription>
                  Membro desde {format(new Date(profile.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{profile.xp} XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span className="text-xl font-semibold">{profile.streak} dias</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{achievements.length}</p>
                <p className="text-sm text-muted-foreground">Conquistas</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{badges.length}</p>
                <p className="text-sm text-muted-foreground">Badges</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{memStats.memorizado}</p>
                <p className="text-sm text-muted-foreground">Odu Memorizados</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="h-6 w-6 mx-auto mb-2 flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
                <p className="text-2xl font-bold">{progressPercentage}%</p>
                <p className="text-sm text-muted-foreground">Progresso Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Tabs */}
        <Tabs defaultValue="memorization" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="memorization">Memorização</TabsTrigger>
            <TabsTrigger value="achievements">Conquistas</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="activities">Atividades</TabsTrigger>
          </TabsList>

          <TabsContent value="memorization">
            <Card>
              <CardHeader>
                <CardTitle>Progresso de Memorização</CardTitle>
                <CardDescription>
                  Status detalhado de cada Odu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso Geral</span>
                    <span className="font-semibold">{memStats.memorizado} / {memStats.total}</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>

                {memorization.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum Odu estudado ainda
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Força</TableHead>
                        <TableHead className="text-right">Revisões</TableHead>
                        <TableHead>Última Revisão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memorization.map((mem) => (
                        <TableRow key={mem.id}>
                          <TableCell className="font-medium">{mem.odu.numero}</TableCell>
                          <TableCell>{mem.odu.nome}</TableCell>
                          <TableCell>{getStatusBadge(mem.status)}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold">{mem.forca_memoria}%</span>
                          </TableCell>
                          <TableCell className="text-right">{mem.revisoes}x</TableCell>
                          <TableCell>
                            {mem.ultima_revisao 
                              ? format(new Date(mem.ultima_revisao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <CardTitle>Conquistas Desbloqueadas</CardTitle>
                <CardDescription>
                  Todas as conquistas obtidas pelo usuário
                </CardDescription>
              </CardHeader>
              <CardContent>
                {achievements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma conquista desbloqueada ainda
                  </p>
                ) : (
                  <div className="space-y-4">
                    {achievements.map((achievement) => (
                      <div 
                        key={achievement.id}
                        className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="text-4xl">{achievement.icone}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{achievement.titulo}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{achievement.descricao}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="outline">
                              {achievement.tipo.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(achievement.conquistado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{achievement.valor_conquista}</p>
                          <p className="text-xs text-muted-foreground">pontos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="badges">
            <Card>
              <CardHeader>
                <CardTitle>Badges Conquistados</CardTitle>
                <CardDescription>
                  Todos os badges obtidos pelo usuário
                </CardDescription>
              </CardHeader>
              <CardContent>
                {badges.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum badge conquistado ainda
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {badges.map((badge) => (
                      <div 
                        key={badge.id}
                        className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="text-5xl">{badge.badges.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{badge.badges.nome}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{badge.badges.descricao}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(badge.conquistado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Atividades</CardTitle>
                <CardDescription>
                  Últimas 50 atividades do usuário
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma atividade registrada
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>
                            {format(new Date(activity.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getEventTypeLabel(activity.tipo_evento)}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {activity.valor > 0 ? `+${activity.valor}` : activity.valor}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {activity.detalhes ? JSON.stringify(activity.detalhes).substring(0, 50) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
