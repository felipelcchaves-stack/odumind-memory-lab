import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
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
import { Edit, Trash2, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { SafeHtmlRenderer } from '@/components/SafeHtmlRenderer';
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

interface OduListProps {
  onEdit: (oduId: string) => void;
  refreshTrigger: number;
}

interface Odu {
  id: string;
  numero: number;
  nome: string;
  texto_principal: string;
  tags: string[] | null;
}

export default function OduList({ onEdit, refreshTrigger }: OduListProps) {
  const navigate = useNavigate();
  const [odus, setOdus] = useState<Odu[]>([]);
  const [filteredOdus, setFilteredOdus] = useState<Odu[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [oduToDelete, setOduToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadOdus();
  }, [refreshTrigger]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = odus.filter(
        (odu) =>
          odu.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          odu.numero.toString().includes(searchTerm)
      );
      setFilteredOdus(filtered);
    } else {
      setFilteredOdus(odus);
    }
  }, [searchTerm, odus]);

  async function loadOdus() {
    try {
      const { data, error } = await supabase
        .from('odu')
        .select('id, numero, nome, texto_principal, tags')
        .order('numero', { ascending: true });

      if (error) throw error;
      setOdus(data || []);
      setFilteredOdus(data || []);
    } catch (error) {
      console.error('Error loading Odus:', error);
      toast.error('Erro ao carregar Odu');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(oduId: string) {
    try {
      const { error } = await supabase.from('odu').delete().eq('id', oduId);

      if (error) throw error;
      toast.success('Odu excluído com sucesso');
      loadOdus();
    } catch (error: any) {
      console.error('Error deleting Odu:', error);
      toast.error(error.message || 'Erro ao excluir Odu');
    } finally {
      setDeleteDialogOpen(false);
      setOduToDelete(null);
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
            placeholder="Buscar por nome ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">{filteredOdus.length} Odu</Badge>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Texto</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOdus.map((odu) => (
              <TableRow key={odu.id}>
                <TableCell className="font-medium">#{odu.numero}</TableCell>
                <TableCell className="font-semibold">{odu.nome}</TableCell>
                <TableCell className="max-w-md truncate">
                  <SafeHtmlRenderer
                    html={odu.texto_principal}
                    className="line-clamp-2"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {odu.tags?.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {odu.tags && odu.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{odu.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/odu/${odu.id}`)}
                      title="Visualizar Odu"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(odu.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOduToDelete(odu.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este Odu? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => oduToDelete && handleDelete(oduToDelete)}
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
