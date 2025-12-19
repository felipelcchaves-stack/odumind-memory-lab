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
import { Edit, Trash2, Search, Plus, ArrowLeft, GripVertical } from 'lucide-react';
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
import PathContentEditor from './PathContentEditor';

interface PathContentManagerProps {
  pathId: string;
  onBack: () => void;
}

interface PathContent {
  id: string;
  path_id: string;
  numero: number | null;
  nome: string;
  texto_principal: string;
  dificuldade: string | null;
  ordem: number | null;
  ativo: boolean | null;
  tags: string[] | null;
}

interface LearningPath {
  id: string;
  nome: string;
  slug: string;
}

export default function PathContentManager({ pathId, onBack }: PathContentManagerProps) {
  const [path, setPath] = useState<LearningPath | null>(null);
  const [contents, setContents] = useState<PathContent[]>([]);
  const [filteredContents, setFilteredContents] = useState<PathContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadPath();
    loadContents();
  }, [pathId]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = contents.filter(
        (content) =>
          content.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (content.numero?.toString() || '').includes(searchTerm)
      );
      setFilteredContents(filtered);
    } else {
      setFilteredContents(contents);
    }
  }, [searchTerm, contents]);

  async function loadPath() {
    try {
      const { data, error } = await supabase
        .from('learning_paths')
        .select('id, nome, slug')
        .eq('id', pathId)
        .single();

      if (error) throw error;
      setPath(data);
    } catch (error) {
      console.error('Error loading path:', error);
    }
  }

  async function loadContents() {
    try {
      const { data, error } = await supabase
        .from('path_content')
        .select('id, path_id, numero, nome, texto_principal, dificuldade, ordem, ativo, tags')
        .eq('path_id', pathId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setContents(data || []);
      setFilteredContents(data || []);
      
      // Update total_conteudos in learning_paths
      await supabase
        .from('learning_paths')
        .update({ total_conteudos: data?.length || 0 })
        .eq('id', pathId);
    } catch (error) {
      console.error('Error loading contents:', error);
      toast.error('Erro ao carregar conteúdos');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(contentId: string) {
    try {
      const { error } = await supabase.from('path_content').delete().eq('id', contentId);

      if (error) throw error;
      toast.success('Conteúdo excluído com sucesso');
      loadContents();
    } catch (error: any) {
      console.error('Error deleting content:', error);
      toast.error(error.message || 'Erro ao excluir conteúdo');
    } finally {
      setDeleteDialogOpen(false);
      setContentToDelete(null);
    }
  }

  function handleContentSaved() {
    setEditingContent(null);
    setShowEditor(false);
    loadContents();
  }

  if (showEditor) {
    return (
      <PathContentEditor
        pathId={pathId}
        contentId={editingContent === 'new' ? undefined : editingContent || undefined}
        onSaved={handleContentSaved}
        onCancel={() => {
          setEditingContent(null);
          setShowEditor(false);
        }}
      />
    );
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h3 className="text-lg font-semibold">
              Conteúdos: {path?.nome}
            </h3>
            <p className="text-sm text-muted-foreground">
              Gerencie os conteúdos deste caminho de aprendizado
            </p>
          </div>
        </div>
        <Button onClick={() => {
          setEditingContent('new');
          setShowEditor(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Conteúdo
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">{filteredContents.length} Conteúdos</Badge>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Dificuldade</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContents.map((content) => (
              <TableRow key={content.id}>
                <TableCell>
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                </TableCell>
                <TableCell className="font-medium">
                  {content.numero ? `#${content.numero}` : content.ordem}
                </TableCell>
                <TableCell className="font-semibold">{content.nome}</TableCell>
                <TableCell>
                  {content.dificuldade && (
                    <Badge variant="outline">{content.dificuldade}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {content.tags?.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {content.tags && content.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{content.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={content.ativo ? "default" : "secondary"}>
                    {content.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingContent(content.id);
                        setShowEditor(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setContentToDelete(content.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredContents.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum conteúdo encontrado. Clique em "Novo Conteúdo" para adicionar.
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
              Tem certeza que deseja excluir este conteúdo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => contentToDelete && handleDelete(contentToDelete)}
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
