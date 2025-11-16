import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Save, History } from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './quill-custom.css';

interface OduEditorProps {
  oduId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function OduEditor({ oduId, onSaved, onCancel }: OduEditorProps) {
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    numero: '',
    nome: '',
    texto_principal: '',
    verso: '',
    significado: '',
    exemplos_praticos: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (oduId && oduId !== 'new') {
      loadOdu();
    }
  }, [oduId]);

  async function loadOdu() {
    if (!oduId || oduId === 'new') return;

    try {
      const { data, error } = await supabase
        .from('odu')
        .select('*')
        .eq('id', oduId)
        .single();

      if (error) throw error;

      setFormData({
        numero: data.numero.toString(),
        nome: data.nome,
        texto_principal: data.texto_principal,
        verso: data.verso || '',
        significado: data.significado || '',
        exemplos_praticos: data.exemplos_praticos || '',
        tags: data.tags || [],
      });
    } catch (error) {
      console.error('Error loading Odu:', error);
      toast.error('Erro ao carregar Odu');
    }
  }

  async function loadHistory() {
    if (!oduId || oduId === 'new') return;

    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('odu_history')
        .select('*')
        .eq('odu_id', oduId)
        .order('edited_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const oduData = {
        numero: parseInt(formData.numero),
        nome: formData.nome,
        texto_principal: formData.texto_principal,
        verso: formData.verso || null,
        significado: formData.significado || null,
        exemplos_praticos: formData.exemplos_praticos || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
      };

      if (oduId && oduId !== 'new') {
        // Update existing
        const { error } = await supabase
          .from('odu')
          .update(oduData)
          .eq('id', oduId);

        if (error) throw error;
        toast.success('Odu atualizado com sucesso');
      } else {
        // Create new
        const { error } = await supabase.from('odu').insert(oduData);

        if (error) throw error;
        toast.success('Odu criado com sucesso');
      }

      onSaved();
    } catch (error: any) {
      console.error('Error saving Odu:', error);
      toast.error(error.message || 'Erro ao salvar Odu');
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div>
      {showHistory ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Histórico de Edições</h3>
            <Button variant="ghost" onClick={() => setShowHistory(false)}>
              Fechar
            </Button>
          </div>
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">#{entry.numero} - {entry.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.edited_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                {entry.change_description && (
                  <p className="text-sm text-muted-foreground">{entry.change_description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {oduId && oduId !== 'new' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadHistory}
                  disabled={loadingHistory}
                >
                  <History className="h-4 w-4 mr-2" />
                  Ver Histórico
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="numero">Número *</Label>
              <Input
                id="numero"
                type="number"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                required
                min="1"
                max="256"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="texto_principal">Texto Principal *</Label>
            <ReactQuill
              theme="snow"
              value={formData.texto_principal}
              onChange={(value) => setFormData({ ...formData, texto_principal: value })}
              modules={{
                toolbar: [
                  ['bold', 'italic', 'underline'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  ['clean'],
                ],
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verso">Verso</Label>
            <ReactQuill
              theme="snow"
              value={formData.verso}
              onChange={(value) => setFormData({ ...formData, verso: value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="significado">Significado</Label>
            <ReactQuill
              theme="snow"
              value={formData.significado}
              onChange={(value) => setFormData({ ...formData, significado: value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exemplos_praticos">Exemplos Práticos</Label>
            <ReactQuill
              theme="snow"
              value={formData.exemplos_praticos}
              onChange={(value) => setFormData({ ...formData, exemplos_praticos: value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Digite uma tag e pressione Enter"
              />
              <Button type="button" onClick={addTag} variant="outline">
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Odu'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
