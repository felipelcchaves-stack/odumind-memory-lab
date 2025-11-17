import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Upload, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import OduEditor from '@/components/admin/OduEditor';
import OduList from '@/components/admin/OduList';
import BulkUpload from '@/components/admin/BulkUpload';
import DashboardHeader from '@/components/DashboardHeader';

export default function Colaborador() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isColaborador, loading: adminLoading } = useAdmin();
  const [selectedOdu, setSelectedOdu] = useState<string | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!adminLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!adminLoading && !isColaborador) {
      toast.error('Acesso negado. Apenas colaboradores podem acessar esta área.');
      navigate('/dashboard');
    }
  }, [user, isColaborador, adminLoading, navigate]);

  const handleOduSaved = () => {
    setSelectedOdu(null);
    setRefreshTrigger((prev) => prev + 1);
    toast.success('Odu salvo com sucesso!');
  };

  const handleEditOdu = (oduId: string) => {
    setSelectedOdu(oduId);
  };

  const handleBulkUploadSuccess = () => {
    setShowBulkUpload(false);
    setRefreshTrigger((prev) => prev + 1);
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

  if (!isColaborador) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container px-4 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Edição de Odu</h1>
              <p className="text-muted-foreground mt-1">
                Gerencie o conteúdo dos 256 Odu de Ifá
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkUpload(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload em Massa
              </Button>
              <Button
                onClick={() => setSelectedOdu('new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Odu
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {showBulkUpload ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload em Massa</CardTitle>
              <CardDescription>
                Importe múltiplos Odu de uma vez usando CSV ou JSON
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkUpload
                onSuccess={handleBulkUploadSuccess}
              />
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkUpload(false)}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : selectedOdu ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedOdu === 'new' ? 'Criar Novo Odu' : 'Editar Odu'}
              </CardTitle>
              <CardDescription>
                Preencha os campos abaixo para {selectedOdu === 'new' ? 'criar' : 'editar'} o Odu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OduEditor
                oduId={selectedOdu === 'new' ? undefined : selectedOdu}
                onSaved={handleOduSaved}
                onCancel={() => setSelectedOdu(null)}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Lista de Odu</CardTitle>
              <CardDescription>
                Visualize e edite os Odu cadastrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OduList
                onEdit={handleEditOdu}
                refreshTrigger={refreshTrigger}
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
