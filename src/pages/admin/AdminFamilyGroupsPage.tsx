import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Users2, Search, Loader2, UserCheck, UserX, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import FamilyGroupDetail from '@/components/admin/FamilyGroupDetail';

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

export default function AdminFamilyGroupsPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<FamilyGroup | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalMembers: 0,
    avgOccupancy: 0,
    activeGroups: 0,
  });

  useEffect(() => {
    if (!permissionsLoading && !hasPermission('grupos_familiares')) {
      navigate('/admin/dashboard');
      toast.error('Você não tem permissão para acessar esta página');
      return;
    }
    
    if (!permissionsLoading) {
      loadGroups();
    }
  }, [permissionsLoading]);

  async function loadGroups() {
    try {
      setLoading(true);

      // Load all family groups with owner profile
      const { data: groupsData, error: groupsError } = await supabase
        .from('family_groups')
        .select(`
          id,
          group_name,
          owner_user_id,
          max_members,
          created_at,
          stripe_subscription_id,
          owner_profile:profiles!family_groups_owner_user_id_fkey (
            nome,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // For each group, get active members count and subscription
      const groupsWithDetails = await Promise.all((groupsData || []).map(async (group) => {
        // Get active members count
        const { count: membersCount } = await supabase
          .from('family_members')
          .select('*', { count: 'exact', head: true })
          .eq('family_group_id', group.id)
          .eq('status', 'active');

        // Get owner subscription
        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('status, plan_name')
          .eq('user_id', group.owner_user_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...group,
          active_members_count: membersCount || 0,
          subscription: subscriptionData || undefined,
        };
      }));

      setGroups(groupsWithDetails);

      // Calculate stats
      const totalMembers = groupsWithDetails.reduce((acc, g) => acc + g.active_members_count, 0);
      const activeGroups = groupsWithDetails.filter(g => 
        g.subscription?.status === 'active' || g.subscription?.status === 'trialing'
      ).length;
      const avgOccupancy = groupsWithDetails.length > 0 
        ? Math.round((totalMembers / (groupsWithDetails.length * 5)) * 100) 
        : 0;

      setStats({
        totalGroups: groupsWithDetails.length,
        totalMembers,
        avgOccupancy,
        activeGroups,
      });

    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Erro ao carregar grupos familiares');
    } finally {
      setLoading(false);
    }
  }

  const filteredGroups = groups.filter(group => {
    const matchesSearch = 
      (group.group_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (group.owner_profile?.nome?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && (group.subscription?.status === 'active' || group.subscription?.status === 'trialing')) ||
      (statusFilter === 'inactive' && group.subscription?.status !== 'active' && group.subscription?.status !== 'trialing');
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">Sem assinatura</Badge>;
    
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-500">Pagamento Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenDetail = (group: FamilyGroup) => {
    setSelectedGroup(group);
    setDetailOpen(true);
  };

  if (permissionsLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando grupos familiares...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grupos Familiares</h1>
        <p className="text-muted-foreground">
          Gerencie os grupos do plano Egbe
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground">grupos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeGroups}</div>
            <p className="text-xs text-muted-foreground">com assinatura ativa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">em todos os grupos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOccupancy}%</div>
            <p className="text-xs text-muted-foreground">média de vagas preenchidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Grupos</CardTitle>
          <CardDescription>
            {filteredGroups.length} grupos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do grupo ou dono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum grupo encontrado</p>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Ainda não há grupos familiares cadastrados'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Grupo</TableHead>
                  <TableHead>Dono</TableHead>
                  <TableHead className="text-center">Membros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">
                      {group.group_name || 'Minha Família'}
                    </TableCell>
                    <TableCell>
                      {group.owner_profile?.nome || 'Usuário'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {group.active_members_count} / {group.max_members}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(group.subscription?.status)}
                    </TableCell>
                    <TableCell>
                      {group.subscription?.plan_name || '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(group.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetail(group)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedGroup && (
        <FamilyGroupDetail
          open={detailOpen}
          onOpenChange={setDetailOpen}
          group={selectedGroup}
          onUpdate={loadGroups}
        />
      )}
    </div>
  );
}
