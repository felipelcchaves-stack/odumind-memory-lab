import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Crown, Trash2, Loader2, Mail, UserMinus, Eye, Calendar, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

interface FamilyGroup {
  id: string;
  group_name: string | null;
  owner_user_id: string;
  max_members: number;
  created_at: string;
  stripe_subscription_id: string | null;
  owner_profile?: {
    nome: string | null;
    user_id: string;
  };
  active_members_count: number;
  subscription?: {
    status: string;
    plan_name: string;
  };
}

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  invited_at: string;
  profile?: {
    nome: string | null;
    xp: number;
    streak: number;
  };
  memorization_progress?: number;
}

interface FamilyGroupDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: FamilyGroup;
  onUpdate: () => void;
}

export default function FamilyGroupDetail({
  open,
  onOpenChange,
  group,
  onUpdate,
}: FamilyGroupDetailProps) {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open, group.id]);

  async function loadMembers() {
    try {
      setLoading(true);

      const { data: membersData, error } = await supabase
        .from('family_members')
        .select(`
          id,
          user_id,
          role,
          status,
          joined_at,
          invited_at,
          profile:profiles!family_members_user_id_fkey (
            nome,
            xp,
            streak
          )
        `)
        .eq('family_group_id', group.id)
        .eq('status', 'active')
        .order('role', { ascending: true });

      if (error) throw error;

      // Get memorization progress for each member
      const membersWithProgress = await Promise.all((membersData || []).map(async (member) => {
        // Count memorized odus
        const { count: memorizedCount } = await supabase
          .from('memorizacao')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', member.user_id)
          .eq('status', 'memorizado');

        // Total odus
        const { count: totalOdus } = await supabase
          .from('odu')
          .select('*', { count: 'exact', head: true });

        const progress = totalOdus && totalOdus > 0 
          ? Math.round(((memorizedCount || 0) / totalOdus) * 100)
          : 0;

        return {
          ...member,
          memorization_progress: progress,
        };
      }));

      setMembers(membersWithProgress);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    try {
      setRemoving(memberId);

      const { error } = await supabase
        .from('family_members')
        .update({ status: 'removed' })
        .eq('id', memberId);

      if (error) throw error;

      toast.success(`${memberName} removido do grupo`);
      loadMembers();
      onUpdate();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Erro ao remover membro');
    } finally {
      setRemoving(null);
    }
  }

  const handleViewUserDetail = (userId: string) => {
    onOpenChange(false);
    navigate(`/admin/users/${userId}`);
  };

  const getRoleBadge = (role: string) => {
    if (role === 'owner') {
      return (
        <Badge className="bg-amber-500 gap-1">
          <Crown className="h-3 w-3" />
          Dono
        </Badge>
      );
    }
    return <Badge variant="secondary">Membro</Badge>;
  };

  const occupancyRate = (group.active_members_count / group.max_members) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {group.group_name || 'Minha Família'}
          </DialogTitle>
          <DialogDescription>
            Grupo criado em {format(new Date(group.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          {/* Group Info */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Dono do Grupo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{group.owner_profile?.nome || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground">ID: {group.owner_user_id.slice(0, 8)}...</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewUserDetail(group.owner_user_id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ocupação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{group.active_members_count} de {group.max_members} vagas</span>
                    <span className="font-medium">{Math.round(occupancyRate)}%</span>
                  </div>
                  <Progress value={occupancyRate} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {group.max_members - group.active_members_count} vaga(s) disponível(is)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Info */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Assinatura</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Badge 
                  className={
                    group.subscription?.status === 'active' || group.subscription?.status === 'trialing'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }
                >
                  {group.subscription?.status === 'active' ? 'Ativo' : 
                   group.subscription?.status === 'trialing' ? 'Trial' : 
                   group.subscription?.status === 'canceled' ? 'Cancelado' : 
                   group.subscription?.status || 'Sem assinatura'}
                </Badge>
                <span className="text-sm">{group.subscription?.plan_name || '-'}</span>
                {group.stripe_subscription_id && (
                  <span className="text-xs text-muted-foreground">
                    Stripe: {group.stripe_subscription_id.slice(0, 15)}...
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator className="my-4" />

          {/* Members List */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Membros ({members.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum membro ativo</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-center">XP</TableHead>
                    <TableHead className="text-center">Streak</TableHead>
                    <TableHead className="text-center">Progresso</TableHead>
                    <TableHead>Entrou em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.profile?.nome || 'Usuário'}
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(member.role)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{member.profile?.xp || 0}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{member.profile?.streak || 0}</span>
                        <span className="text-xs text-muted-foreground"> dias</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Progress value={member.memorization_progress} className="h-2 w-16" />
                          <span className="text-xs">{member.memorization_progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.joined_at 
                          ? format(new Date(member.joined_at), "dd/MM/yyyy", { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewUserDetail(member.user_id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {member.role !== 'owner' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  disabled={removing === member.id}
                                >
                                  {removing === member.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserMinus className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover membro</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover {member.profile?.nome || 'este membro'} do grupo?
                                    Esta ação irá revogar o acesso ao plano família.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveMember(member.id, member.profile?.nome || 'Membro')}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
