import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Search, FolderOpen, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CaminhoListProps {
  onEdit: (caminhoId: string) => void;
  onManageContent: (caminhoId: string) => void;
  refreshTrigger: number;
}

interface LearningPath {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  icone: string;
  cor: string;
  ordem: number;
  ativo: boolean;
  requer_assinatura: boolean;
  total_conteudos: number;
}

export default function CaminhoList({ onEdit, onManageContent, refreshTrigger }: CaminhoListProps) {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [filteredPaths, setFilteredPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pathToDelete, setPathToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadPaths();
  }, [refreshTrigger]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = paths.filter(
        (path) =>
          path.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          path.slug.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPaths(filtered);
    } else {
      setFilteredPaths(paths);
    }
  }, [searchTerm, paths]);

  async function loadPaths() {
    try {
      const { data, error } = await supabase
        .from('learning_paths')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      setPaths(data || []);
      setFilteredPaths(data || []);
    } catch (error) {
      console.error('Error loading paths:', error);
      toast.error('Erro ao carregar caminhos');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(pathId: string) {
    try {
      // Check if path has content
      const { count } = await supabase
        .from('path_content')
        .select('*', { count: 'exact', head: true })
        .eq('path_id', pathId);

      if (count && count > 0) {
        toast.error('Não é possível excluir um caminho que possui conteúdos. Remova os conteúdos primeiro.');
        return;
      }

      const { error } = await supabase.from('learning_paths').delete().eq('id', pathId);

      if (error) throw error;
      toast.success('Caminho excluído com sucesso');
      loadPaths();
    } catch (error: any) {
      console.error('Error deleting path:', error);
      toast.error(error.message || 'Erro ao excluir caminho');
    } finally {
      setDeleteDialogOpen(false);
      setPathToDelete(null);
    }
  }

  async function handleToggleActive(pathId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('learning_paths')
        .update({ ativo: !currentStatus })
        .eq('id', pathId);

      if (error) throw error;
      toast.success(currentStatus ? 'Caminho desativado' : 'Caminho ativado');
      loadPaths();
    } catch (error: any) {
      console.error('Error toggling path status:', error);
      toast.error('Erro ao alterar status');
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">{filteredPaths.length} Caminhos</Badge>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ordem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-center">Conteúdos</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Assinatura</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPaths.map((path) => (
              <TableRow key={path.id}>
                <TableCell className="font-medium">{path.ordem}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: `var(--${path.cor}-500, hsl(var(--primary)))` }}
                    />
                    <span className="font-semibold">{path.nome}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{path.slug}</code>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{path.total_conteudos || 0}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={path.ativo ? "default" : "secondary"}>
                    {path.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={path.requer_assinatura ? "destructive" : "outline"}>
                    {path.requer_assinatura ? "Premium" : "Grátis"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onManageContent(path.id)}
                      title="Gerenciar Conteúdos"
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(path.id, path.ativo ?? true)}
                      title={path.ativo ? "Desativar" : "Ativar"}
                    >
                      {path.ativo ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(path.id)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPathToDelete(path.id);
                        setDeleteDialogOpen(true);
                      }}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredPaths.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum caminho encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este caminho? Esta ação não pode ser desfeita.
              O caminho só pode ser excluído se não possuir conteúdos associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pathToDelete && handleDelete(pathToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
