import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './quill-custom.css';
import ImageUploader from './ImageUploader';
import AudioUploader from './AudioUploader';

interface RitualEditorProps {
  ritualId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function RitualEditor({ ritualId, onSaved, onCancel }: RitualEditorProps) {
  const [loading, setLoading] = useState(false);
  const [contentTypes, setContentTypes] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    content_type_id: '',
    numero: '',
    nome: '',
    texto_principal: '',
    verso_resumido: '',
    dificuldade: 'iniciante',
    tempo_execucao: '',
    materiais_necessarios: [] as string[],
    odu_relacionados: [] as string[],
    tags: [] as string[],
    exemplos_praticos: '',
    contexto_historico: '',
    audio_url: '',
  });
  const [materialInput, setMaterialInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  
  const textoQuillRef = useRef<ReactQuill>(null);
  const exemplosQuillRef = useRef<ReactQuill>(null);
  const contextoQuillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    loadContentTypes();
    if (ritualId && ritualId !== 'new') {
      loadRitual();
    }
  }, [ritualId]);

  async function loadContentTypes() {
    try {
      const { data, error } = await supabase
        .from('content_types')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setContentTypes(data || []);
      
      // Set default content type if creating new
      if ((!ritualId || ritualId === 'new') && data && data.length > 0) {
        setFormData(prev => ({ ...prev, content_type_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error loading content types:', error);
    }
  }

  async function loadRitual() {
    if (!ritualId || ritualId === 'new') return;

    try {
      const { data, error } = await supabase
        .from('ritual_content')
        .select('*')
        .eq('id', ritualId)
        .single();

      if (error) throw error;

      setFormData({
        content_type_id: data.content_type_id || '',
        numero: data.numero?.toString() || '',
        nome: data.nome,
        texto_principal: data.texto_principal || '',
        verso_resumido: data.verso_resumido || '',
        dificuldade: data.dificuldade || 'iniciante',
        tempo_execucao: data.tempo_execucao?.toString() || '',
        materiais_necessarios: data.materiais_necessarios || [],
        odu_relacionados: data.odu_relacionados || [],
        tags: data.tags || [],
        exemplos_praticos: data.exemplos_praticos || '',
        contexto_historico: data.contexto_historico || '',
        audio_url: data.audio_url || '',
      });
    } catch (error) {
      console.error('Error loading ritual:', error);
      toast.error('Erro ao carregar conteúdo');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const ritualData = {
        content_type_id: formData.content_type_id || null,
        numero: formData.numero ? parseInt(formData.numero) : null,
        nome: formData.nome,
        texto_principal: formData.texto_principal,
        verso_resumido: formData.verso_resumido || null,
        dificuldade: formData.dificuldade || null,
        tempo_execucao: formData.tempo_execucao ? parseInt(formData.tempo_execucao) : null,
        materiais_necessarios: formData.materiais_necessarios.length > 0 ? formData.materiais_necessarios : null,
        odu_relacionados: formData.odu_relacionados.length > 0 ? formData.odu_relacionados : null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        exemplos_praticos: formData.exemplos_praticos || null,
        contexto_historico: formData.contexto_historico || null,
        audio_url: formData.audio_url || null,
      };

      if (ritualId && ritualId !== 'new') {
        const { error } = await supabase
          .from('ritual_content')
          .update(ritualData)
          .eq('id', ritualId);

        if (error) throw error;
        toast.success('Conteúdo atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('ritual_content')
          .insert([ritualData]);

        if (error) throw error;
        toast.success('Conteúdo criado com sucesso');
      }

      onSaved();
    } catch (error: any) {
      console.error('Error saving ritual:', error);
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const addMaterial = () => {
    if (materialInput.trim() && !formData.materiais_necessarios.includes(materialInput.trim())) {
      setFormData({
        ...formData,
        materiais_necessarios: [...formData.materiais_necessarios, materialInput.trim()],
      });
      setMaterialInput('');
    }
  };

  const removeMaterial = (material: string) => {
    setFormData({
      ...formData,
      materiais_necessarios: formData.materiais_necessarios.filter((m) => m !== material),
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const insertImageToEditor = (quillRef: React.RefObject<ReactQuill>, imageUrl: string) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const range = editor.getSelection(true);
      editor.insertEmbed(range.index, 'image', imageUrl);
      editor.setSelection(range.index + 1, 0);
      toast.success('Imagem inserida!');
    }
  };

  const handleAudioUploaded = (audioUrl: string) => {
    setFormData({ ...formData, audio_url: audioUrl });
    toast.success('Áudio carregado com sucesso!');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="content_type">Tipo de Conteúdo *</Label>
          <Select
            value={formData.content_type_id}
            onValueChange={(value) => setFormData({ ...formData, content_type_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {contentTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="numero">Número (opcional)</Label>
          <Input
            id="numero"
            type="number"
            value={formData.numero}
            onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="nome">Nome *</Label>
          <Input
            id="nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dificuldade">Dificuldade</Label>
          <Select
            value={formData.dificuldade}
            onValueChange={(value) => setFormData({ ...formData, dificuldade: value })}
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
          <Label htmlFor="tempo">Tempo de Execução (minutos)</Label>
          <Input
            id="tempo"
            type="number"
            value={formData.tempo_execucao}
            onChange={(e) => setFormData({ ...formData, tempo_execucao: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Texto Principal *</Label>
        <ImageUploader onImageUploaded={(url) => insertImageToEditor(textoQuillRef, url)} />
        <ReactQuill
          ref={textoQuillRef}
          theme="snow"
          value={formData.texto_principal}
          onChange={(value) => setFormData({ ...formData, texto_principal: value })}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="verso_resumido">Verso Resumido</Label>
        <Input
          id="verso_resumido"
          value={formData.verso_resumido}
          onChange={(e) => setFormData({ ...formData, verso_resumido: e.target.value })}
          placeholder="Breve resumo ou verso memorável"
        />
      </div>

      <div className="space-y-2">
        <Label>Materiais Necessários</Label>
        <div className="flex gap-2">
          <Input
            value={materialInput}
            onChange={(e) => setMaterialInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
            placeholder="Ex: Vela branca, mel, água"
          />
          <Button type="button" onClick={addMaterial} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.materiais_necessarios.map((material, index) => (
            <Badge key={index} variant="secondary" className="gap-2">
              {material}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeMaterial(material)}
              />
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Ex: proteção, limpeza, prosperidade"
          />
          <Button type="button" onClick={addTag} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="gap-2">
              {tag}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Áudio (para Rezas)</Label>
        <AudioUploader onUploadComplete={handleAudioUploaded} currentAudioUrl={formData.audio_url} />
      </div>

      <div className="space-y-2">
        <Label>Exemplos Práticos</Label>
        <ImageUploader onImageUploaded={(url) => insertImageToEditor(exemplosQuillRef, url)} />
        <ReactQuill
          ref={exemplosQuillRef}
          theme="snow"
          value={formData.exemplos_praticos}
          onChange={(value) => setFormData({ ...formData, exemplos_praticos: value })}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label>Contexto Histórico</Label>
        <ImageUploader onImageUploaded={(url) => insertImageToEditor(contextoQuillRef, url)} />
        <ReactQuill
          ref={contextoQuillRef}
          theme="snow"
          value={formData.contexto_historico}
          onChange={(value) => setFormData({ ...formData, contexto_historico: value })}
          className="bg-background"
        />
      </div>

      <div className="flex gap-4 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
