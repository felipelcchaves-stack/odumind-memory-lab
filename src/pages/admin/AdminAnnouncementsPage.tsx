import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Eye, Info, Sparkles, AlertTriangle, Gift, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import ReactMarkdown from 'react-markdown';

interface Announcement {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  ativo: boolean;
  show_to: string;
  created_at: string;
  updated_at: string;
}

interface ReadStats {
  [key: string]: number;
}

const tipoOptions = [
  { value: 'info', label: 'Informação', icon: Info, color: 'text-blue-500' },
  { value: 'novidade', label: 'Novidade', icon: Sparkles, color: 'text-purple-500' },
  { value: 'alerta', label: 'Alerta', icon: AlertTriangle, color: 'text-amber-500' },
  { value: 'promocao', label: 'Promoção', icon: Gift, color: 'text-green-500' },
];

const showToOptions = [
  { value: 'todos', label: 'Todos os usuários' },
  { value: 'free', label: 'Apenas usuários Free' },
  { value: 'premium', label: 'Apenas Premium' },
  { value: 'admins', label: 'Apenas Admins' },
];

export default function AdminAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readStats, setReadStats] = useState<ReadStats>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<Announcement | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    tipo: 'info',
    show_to: 'todos',
    ativo: false,
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAnnouncements(data || []);

      // Load read stats for each announcement
      const stats: ReadStats = {};
      for (const ann of data || []) {
        const { count } = await supabase
          .from('user_announcements_read')
          .select('*', { count: 'exact', head: true })
          .eq('announcement_id', ann.id);
        stats[ann.id] = count || 0;
      }
      setReadStats(stats);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast.error('Erro ao carregar anúncios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim() || !formData.conteudo.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // If activating this announcement, deactivate others first
      if (formData.ativo) {
        await supabase
          .from('admin_announcements')
          .update({ ativo: false })
          .neq('id', editingAnnouncement?.id || '');
      }

      if (editingAnnouncement) {
        // Update existing
        const { error } = await supabase
          .from('admin_announcements')
          .update({
            titulo: formData.titulo,
            conteudo: formData.conteudo,
            tipo: formData.tipo,
            show_to: formData.show_to,
            ativo: formData.ativo,
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        toast.success('Anúncio atualizado!');
      } else {
        // Create new
        const { error } = await supabase
          .from('admin_announcements')
          .insert({
            titulo: formData.titulo,
            conteudo: formData.conteudo,
            tipo: formData.tipo,
            show_to: formData.show_to,
            ativo: formData.ativo,
            created_by: user?.id,
          });

        if (error) throw error;
        toast.success('Anúncio criado!');
      }

      setIsDialogOpen(false);
      resetForm();
      loadAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Erro ao salvar anúncio');
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const newActiveState = !announcement.ativo;

      // If activating, deactivate others first
      if (newActiveState) {
        await supabase
          .from('admin_announcements')
          .update({ ativo: false })
          .neq('id', announcement.id);
      }

      const { error } = await supabase
        .from('admin_announcements')
        .update({ ativo: newActiveState })
        .eq('id', announcement.id);

      if (error) throw error;

      toast.success(newActiveState ? 'Anúncio ativado!' : 'Anúncio desativado!');
      loadAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;

    try {
      const { error } = await supabase
        .from('admin_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Anúncio excluído!');
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Erro ao excluir anúncio');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      titulo: announcement.titulo,
      conteudo: announcement.conteudo,
      tipo: announcement.tipo,
      show_to: announcement.show_to,
      ativo: announcement.ativo,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAnnouncement(null);
    setFormData({
      titulo: '',
      conteudo: '',
      tipo: 'info',
      show_to: 'todos',
      ativo: false,
    });
  };

  const getTipoConfig = (tipo: string) => {
    return tipoOptions.find(t => t.value === tipo) || tipoOptions[0];
  };

  const getShowToLabel = (showTo: string) => {
    return showToOptions.find(s => s.value === showTo)?.label || showTo;
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Anúncios"
        description="Gerencie mensagens e comunicados para os usuários"
      />

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          ⚠️ Apenas 1 anúncio pode estar ativo por vez
        </p>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Anúncio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'Editar Anúncio' : 'Novo Anúncio'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Nova funcionalidade disponível!"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conteudo">Conteúdo (Markdown) *</Label>
                <Textarea
                  id="conteudo"
                  value={formData.conteudo}
                  onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                  placeholder="Escreva o conteúdo do anúncio... Suporta **negrito**, *itálico*, listas, etc."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Suporta Markdown: **negrito**, *itálico*, - listas, [links](url)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className={`h-4 w-4 ${opt.color}`} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Exibir para</Label>
                  <Select
                    value={formData.show_to}
                    onValueChange={(value) => setFormData({ ...formData, show_to: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {showToOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label htmlFor="ativo">Ativar imediatamente</Label>
              </div>

              {formData.conteudo && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{formData.conteudo}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingAnnouncement ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando anúncios...
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum anúncio criado ainda. Crie o primeiro!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => {
            const tipoConfig = getTipoConfig(ann.tipo);
            const TipoIcon = tipoConfig.icon;

            return (
              <Card key={ann.id} className={ann.ativo ? 'border-primary' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full bg-muted ${tipoConfig.color}`}>
                        <TipoIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {ann.titulo}
                          {ann.ativo && (
                            <Badge variant="default" className="text-xs">
                              Ativo
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {tipoConfig.label}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getShowToLabel(ann.show_to)}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs">
                            <Users className="h-3 w-3" />
                            {readStats[ann.id] || 0} leituras
                          </span>
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={ann.ativo}
                        onCheckedChange={() => handleToggleActive(ann)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPreviewContent(ann);
                          setPreviewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(ann)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(ann.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {ann.conteudo.replace(/[#*_`]/g, '').substring(0, 150)}...
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Criado em {format(new Date(ann.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{previewContent?.titulo}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none py-4">
            <ReactMarkdown>{previewContent?.conteudo || ''}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
