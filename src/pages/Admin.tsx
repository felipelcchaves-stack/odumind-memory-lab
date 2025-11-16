import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Upload, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import OduEditor from '@/components/admin/OduEditor';
import OduList from '@/components/admin/OduList';
import BulkUpload from '@/components/admin/BulkUpload';
import UserManagement from '@/components/admin/UserManagement';

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [stats, setStats] = useState({ totalOdus: 0, totalUsers: 0 });
  const [selectedOdu, setSelectedOdu] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!adminLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!adminLoading && !isAdmin) {
      toast.error('Acesso negado. Apenas administradores podem acessar esta área.');
      navigate('/dashboard');
    }
  }, [user, isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin]);

  async function loadStats() {
    try {
      const { count: oduCount } = await supabase
        .from('odu')
        .select('*', { count: 'exact', head: true });

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalOdus: oduCount || 0,
        totalUsers: userCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  const handleOduSaved = () => {
    setSelectedOdu(null);
    setRefreshTrigger((prev) => prev + 1);
    loadStats();
  };

  const handleEditOdu = (oduId: string) => {
    setSelectedOdu(oduId);
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8">
        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Odu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalOdus}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {256 - stats.totalOdus} faltando para completar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Usuários Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Total de usuários</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Progresso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Math.round((stats.totalOdus / 256) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Da biblioteca completa</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="list" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="list">Lista de Odu</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="upload">Upload em Massa</TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Gerenciar Odu</h2>
                <p className="text-muted-foreground">
                  Visualize, edite ou exclua os Odu cadastrados
                </p>
              </div>
              <Button onClick={() => setSelectedOdu('new')}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Odu
              </Button>
            </div>
            <OduList onEdit={handleEditOdu} refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="editor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedOdu === 'new' ? 'Criar Novo Odu' : selectedOdu ? 'Editar Odu' : 'Editor de Odu'}
                </CardTitle>
                <CardDescription>
                  {selectedOdu ? 'Edite os campos abaixo e salve as alterações' : 'Selecione um Odu da lista para editar ou crie um novo'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedOdu ? (
                  <OduEditor
                    oduId={selectedOdu === 'new' ? undefined : selectedOdu}
                    onSaved={handleOduSaved}
                    onCancel={() => setSelectedOdu(null)}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Nenhum Odu selecionado para edição
                    </p>
                    <Button onClick={() => setSelectedOdu('new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Novo Odu
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload em Massa
                </CardTitle>
                <CardDescription>
                  Importe múltiplos Odu de uma vez usando arquivos CSV ou JSON
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkUpload onSuccess={() => {
                  loadStats();
                  setRefreshTrigger((prev) => prev + 1);
                }} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
