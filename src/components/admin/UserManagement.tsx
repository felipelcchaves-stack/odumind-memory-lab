import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Eye, Search, X, Edit, UserPlus, Settings, Download, Upload, RefreshCw, KeyRound, Trash2, MoreHorizontal, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import UserEditDialog from './UserEditDialog';
import UserRoleDialog from './UserRoleDialog';
import { CollaboratorPermissionsDialog } from './CollaboratorPermissionsDialog';
import ResetPasswordDialog from './ResetPasswordDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

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
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'colaborador' | 'aluno'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'Gratuito' | 'Awo' | 'Egbe'>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleChangeUserId, setRoleChangeUserId] = useState<string>('');
  const [roleChangeUserName, setRoleChangeUserName] = useState<string>('');
  const [roleChangeCurrentRole, setRoleChangeCurrentRole] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [permissionsUserId, setPermissionsUserId] = useState<string>('');
  const [permissionsUserName, setPermissionsUserName] = useState<string>('');

  // Backwards-compat: evita crash caso algum bundle antigo ainda referencie essa flag
  const [resendingPasswordFor] = useState<string | null>(null);
  
  // Reset password dialog states
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string>('');
  const [resetPasswordUserEmail, setResetPasswordUserEmail] = useState<string>('');
  const [resetPasswordUserName, setResetPasswordUserName] = useState<string>('');
  
  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string>('');
  const [deletingUserName, setDeletingUserName] = useState<string>('');
  const [deletingUserEmail, setDeletingUserEmail] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  // Refresh automático quando dialog fecha (após edição)
  useEffect(() => {
    if (!editDialogOpen && !isCreating && editingUserId) {
      console.log('🔄 Dialog fechou após edição, fazendo refresh...');
      loadUsers();
    }
  }, [editDialogOpen, isCreating, editingUserId]);

  async function loadUsers(): Promise<UserProfile[]> {
    try {
      setLoading(true);
      
      // Cache-bust: timestamp para forçar nova query
      const cacheBust = Date.now();
      console.log('🔄 Cache-bust timestamp:', cacheBust);
      
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

      // Get subscriptions - using RPC with DISTINCT ON to ensure latest subscription
      const { data: subscriptions } = await supabase
        .rpc('get_latest_subscriptions', { user_ids: userIds });

      console.log('🔄 Subscriptions recarregadas:', subscriptions?.length, 'registros');
      
      // Create subscription map
      const subscriptionMap = new Map(
        subscriptions?.map(s => [s.user_id, { 
          plan_name: s.plan_name, 
          status: s.status,
          stripe_customer_id: s.stripe_customer_id,
          stripe_subscription_id: s.stripe_subscription_id
        }]) || []
      );

      // Combine profiles with emails, roles and subscriptions
      const usersWithRoles = profiles?.map(profile => {
        const subscription = subscriptionMap.get(profile.user_id);
        return {
          ...profile,
          email: emailMap.get(profile.user_id),
          user_roles: roles?.filter(r => r.user_id === profile.user_id).map(r => ({ role: r.role })) || [],
          plan_name: subscription?.plan_name || 'Gratuito',
          subscription_status: subscription?.status || 'free',
          stripe_customer_id: subscription?.stripe_customer_id,
          stripe_subscription_id: subscription?.stripe_subscription_id,
        };
      }) || [];

      console.log('✅ Lista de usuários atualizada:', usersWithRoles.length, 'usuários');
      setUsers(usersWithRoles);
      return usersWithRoles; // ✅ Retornar dados além de atualizar estado
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar usuários');
      return []; // Retornar array vazio em caso de erro
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

    // Plan filter - aceita nomes alternativos (unificados para Awo/Egbe)
    if (planFilter !== 'all') {
      const planAliases: Record<string, string[]> = {
        'Awo': ['Awo', 'Premium', 'Profissional', 'Akapo', 'professional', 'premium'],
        'Egbe': ['Egbe', 'Família', 'Family', 'familia'],
        'Gratuito': ['Gratuito', 'free', 'Free'],
      };
      const acceptedPlans = planAliases[planFilter] || [planFilter];
      if (!acceptedPlans.includes(user.plan_name || '')) return false;
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

  const handleRefresh = async () => {
    toast.info('Atualizando dados...');
    await loadUsers();
    toast.success(`✅ ${users.length} usuários atualizados com sucesso`);
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

  const handleDialogSave = async () => {
    try {
      setIsSaving(true);
      console.log('🔄 Iniciando processamento da atualização...');
      
      // Capturar user_id antes de qualquer operação
      const targetUserId = editingUserId;
      if (!targetUserId) {
        console.log('⚠️ Nenhum usuário sendo editado');
        return;
      }
      
      // Aguardar um momento para o backend processar
      console.log('⏳ Aguardando 1.5s para propagação no backend...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Fazer refresh final DOS DADOS
      console.log('🔄 Recarregando lista completa...');
      await loadUsers();
      
      // Fechar dialog DEPOIS de carregar
      console.log('✅ Fechando dialog...');
      setEditDialogOpen(false);
      
      toast.success('✅ Usuário atualizado com sucesso', { duration: 3000 });
      
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setIsSaving(false);
    }
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

  const handleResetPassword = (userId: string, email: string | undefined, name: string | undefined) => {
    if (!email) {
      toast.error('Usuário não possui email cadastrado');
      return;
    }
    setResetPasswordUserId(userId);
    setResetPasswordUserEmail(email);
    setResetPasswordUserName(name || email.split('@')[0] || 'Usuário');
    setResetPasswordDialogOpen(true);
  };

  const handleDeleteUser = (userId: string, userName: string, email: string | undefined, userRole: string) => {
    // Prevent deleting admin users from UI
    if (userRole === 'admin') {
      toast.error('Não é permitido excluir usuários administradores');
      return;
    }
    setDeletingUserId(userId);
    setDeletingUserName(userName);
    setDeletingUserEmail(email || '');
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!deletingUserId) return;
    
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const response = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: deletingUserId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao excluir usuário');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Erro ao excluir usuário');
      }

      // Remove user from local state
      setUsers(prev => prev.filter(u => u.user_id !== deletingUserId));
      
      toast.success(`Usuário ${deletingUserName} excluído com sucesso`);
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erro ao excluir usuário');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <TooltipProvider>
      <>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Gerenciamento de Usuários
                  <span className="text-muted-foreground font-normal text-base">
                    ({users.filter(u => u.xp > 0 || u.streak > 0).length} ativos)
                  </span>
                </CardTitle>
                <CardDescription>
                  Gerencie privilégios e acesso dos usuários da plataforma
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleRefresh} 
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Atualizar Dados</TooltipContent>
                </Tooltip>
                
                <Button onClick={handleCreate}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Criar Usuário</span>
                  <span className="sm:hidden">Criar</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem onClick={exportToCSV} disabled={filteredUsers.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <label className="cursor-pointer flex items-center">
                        <Upload className="h-4 w-4 mr-2" />
                        Importar CSV
                        <input
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={importFromCSV}
                        />
                      </label>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                <SelectItem value="Awo">Awo</SelectItem>
                <SelectItem value="Egbe">Egbe</SelectItem>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Usuário</TableHead>
                <TableHead className="w-[90px]">Plano</TableHead>
                <TableHead className="w-[60px]">XP</TableHead>
                <TableHead className="w-[80px]">Streak</TableHead>
                <TableHead className="w-[110px]">Função</TableHead>
                <TableHead className="w-[90px]">Cadastro</TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
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
                    <Badge variant={
                      user.plan_name === 'Profissional' ? 'default' :
                      user.plan_name === 'Premium' ? 'secondary' :
                      user.plan_name === 'Família' ? 'success' :
                      'outline'
                    }>
                      {user.plan_name || 'Gratuito'}
                    </Badge>
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user.user_id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => navigate(`/admin/user/${user.user_id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleChangeRole(
                              user.user_id, 
                              user.nome || user.email || 'Usuário',
                              userRole
                            )}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Alterar Função
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleResetPassword(user.user_id, user.email, user.nome)}
                            disabled={!user.email}
                          >
                            <KeyRound className="h-4 w-4 mr-2" />
                            Redefinir Senha
                          </DropdownMenuItem>
                          {userRole === 'colaborador' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setPermissionsUserId(user.user_id);
                                setPermissionsUserName(user.nome || user.email || 'Usuário');
                                setPermissionsDialogOpen(true);
                              }}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Permissões
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteUser(
                              user.user_id,
                              user.nome || user.email || 'Usuário',
                              user.email,
                              userRole
                            )}
                            disabled={userRole === 'admin' || isDeleting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
    
      <UserEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        userId={editingUserId}
        onSave={handleDialogSave}
        isCreate={isCreating}
        isSaving={isSaving}
      />
    
    <UserRoleDialog
      open={roleDialogOpen}
      onOpenChange={setRoleDialogOpen}
      userId={roleChangeUserId}
      userName={roleChangeUserName}
      currentRole={roleChangeCurrentRole}
      onSave={handleRoleDialogSave}
    />

    <CollaboratorPermissionsDialog
      open={permissionsDialogOpen}
      onOpenChange={setPermissionsDialogOpen}
      userId={permissionsUserId}
      userName={permissionsUserName}
    />

    <ResetPasswordDialog
      open={resetPasswordDialogOpen}
      onOpenChange={setResetPasswordDialogOpen}
      userId={resetPasswordUserId}
      userEmail={resetPasswordUserEmail}
      userName={resetPasswordUserName}
    />

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Excluir Usuário
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você está prestes a excluir permanentemente o usuário:
            </p>
            <div className="bg-muted p-3 rounded-md">
              <p className="font-medium">{deletingUserName}</p>
              {deletingUserEmail && (
                <p className="text-sm text-muted-foreground">{deletingUserEmail}</p>
              )}
            </div>
            <p className="text-destructive font-medium">
              Esta ação é irreversível!
            </p>
            <p className="text-sm">
              Todos os dados serão removidos, incluindo: progresso de memorização, 
              badges, conquistas, assinatura, notas pessoais e histórico de estudo.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDeleteUser}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Excluindo...' : 'Excluir Permanentemente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>
      </>
    </TooltipProvider>
  );
}
