import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, ShieldOff, Eye, Search, X, Edit, UserPlus, Settings, Download, Upload, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import UserEditDialog from './UserEditDialog';
import UserRoleDialog from './UserRoleDialog';

interface UserProfile {
  user_id: string;
  nome?: string;
  email?: string;
  xp: number;
  streak: number;
  created_at: string;
  user_roles?: Array<{ role: string }>;
  plan_name?: string;
  subscription_status?: string;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'colaborador' | 'aluno'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'Gratuito' | 'Premium' | 'Profissional' | 'Família'>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleChangeUserId, setRoleChangeUserId] = useState<string>('');
  const [roleChangeUserName, setRoleChangeUserName] = useState<string>('');
  const [roleChangeCurrentRole, setRoleChangeCurrentRole] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          nome,
          xp,
          streak,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails using the new function
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: emailsData, error: emailsError } = await supabase
        .rpc('get_user_emails', { user_ids: userIds });

      if (emailsError) {
        console.error('Error fetching emails:', emailsError);
      }

      // Create a map of user emails
      const emailMap = new Map(
        emailsData?.map(e => [e.user_id, e.email]) || []
      );

      // Get roles for all users
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Get subscriptions for all users
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('user_id, plan_name, status')
        .in('user_id', userIds);

      // Create subscription map
      const subscriptionMap = new Map(
        subscriptions?.map(s => [s.user_id, { plan_name: s.plan_name, status: s.status }]) || []
      );

      // Combine profiles with emails, roles and subscriptions
      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        email: emailMap.get(profile.user_id),
        user_roles: roles?.filter(r => r.user_id === profile.user_id).map(r => ({ role: r.role })) || [],
        plan_name: subscriptionMap.get(profile.user_id)?.plan_name || 'Gratuito',
        subscription_status: subscriptionMap.get(profile.user_id)?.status || 'free'
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdminRole(userId: string, isCurrentlyAdmin: boolean) {
    // This function is no longer used but kept for backwards compatibility
    console.log('toggleAdminRole is deprecated, use UserRoleDialog instead');
  }

  const isAdmin = (user: UserProfile) => 
    user.user_roles?.some(r => r.role === 'admin') || false;

  const isColaborador = (user: UserProfile) => 
    user.user_roles?.some(r => r.role === 'colaborador') || false;

  const isAluno = (user: UserProfile) => 
    user.user_roles?.some(r => r.role === 'aluno') || false;

  const getUserRole = (user: UserProfile): string => {
    if (isAdmin(user)) return 'admin';
    if (isColaborador(user)) return 'colaborador';
    if (isAluno(user)) return 'aluno';
    return 'sem role';
  };

  const filteredUsers = users.filter(user => {
    // Search filter - busca por nome, email ou user_id
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = user.nome?.toLowerCase().includes(searchLower);
      const matchesEmail = user.email?.toLowerCase().includes(searchLower);
      const matchesId = user.user_id.toLowerCase().includes(searchLower);
      
      if (!matchesName && !matchesEmail && !matchesId) {
        return false;
      }
    }

    // Role filter
    if (roleFilter !== 'all') {
      const userRole = getUserRole(user);
      if (userRole !== roleFilter) return false;
    }

    // Activity filter - considera ativo se XP > 0 ou streak > 0
    if (activityFilter !== 'all') {
      const isActive = user.xp > 0 || user.streak > 0;
      if (activityFilter === 'active' && !isActive) return false;
      if (activityFilter === 'inactive' && isActive) return false;
    }

    // Plan filter
    if (planFilter !== 'all') {
      if (user.plan_name !== planFilter) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setActivityFilter('all');
    setPlanFilter('all');
  };

  const hasActiveFilters = searchTerm || roleFilter !== 'all' || activityFilter !== 'all' || planFilter !== 'all';

  const exportToCSV = () => {
    const csvData = filteredUsers.map(user => ({
      'Nome': user.nome || 'Sem nome',
      'Email': user.email || 'Sem email',
      'Plano': user.plan_name || 'Gratuito',
      'Role': getUserRole(user),
      'XP': user.xp,
      'Streak': user.streak,
      'Criado em': new Date(user.created_at).toLocaleDateString('pt-BR'),
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success(`${filteredUsers.length} usuários exportados com sucesso`);
  };

  const importFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        
        toast.info(`Importação iniciada. ${lines.length - 1} linhas detectadas.`);
        toast.info('Funcionalidade de importação em desenvolvimento. Por favor, use a criação manual.');
      } catch (error) {
        toast.error('Erro ao processar arquivo CSV');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleEdit = (userId: string) => {
    setEditingUserId(userId);
    setIsCreating(false);
    setEditDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingUserId(undefined);
    setIsCreating(true);
    setEditDialogOpen(true);
  };

  const handleDialogSave = () => {
    loadUsers();
  };

  const handleChangeRole = (userId: string, userName: string, currentRole: string) => {
    setRoleChangeUserId(userId);
    setRoleChangeUserName(userName);
    setRoleChangeCurrentRole(currentRole);
    setRoleDialogOpen(true);
  };

  const handleRoleDialogSave = () => {
    loadUsers();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>
                Gerencie privilégios e acesso dos usuários da plataforma
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV} disabled={filteredUsers.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar CSV
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={importFromCSV}
                  />
                </label>
              </Button>
              <Button onClick={handleCreate}>
                <UserPlus className="h-4 w-4 mr-2" />
                Criar Usuário
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="colaborador">Colaboradores</SelectItem>
                <SelectItem value="aluno">Alunos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={(value: any) => setActivityFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por atividade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas atividades</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={(value: any) => setPlanFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                <SelectItem value="Gratuito">Gratuito</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
                <SelectItem value="Profissional">Profissional</SelectItem>
                <SelectItem value="Família">Família</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredUsers.length} de {users.length} usuários
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Streak</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {users.length === 0 ? 'Nenhum usuário encontrado' : 'Nenhum usuário corresponde aos filtros'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
              const userRole = getUserRole(user);
              
              return (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user.nome || user.email || `${user.user_id.substring(0, 8)}...`}
                      </span>
                      {user.nome && user.email && (
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.subscription_status === 'active' || user.subscription_status === 'trialing' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Badge variant={
                        user.plan_name === 'Profissional' ? 'default' :
                        user.plan_name === 'Premium' ? 'secondary' :
                        user.plan_name === 'Família' ? 'outline' :
                        'outline'
                      }>
                        {user.plan_name}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{user.xp}</TableCell>
                  <TableCell>{user.streak} dias</TableCell>
                  <TableCell>
                    {userRole === 'admin' ? (
                      <Badge variant="default" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    ) : userRole === 'colaborador' ? (
                      <Badge variant="default" className="gap-1 bg-blue-600">
                        <Shield className="h-3 w-3" />
                        Colaborador
                      </Badge>
                    ) : userRole === 'aluno' ? (
                      <Badge variant="secondary">Aluno</Badge>
                    ) : (
                      <Badge variant="outline">Sem Role</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(user.user_id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/user/${user.user_id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Perfil
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleChangeRole(
                          user.user_id, 
                          user.nome || user.email || 'Usuário',
                          userRole
                        )}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Alterar Perfil
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    
    <UserEditDialog
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      userId={editingUserId}
      onSave={handleDialogSave}
      isCreate={isCreating}
    />
    
    <UserRoleDialog
      open={roleDialogOpen}
      onOpenChange={setRoleDialogOpen}
      userId={roleChangeUserId}
      userName={roleChangeUserName}
      currentRole={roleChangeCurrentRole}
      onSave={handleRoleDialogSave}
    />
    </>
  );
}
