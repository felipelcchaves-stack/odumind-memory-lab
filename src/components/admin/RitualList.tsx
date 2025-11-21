import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface RitualListProps {
  onEdit: (ritualId: string) => void;
  refreshTrigger: number;
}

export default function RitualList({ onEdit, refreshTrigger }: RitualListProps) {
  const [rituais, setRituais] = useState<any[]>([]);
  const [contentTypes, setContentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    loadContentTypes();
    loadRituais();
  }, [refreshTrigger]);

  async function loadContentTypes() {
    try {
      const { data, error } = await supabase
        .from('content_types')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setContentTypes(data || []);
    } catch (error) {
      console.error('Error loading content types:', error);
    }
  }

  async function loadRituais() {
    setLoading(true);
    try {
      let query = supabase
        .from('ritual_content')
        .select('*, content_types(nome, slug)')
        .order('numero');

      if (selectedType !== 'all') {
        query = query.eq('content_type_id', selectedType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRituais(data || []);
    } catch (error) {
      console.error('Error loading rituais:', error);
      toast.error('Erro ao carregar conteúdo');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;

    try {
      const { error } = await supabase
        .from('ritual_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Conteúdo excluído com sucesso');
      loadRituais();
    } catch (error) {
      console.error('Error deleting ritual:', error);
      toast.error('Erro ao excluir conteúdo');
    }
  }

  useEffect(() => {
    loadRituais();
  }, [selectedType]);

  const filteredRituais = rituais.filter((ritual) =>
    ritual.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ritual.numero?.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo de conteúdo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {contentTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : filteredRituais.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum conteúdo encontrado</p>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Dificuldade</TableHead>
                <TableHead>Materiais</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRituais.map((ritual) => (
                <TableRow key={ritual.id}>
                  <TableCell className="font-medium">
                    {ritual.numero || '-'}
                  </TableCell>
                  <TableCell>{ritual.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ritual.content_types?.nome || 'Não categorizado'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ritual.dificuldade && (
                      <Badge
                        variant={
                          ritual.dificuldade === 'iniciante'
                            ? 'default'
                            : ritual.dificuldade === 'intermediario'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {ritual.dificuldade}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {ritual.materiais_necessarios?.length || 0} itens
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(ritual.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(ritual.id, ritual.nome)}
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
      )}

      <div className="text-sm text-muted-foreground">
        Total: {filteredRituais.length} conteúdo(s)
      </div>
    </div>
  );
}
