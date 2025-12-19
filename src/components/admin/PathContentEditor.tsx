import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, X, Loader2, ArrowLeft } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PathContentEditorProps {
  pathId: string;
  contentId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

interface FormData {
  numero: number | null;
  nome: string;
  texto_principal: string;
  verso: string;
  verso_resumido: string;
  significado: string;
  contexto_historico: string;
  exemplos_praticos: string;
  materiais_necessarios: string;
  tempo_execucao: number | null;
  dificuldade: string;
  tags: string;
  ordem: number;
  ativo: boolean;
  audio_url: string;
  imagem_url: string;
}

export default function PathContentEditor({ pathId, contentId, onSaved, onCancel }: PathContentEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    numero: null,
    nome: '',
    texto_principal: '',
    verso: '',
    verso_resumido: '',
    significado: '',
    contexto_historico: '',
    exemplos_praticos: '',
    materiais_necessarios: '',
    tempo_execucao: null,
    dificuldade: 'iniciante',
    tags: '',
    ordem: 1,
    ativo: true,
    audio_url: '',
    imagem_url: '',
  });

  useEffect(() => {
    if (contentId) {
      loadContent();
    } else {
      loadNextOrder();
    }
  }, [contentId]);

  async function loadContent() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('path_content')
        .select('*')
        .eq('id', contentId)
        .single();

      if (error) throw error;
      
      setFormData({
        numero: data.numero,
        nome: data.nome,
        texto_principal: data.texto_principal,
        verso: data.verso || '',
        verso_resumido: data.verso_resumido || '',
        significado: data.significado || '',
        contexto_historico: data.contexto_historico || '',
        exemplos_praticos: data.exemplos_praticos || '',
        materiais_necessarios: data.materiais_necessarios?.join(', ') || '',
        tempo_execucao: data.tempo_execucao,
        dificuldade: data.dificuldade || 'iniciante',
        tags: data.tags?.join(', ') || '',
        ordem: data.ordem || 1,
        ativo: data.ativo ?? true,
        audio_url: data.audio_url || '',
        imagem_url: data.imagem_url || '',
      });
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Erro ao carregar conteúdo');
    } finally {
      setLoading(false);
    }
  }

  async function loadNextOrder() {
    try {
      const { data } = await supabase
        .from('path_content')
        .select('ordem')
        .eq('path_id', pathId)
        .order('ordem', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, ordem: (data[0].ordem || 0) + 1 }));
      }
    } catch (error) {
      console.error('Error loading next order:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.nome || !formData.texto_principal) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        path_id: pathId,
        numero: formData.numero,
        nome: formData.nome,
        texto_principal: formData.texto_principal,
        verso: formData.verso || null,
        verso_resumido: formData.verso_resumido || null,
        significado: formData.significado || null,
        contexto_historico: formData.contexto_historico || null,
        exemplos_praticos: formData.exemplos_praticos || null,
        materiais_necessarios: formData.materiais_necessarios 
          ? formData.materiais_necessarios.split(',').map(s => s.trim()).filter(Boolean)
          : null,
        tempo_execucao: formData.tempo_execucao,
        dificuldade: formData.dificuldade,
        tags: formData.tags 
          ? formData.tags.split(',').map(s => s.trim()).filter(Boolean)
          : null,
        ordem: formData.ordem,
        ativo: formData.ativo,
        audio_url: formData.audio_url || null,
        imagem_url: formData.imagem_url || null,
      };

      if (contentId) {
        const { error } = await supabase
          .from('path_content')
          .update(payload)
          .eq('id', contentId);

        if (error) throw error;
        toast.success('Conteúdo atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('path_content')
          .insert([payload]);

        if (error) throw error;
        toast.success('Conteúdo criado com sucesso');
      }

      onSaved();
    } catch (error: any) {
      console.error('Error saving content:', error);
      toast.error(error.message || 'Erro ao salvar conteúdo');
    } finally {
      setSaving(false);
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h3 className="text-lg font-semibold">
          {contentId ? 'Editar Conteúdo' : 'Novo Conteúdo'}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              type="number"
              value={formData.numero || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                numero: e.target.value ? parseInt(e.target.value) : null 
              }))}
              placeholder="Ex: 1"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome do conteúdo"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="texto_principal">Texto Principal *</Label>
          <Textarea
            id="texto_principal"
            value={formData.texto_principal}
            onChange={(e) => setFormData(prev => ({ ...prev, texto_principal: e.target.value }))}
            placeholder="Conteúdo principal..."
            rows={6}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="verso">Verso</Label>
            <Textarea
              id="verso"
              value={formData.verso}
              onChange={(e) => setFormData(prev => ({ ...prev, verso: e.target.value }))}
              placeholder="Verso completo..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verso_resumido">Verso Resumido</Label>
            <Textarea
              id="verso_resumido"
              value={formData.verso_resumido}
              onChange={(e) => setFormData(prev => ({ ...prev, verso_resumido: e.target.value }))}
              placeholder="Versão resumida..."
              rows={4}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="significado">Significado</Label>
          <Textarea
            id="significado"
            value={formData.significado}
            onChange={(e) => setFormData(prev => ({ ...prev, significado: e.target.value }))}
            placeholder="Significado e interpretação..."
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contexto_historico">Contexto Histórico</Label>
            <Textarea
              id="contexto_historico"
              value={formData.contexto_historico}
              onChange={(e) => setFormData(prev => ({ ...prev, contexto_historico: e.target.value }))}
              placeholder="Contexto histórico..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exemplos_praticos">Exemplos Práticos</Label>
            <Textarea
              id="exemplos_praticos"
              value={formData.exemplos_praticos}
              onChange={(e) => setFormData(prev => ({ ...prev, exemplos_praticos: e.target.value }))}
              placeholder="Exemplos de aplicação..."
              rows={3}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dificuldade">Dificuldade</Label>
            <Select
              value={formData.dificuldade}
              onValueChange={(value) => setFormData(prev => ({ ...prev, dificuldade: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iniciante">Iniciante</SelectItem>
                <SelectItem value="intermediario">Intermediário</SelectItem>
                <SelectItem value="avancado">Avançado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tempo_execucao">Tempo (min)</Label>
            <Input
              id="tempo_execucao"
              type="number"
              value={formData.tempo_execucao || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                tempo_execucao: e.target.value ? parseInt(e.target.value) : null 
              }))}
              placeholder="Ex: 30"
            />
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
          <Label htmlFor="materiais_necessarios">Materiais Necessários</Label>
          <Input
            id="materiais_necessarios"
            value={formData.materiais_necessarios}
            onChange={(e) => setFormData(prev => ({ ...prev, materiais_necessarios: e.target.value }))}
            placeholder="Separados por vírgula: material 1, material 2, material 3"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            placeholder="Separadas por vírgula: tag1, tag2, tag3"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="audio_url">URL do Áudio</Label>
            <Input
              id="audio_url"
              value={formData.audio_url}
              onChange={(e) => setFormData(prev => ({ ...prev, audio_url: e.target.value }))}
              placeholder="https://exemplo.com/audio.mp3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imagem_url">URL da Imagem</Label>
            <Input
              id="imagem_url"
              value={formData.imagem_url}
              onChange={(e) => setFormData(prev => ({ ...prev, imagem_url: e.target.value }))}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 py-4 border-t">
          <Switch
            id="ativo"
            checked={formData.ativo}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
          />
          <Label htmlFor="ativo">Conteúdo Ativo</Label>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {contentId ? 'Salvar Alterações' : 'Criar Conteúdo'}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
