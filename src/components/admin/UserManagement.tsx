import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, ShieldOff, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface UserProfile {
  user_id: string;
  xp: number;
  streak: number;
  created_at: string;
  user_roles?: Array<{ role: string }>;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());

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
          xp,
          streak,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get roles for all users
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Combine profiles with roles
      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        user_roles: roles?.filter(r => r.user_id === profile.user_id).map(r => ({ role: r.role })) || []
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
    setProcessingUsers(prev => new Set(prev).add(userId));
    try {
      if (isCurrentlyAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
        toast.success('Privilégios de admin removidos');
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;
        toast.success('Usuário promovido a admin');
      }
      
      await loadUsers();
    } catch (error) {
      console.error('Error toggling admin role:', error);
      toast.error('Erro ao alterar função do usuário');
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  }

  const isAdmin = (user: UserProfile) => 
    user.user_roles?.some(r => r.role === 'admin') || false;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Usuários</CardTitle>
        <CardDescription>
          Gerencie privilégios e acesso dos usuários da plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Streak</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const userIsAdmin = isAdmin(user);
              const isProcessing = processingUsers.has(user.user_id);
              
              return (
                <TableRow key={user.user_id}>
                  <TableCell className="font-mono text-xs">
                    {user.user_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>{user.xp}</TableCell>
                  <TableCell>{user.streak} dias</TableCell>
                  <TableCell>
                    {userIsAdmin ? (
                      <Badge variant="default" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Usuário</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/user/${user.user_id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Perfil
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant={userIsAdmin ? "destructive" : "default"}
                            size="sm"
                            disabled={isProcessing}
                          >
                            {userIsAdmin ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-1" />
                                Remover Admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-1" />
                                Promover
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {userIsAdmin ? 'Remover privilégios de admin?' : 'Promover a admin?'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {userIsAdmin
                                ? 'Este usuário perderá acesso ao painel administrativo e todas as funções de admin.'
                                : 'Este usuário terá acesso total ao painel administrativo e poderá gerenciar outros usuários e conteúdo.'}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => toggleAdminRole(user.user_id, userIsAdmin)}
                            >
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {users.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum usuário encontrado
          </div>
        )}
      </CardContent>
    </Card>
  );
}
