import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getSiteUrl } from '@/lib/siteUrl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Crown, Plus, Trash2, Copy, Check, ArrowLeft, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { FamilyInviteDialog } from '@/components/FamilyInviteDialog';
import { FamilyMemberProgress } from '@/components/FamilyMemberProgress';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardHeader from '@/components/DashboardHeader';

interface FamilyGroup {
  id: string;
  group_name: string;
  max_members: number;
  owner_user_id: string;
}

interface FamilyMember {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profiles: {
    nome: string;
    avatar_url: string | null;
    xp: number;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  token: string;
  created_at: string;
}

export default function Familia() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadFamilyData();
    }
  }, [user]);

  const loadFamilyData = async () => {
    if (!user) return;

    try {
      // Buscar grupo familiar do usuário
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('family_group_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (memberError || !memberData) {
        setLoading(false);
        return;
      }

      // Buscar detalhes do grupo
      const { data: groupData, error: groupError } = await supabase
        .from('family_groups')
        .select('*')
        .eq('id', memberData.family_group_id)
        .single();

      if (groupError || !groupData) {
        toast.error('Erro ao carregar dados do grupo');
        setLoading(false);
        return;
      }

      setFamilyGroup(groupData);
      setIsOwner(groupData.owner_user_id === user.id);

      // Buscar membros
      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select(`
          *,
          profiles (nome, avatar_url, xp)
        `)
        .eq('family_group_id', groupData.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

      if (!membersError && membersData) {
        setMembers(membersData as FamilyMember[]);
      }

      // Se for owner, buscar convites pendentes
      if (groupData.owner_user_id === user.id) {
        const { data: invitesData } = await supabase
          .from('family_invites')
          .select('*')
          .eq('family_group_id', groupData.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (invitesData) {
          setPendingInvites(invitesData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados da família');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!isOwner || memberUserId === user?.id) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .update({ status: 'removed' })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Membro removido com sucesso');
      loadFamilyData();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro');
    }
  };

  const handleCopyInviteLink = (token: string) => {
    // Usar domínio de produção para links compartilháveis
    const inviteLink = `${getSiteUrl()}/familia/aceitar/${token}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedInvite(token);
    toast.success('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedInvite(null), 2000);
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('family_invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      if (error) throw error;

      toast.success('Convite cancelado');
      loadFamilyData();
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      toast.error('Erro ao cancelar convite');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!familyGroup) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card>
            <CardHeader className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>Você não faz parte de um Plano Família</CardTitle>
              <CardDescription>
                Assine o Plano Família para convidar até 5 membros e compartilhar o acesso Premium!
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/subscription')}>
                Ver Planos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const slotsUsed = members.length;
  const slotsTotal = familyGroup.max_members;
  const slotsAvailable = slotsTotal - slotsUsed;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <h1 className="text-4xl font-bold mb-2">{familyGroup.group_name}</h1>
            <p className="text-muted-foreground">
              Gerencie os membros do seu Plano Família e acompanhe o progresso de todos
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">
              <Users className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="progress">
              <BarChart3 className="h-4 w-4 mr-2" />
              Progresso
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Membros
            </TabsTrigger>
          </TabsList>

          {/* Aba: Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* Status do Grupo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Status do Grupo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Membros ativos</span>
                      <span className="font-medium">{slotsUsed} / {slotsTotal}</span>
                    </div>
                    <Progress value={(slotsUsed / slotsTotal) * 100} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {slotsAvailable > 0 
                      ? `Você ainda pode convidar ${slotsAvailable} ${slotsAvailable === 1 ? 'membro' : 'membros'}`
                      : 'Todos os slots estão preenchidos'}
                  </p>
                  {isOwner && slotsAvailable > 0 && (
                    <Button onClick={() => setInviteDialogOpen(true)} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Convidar Novo Membro
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview do Progresso */}
            <FamilyMemberProgress memberIds={members.map(m => m.user_id)} />

            {/* Convites Pendentes */}
            {isOwner && pendingInvites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Convites Pendentes ({pendingInvites.length})</CardTitle>
                  <CardDescription>
                    Aguardando aceitação dos convites
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{invite.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Enviado em {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyInviteLink(invite.token)}
                          >
                            {copiedInvite === invite.token ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvite(invite.id)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Aba: Progresso */}
          <TabsContent value="progress">
            <FamilyMemberProgress memberIds={members.map(m => m.user_id)} />
          </TabsContent>

          {/* Aba: Membros */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Membros ({slotsUsed})</CardTitle>
                    <CardDescription>Gerencie os membros do seu grupo familiar</CardDescription>
                  </div>
                  {isOwner && slotsAvailable > 0 && (
                    <Button onClick={() => setInviteDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Convidar Membro
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.profiles.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.profiles.nome?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.profiles.nome}</p>
                            {member.role === 'owner' && (
                              <Badge variant="secondary" className="gap-1">
                                <Crown className="h-3 w-3" />
                                Proprietário
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {member.profiles.xp} XP • Entrou em {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      {isOwner && member.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Convite */}
        <FamilyInviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          familyGroupId={familyGroup.id}
          onInviteSent={loadFamilyData}
        />
      </div>
    </div>
  );
}
