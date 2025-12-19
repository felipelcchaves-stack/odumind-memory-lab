import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, X, Loader2, Mail } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface CaminhoEditorProps {
  caminhoId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

const ICON_OPTIONS = [
  { value: 'BookOpen', label: '📖 Livro' },
  { value: 'Scroll', label: '📜 Pergaminho' },
  { value: 'Star', label: '⭐ Estrela' },
  { value: 'Flame', label: '🔥 Chama' },
  { value: 'Heart', label: '❤️ Coração' },
  { value: 'Sparkles', label: '✨ Brilho' },
  { value: 'Sun', label: '☀️ Sol' },
  { value: 'Moon', label: '🌙 Lua' },
  { value: 'Leaf', label: '🍃 Folha' },
  { value: 'Crown', label: '👑 Coroa' },
];

const COLOR_OPTIONS = [
  { value: 'amber', label: 'Âmbar', hex: '#f59e0b' },
  { value: 'emerald', label: 'Esmeralda', hex: '#10b981' },
  { value: 'blue', label: 'Azul', hex: '#3b82f6' },
  { value: 'purple', label: 'Roxo', hex: '#8b5cf6' },
  { value: 'rose', label: 'Rosa', hex: '#f43f5e' },
  { value: 'orange', label: 'Laranja', hex: '#f97316' },
  { value: 'teal', label: 'Teal', hex: '#14b8a6' },
  { value: 'indigo', label: 'Índigo', hex: '#6366f1' },
];

interface FormData {
  slug: string;
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
  ordem: number;
  ativo: boolean;
  requer_assinatura: boolean;
  imagem_url: string;
}

export default function CaminhoEditor({ caminhoId, onSaved, onCancel }: CaminhoEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const originalAtivoRef = useRef<boolean | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    slug: '',
    nome: '',
    descricao: '',
    icone: 'BookOpen',
    cor: 'amber',
    ordem: 1,
    ativo: true,
    requer_assinatura: true,
    imagem_url: '',
  });

  useEffect(() => {
    if (caminhoId) {
      loadCaminho();
    } else {
      loadNextOrder();
    }
  }, [caminhoId]);

  async function loadCaminho() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('id', caminhoId)
        .single();

      if (error) throw error;
      
      const ativoValue = data.ativo ?? true;
      originalAtivoRef.current = ativoValue;
      
      setFormData({
        slug: data.slug,
        nome: data.nome,
        descricao: data.descricao || '',
        icone: data.icone,
        cor: data.cor,
        ordem: data.ordem,
        ativo: ativoValue,
        requer_assinatura: data.requer_assinatura ?? true,
        imagem_url: data.imagem_url || '',
      });
    } catch (error) {
      console.error('Error loading path:', error);
      toast.error('Erro ao carregar caminho');
    } finally {
      setLoading(false);
    }
  }

  async function loadNextOrder() {
    try {
      const { data } = await supabase
        .from('learning_paths')
        .select('ordem')
        .order('ordem', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, ordem: data[0].ordem + 1 }));
      }
    } catch (error) {
      console.error('Error loading next order:', error);
    }
  }

  function generateSlug(nome: string): string {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function handleNomeChange(nome: string) {
    setFormData(prev => ({
      ...prev,
      nome,
      slug: prev.slug || generateSlug(nome),
    }));
  }

  async function sendLaunchNotifications(data: FormData) {
    setSendingNotifications(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Sessão não encontrada');
      }

      const response = await supabase.functions.invoke('notify-course-launch', {
        body: {
          courseId: caminhoId,
          courseName: data.nome,
          courseDescription: data.descricao,
          courseSlug: data.slug,
        },
      });

      if (response.error) {
        console.error('Error sending notifications:', response.error);
        toast.error('Erro ao enviar notificações por email');
      } else {
        const stats = response.data?.stats;
        toast.success(`Notificações enviadas: ${stats?.successCount || 0} emails`);
      }
    } catch (error) {
      console.error('Error sending launch notifications:', error);
      toast.error('Erro ao enviar notificações');
    } finally {
      setSendingNotifications(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.slug || !formData.nome) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    // Check if course is being activated (was inactive, now active)
    const isBeingActivated = caminhoId && 
      originalAtivoRef.current === false && 
      formData.ativo === true;

    if (isBeingActivated) {
      setPendingFormData(formData);
      setShowNotificationDialog(true);
      return;
    }

    await saveForm(formData);
  }

  async function saveForm(data: FormData, sendNotifications: boolean = false) {
    setSaving(true);
    try {
      const payload = {
        slug: data.slug,
        nome: data.nome,
        descricao: data.descricao || null,
        icone: data.icone,
        cor: data.cor,
        ordem: data.ordem,
        ativo: data.ativo,
        requer_assinatura: data.requer_assinatura,
        imagem_url: data.imagem_url || null,
      };

      if (caminhoId) {
        const { error } = await supabase
          .from('learning_paths')
          .update(payload)
          .eq('id', caminhoId);

        if (error) throw error;
        toast.success('Caminho atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('learning_paths')
          .insert([payload]);

        if (error) throw error;
        toast.success('Caminho criado com sucesso');
      }

      // Send notifications if requested
      if (sendNotifications) {
        await sendLaunchNotifications(data);
      }

      onSaved();
    } catch (error: any) {
      console.error('Error saving path:', error);
      toast.error(error.message || 'Erro ao salvar caminho');
    } finally {
      setSaving(false);
    }
  }

  async function handleNotificationDialogConfirm(sendNotifications: boolean) {
    setShowNotificationDialog(false);
    if (pendingFormData) {
      await saveForm(pendingFormData, sendNotifications);
      setPendingFormData(null);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => handleNomeChange(e.target.value)}
              placeholder="Ex: Caminho de Oogun"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="caminho-de-oogun"
              required
            />
            <p className="text-xs text-muted-foreground">
              Usado na URL: /caminho/{formData.slug || 'slug'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            value={formData.descricao}
            onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
            placeholder="Descreva o conteúdo deste caminho de aprendizado..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="icone">Ícone</Label>
            <Select
              value={formData.icone}
              onValueChange={(value) => setFormData(prev => ({ ...prev, icone: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((icon) => (
                  <SelectItem key={icon.value} value={icon.value}>
                    {icon.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cor">Cor</Label>
            <Select
              value={formData.cor}
              onValueChange={(value) => setFormData(prev => ({ ...prev, cor: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ordem">Ordem</Label>
            <Input
              id="ordem"
              type="number"
              min="1"
              value={formData.ordem}
              onChange={(e) => setFormData(prev => ({ ...prev, ordem: parseInt(e.target.value) || 1 }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="imagem_url">URL da Imagem de Capa</Label>
          <Input
            id="imagem_url"
            value={formData.imagem_url}
            onChange={(e) => setFormData(prev => ({ ...prev, imagem_url: e.target.value }))}
            placeholder="https://exemplo.com/imagem.jpg"
          />
        </div>

        <div className="flex items-center gap-8 py-4 border-t">
          <div className="flex items-center gap-2">
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
            />
            <Label htmlFor="ativo">Ativo</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="requer_assinatura"
              checked={formData.requer_assinatura}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requer_assinatura: checked }))}
            />
            <Label htmlFor="requer_assinatura">Requer Assinatura Premium</Label>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button type="submit" disabled={saving || sendingNotifications}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {caminhoId ? 'Salvar Alterações' : 'Criar Caminho'}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </form>

      <AlertDialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Curso sendo lançado!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está ativando o curso <strong>"{formData.nome}"</strong>. 
              Deseja enviar um email de notificação para todos os usuários informando sobre o lançamento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleNotificationDialogConfirm(false)}>
              Não enviar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleNotificationDialogConfirm(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar notificações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
