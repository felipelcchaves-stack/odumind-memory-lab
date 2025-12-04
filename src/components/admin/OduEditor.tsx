import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { X, Save, History, AlertTriangle, Eraser } from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './quill-custom.css';
import { z } from 'zod';
import { sanitizeQuillHtml } from '@/lib/markdownUtils';
import ImageUploader from './ImageUploader';
import { formatSignificado } from '@/lib/significadoFormatter';

const oduSchema = z.object({
  numero: z.number()
    .int({ message: "Número deve ser um inteiro" })
    .min(1, { message: "Número deve ser no mínimo 1" }),
  // Sem limite máximo - permite Odus além de 256
  nome: z.string()
    .trim()
    .min(1, { message: "Nome é obrigatório" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  texto_principal: z.string()
    .trim()
    .min(10, { message: "Texto principal deve ter pelo menos 10 caracteres" })
    .max(10000, { message: "Texto principal deve ter no máximo 10.000 caracteres" }),
  verso: z.string()
    .max(5000, { message: "Verso deve ter no máximo 5.000 caracteres" })
    .nullable()
    .optional()
    .transform(val => val === "" ? null : val),
  verso_resumido: z.string()
    .trim()
    .min(10, { message: "Verso resumido deve ter pelo menos 10 caracteres" })
    .max(1000, { message: "Verso resumido deve ter no máximo 1000 caracteres" })
    .nullable()
    .optional()
    .transform(val => val === "" ? null : val),
  significado: z.string()
    .max(5000, { message: "Significado deve ter no máximo 5.000 caracteres" })
    .nullable()
    .optional()
    .transform(val => val === "" ? null : val),
  exemplos_praticos: z.string()
    .max(5000, { message: "Exemplos práticos devem ter no máximo 5.000 caracteres" })
    .nullable()
    .optional()
    .transform(val => val === "" ? null : val),
  tags: z.array(z.string().trim().max(50, { message: "Tag deve ter no máximo 50 caracteres" }))
    .max(20, { message: "Máximo de 20 tags permitidas" })
    .nullable()
    .optional()
    .transform(val => val && val.length > 0 ? val : null),
});

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
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [formData, setFormData] = useState({
    numero: '',
    nome: '',
    texto_principal: '',
    verso: '',
    verso_resumido: '',
    significado: '',
    exemplos_praticos: '',
    tags: [] as string[],
    contexto_historico: '',
    personagens: '',
    tema_principal: '',
    tema_secundario: '',
  });
  const [tagInput, setTagInput] = useState('');
  
  // Refs for ReactQuill editors to insert images
  const textoQuillRef = useRef<ReactQuill>(null);
  const versoQuillRef = useRef<ReactQuill>(null);
  const significadoQuillRef = useRef<ReactQuill>(null);
  const exemplosQuillRef = useRef<ReactQuill>(null);
  const contextoQuillRef = useRef<ReactQuill>(null);

  // Busca próximo número disponível
  const fetchNextOduNumber = async () => {
    const { data } = await supabase
      .from('odu')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1);
    
    return (data?.[0]?.numero || 0) + 1;
  };

  useEffect(() => {
    if (oduId && oduId !== 'new') {
      loadOdu();
    } else if (oduId === 'new') {
      // Auto-preencher número para novo Odu
      fetchNextOduNumber().then(nextNum => {
        setFormData(prev => ({ ...prev, numero: nextNum.toString() }));
      });
    }
  }, [oduId]);

  // Previne HTML escapado ao carregar do banco
  const unescapeHtml = (html: string): string => {
    if (!html) return html;
    
    return html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
  };

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
        texto_principal: unescapeHtml(data.texto_principal || ''),
        verso: unescapeHtml(data.verso || ''),
        verso_resumido: data.verso_resumido || '',
        significado: unescapeHtml(data.significado || ''),
        exemplos_praticos: unescapeHtml(data.exemplos_praticos || ''),
        tags: data.tags || [],
        contexto_historico: unescapeHtml(data.contexto_historico || ''),
        personagens: data.personagens || '',
        tema_principal: data.tema_principal || '',
        tema_secundario: data.tema_secundario || '',
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
    setUpdateError(null);

    try {
      // ✅ VERIFICAR SESSÃO
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || sessionError) {
        console.error('❌ SESSÃO INVÁLIDA:', { sessionError });
        toast.error('Sessão expirada. Faça login novamente.', { duration: 5000 });
        setUpdateError('Sessão expirada. Faça login novamente.');
        setLoading(false);
        return;
      }

      // ✅ VERIFICAR PERMISSÕES
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ USUÁRIO NÃO ENCONTRADO');
        toast.error('Usuário não encontrado', { duration: 5000 });
        setUpdateError('Usuário não encontrado');
        setLoading(false);
        return;
      }

      const { data: hasRole } = await supabase
        .rpc('has_colaborador_role', { _user_id: user.id });
      
      if (!hasRole) {
        console.error('❌ PERMISSÃO NEGADA:', { userId: user.id, email: user.email });
        toast.error('Você não tem permissão para editar Odus', { duration: 5000 });
        setUpdateError('Você não tem permissão para editar Odus');
        setLoading(false);
        return;
      }

      console.log('✅ Usuário autorizado:', { userId: user.id, email: user.email });

      // Validate input
      const validation = oduSchema.safeParse({
        numero: parseInt(formData.numero),
        nome: formData.nome,
        texto_principal: formData.texto_principal,
        verso: formData.verso || null,
        significado: formData.significado || null,
        exemplos_praticos: formData.exemplos_praticos || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
      });

      if (!validation.success) {
        const firstError = validation.error.errors[0];
        console.error('❌ VALIDAÇÃO FALHOU:', firstError);
        toast.error(firstError.message);
        setUpdateError(`Validação: ${firstError.message}`);
        setLoading(false);
        return;
      }

      const oduData = {
        numero: validation.data.numero,
        nome: validation.data.nome,
        texto_principal: validation.data.texto_principal,
        verso: validation.data.verso ?? null,
        verso_resumido: formData.verso_resumido || null,
        significado: formatSignificado(validation.data.significado) ?? null,
        exemplos_praticos: validation.data.exemplos_praticos ?? null,
        tags: validation.data.tags ?? null,
        contexto_historico: formData.contexto_historico || null,
        personagens: formData.personagens || null,
        tema_principal: formData.tema_principal || null,
        tema_secundario: formData.tema_secundario || null,
      };

      if (oduId && oduId !== 'new') {
        // 🔍 LOG ANTES DO UPDATE
        console.log('🔍 TENTANDO ATUALIZAR ODU:', {
          oduId,
          isUpdate: true,
          userId: user.id,
          userEmail: user.email,
          formData: {
            numero: oduData.numero,
            nome: oduData.nome,
            hasTexto: !!oduData.texto_principal,
            hasVerso: !!oduData.verso,
            textoLength: oduData.texto_principal?.length,
          }
        });

        // Update existing
        const { data, error } = await supabase
          .from('odu')
          .update(oduData)
          .eq('id', oduId)
          .select();

        console.log('📊 RESULTADO DO UPDATE:', { data, error, rowsAffected: data?.length });

        if (error) {
          console.error('❌ ERRO DETALHADO DO SUPABASE:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          setUpdateError(`${error.message}${error.hint ? ' | ' + error.hint : ''}`);
          throw error;
        }

        if (!data || data.length === 0) {
          console.warn('⚠️ UPDATE NÃO RETORNOU DADOS - Possível problema de RLS');
          setUpdateError('UPDATE executado mas nenhum registro foi atualizado. Possível problema de RLS.');
          toast.error('Nenhum registro foi atualizado. Verifique suas permissões.');
          setLoading(false);
          return;
        }

        console.log('✅ ODU ATUALIZADO COM SUCESSO:', data[0]);
        toast.success('Odu atualizado com sucesso');
      } else {
        // Create new - use .select() to confirm insertion
        console.log('🔍 CRIANDO NOVO ODU:', oduData);
        const { data, error } = await supabase
          .from('odu')
          .insert([oduData])
          .select();

        if (error) {
          console.error('❌ ERRO AO CRIAR ODU:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          
          // Handle specific errors
          if (error.code === '23505') {
            setUpdateError(`Odu #${oduData.numero} já existe no banco de dados.`);
            toast.error(`Odu #${oduData.numero} já existe. Use um número diferente.`);
          } else if (error.code === '42501' || error.message?.includes('policy')) {
            setUpdateError('Sem permissão para criar Odu. Verifique suas permissões.');
            toast.error('Sem permissão. Faça login como admin ou colaborador.');
          } else {
            throw error;
          }
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          console.warn('⚠️ INSERT NÃO RETORNOU DADOS - Possível problema de RLS');
          setUpdateError('Inserção não confirmada. Verifique suas permissões.');
          toast.error('Inserção falhou. Verifique se você tem permissão.');
          setLoading(false);
          return;
        }

        console.log('✅ ODU CRIADO COM SUCESSO:', data[0]);
        toast.success('Odu criado com sucesso');
      }

      onSaved();
    } catch (error: any) {
      console.error('❌ ERRO AO SALVAR ODU:', {
        error,
        message: error?.message,
        details: error?.details,
        code: error?.code,
        hint: error?.hint,
        stack: error?.stack
      });
      
      const errorMsg = error?.message || error?.details || 'Erro desconhecido';
      setUpdateError(errorMsg);
      toast.error(`Erro ao salvar: ${errorMsg}`, { duration: 5000 });
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

  const stripHtmlFormatting = (html: string): string => {
    // Remove all HTML tags but preserve text content and line breaks
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const clearFieldFormatting = (fieldName: 'texto_principal' | 'verso' | 'significado' | 'exemplos_praticos' | 'contexto_historico') => {
    const currentValue = formData[fieldName];
    if (!currentValue || currentValue === '<p><br></p>') {
      toast.error('Campo vazio, nada para limpar');
      return;
    }

    const confirmClear = window.confirm(
      `Tem certeza que deseja remover toda a formatação do campo "${
        fieldName === 'texto_principal' ? 'Texto Principal' :
        fieldName === 'verso' ? 'Verso' :
        fieldName === 'significado' ? 'Significado' :
        'Exemplos Práticos'
      }"?\n\nO texto será mantido, mas toda formatação (negrito, itálico, listas) será removida.`
    );

    if (!confirmClear) return;

    const plainText = stripHtmlFormatting(currentValue);
    
    setFormData({
      ...formData,
      [fieldName]: plainText,
    });

    toast.success('Formatação removida com sucesso');
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

          {/* Debug Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <Label htmlFor="debug-mode" className="text-sm">
              Modo Debug (logs detalhados no console)
            </Label>
            <Switch
              id="debug-mode"
              checked={debugMode}
              onCheckedChange={setDebugMode}
            />
          </div>

          {/* Debug Info Card */}
          {debugMode && (
            <Card className="p-4 bg-muted/50 border-yellow-500">
              <h4 className="font-semibold mb-2 text-sm">🔍 Debug Info:</h4>
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify({
                  oduId,
                  isNew: oduId === 'new',
                  formLoaded: !!formData.nome,
                  formData: {
                    numero: formData.numero,
                    nome: formData.nome,
                    texto_length: formData.texto_principal?.length,
                    tags: formData.tags
                  }
                }, null, 2)}
              </pre>
            </Card>
          )}

          {/* Error Alert */}
          {updateError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao Salvar Odu</AlertTitle>
              <AlertDescription>
                {updateError}
                <br />
                <span className="text-xs mt-2 block opacity-75">
                  Abra o console do navegador (F12) para mais detalhes técnicos.
                </span>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="numero">Número *</Label>
              <div className="flex gap-2">
                <Input
                  id="numero"
                  type="number"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  required
                  min="1"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const nextNum = await fetchNextOduNumber();
                    setFormData({ ...formData, numero: nextNum.toString() });
                    toast.success(`Próximo número disponível: ${nextNum}`);
                  }}
                  title="Usar próximo número disponível"
                >
                  Auto
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Número incremental automático (sem limite)
              </p>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="texto_principal">Texto Principal *</Label>
              <div className="flex items-center gap-2">
                <ImageUploader onImageUploaded={(url) => insertImageToEditor(textoQuillRef, url)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFieldFormatting('texto_principal')}
                  className="h-8 text-xs"
                >
                  <Eraser className="h-3 w-3 mr-1" />
                  Limpar Formatação
                </Button>
              </div>
            </div>
            <ReactQuill
              key={`texto-${oduId || 'new'}`}
              ref={textoQuillRef}
              theme="snow"
              className="min-h-[200px] border border-input rounded-md"
              value={formData.texto_principal || ''}
              onChange={(value) => {
                const sanitized = sanitizeQuillHtml(value);
                setFormData({ ...formData, texto_principal: sanitized });
              }}
              modules={{
                toolbar: [
                  ['bold', 'italic', 'underline'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  ['clean'],
                ],
                clipboard: {
                  matchVisual: false
                },
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="verso">Verso Completo</Label>
              <div className="flex items-center gap-2">
                <ImageUploader onImageUploaded={(url) => insertImageToEditor(versoQuillRef, url)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFieldFormatting('verso')}
                  className="h-8 text-xs"
                >
                  <Eraser className="h-3 w-3 mr-1" />
                  Limpar Formatação
                </Button>
              </div>
            </div>
            <ReactQuill
              key={`verso-${oduId || 'new'}`}
              ref={versoQuillRef}
              theme="snow"
              className="min-h-[200px] border border-input rounded-md"
              value={formData.verso || ''}
              onChange={(value) => {
                const sanitized = sanitizeQuillHtml(value);
                setFormData({ ...formData, verso: sanitized });
              }}
              modules={{
                toolbar: [
                  ['bold', 'italic', 'underline'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  ['clean'],
                ],
                clipboard: {
                  matchVisual: false
                },
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verso_resumido">
              Verso Resumido (para Quiz e Memorização) *
              <span className="text-xs text-muted-foreground ml-2">
                {formData.verso_resumido.length}/1000 caracteres
              </span>
            </Label>
            <Textarea
              id="verso_resumido"
              value={formData.verso_resumido}
              onChange={(e) => setFormData({ ...formData, verso_resumido: e.target.value })}
              placeholder='Ex: "A luz purifica o que estava sujo"'
              maxLength={1000}
              rows={4}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              💡 Verso memorável usado em flashcards e quizzes (10-1000 caracteres)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="significado">Significado</Label>
              <div className="flex items-center gap-2">
                <ImageUploader onImageUploaded={(url) => insertImageToEditor(significadoQuillRef, url)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFieldFormatting('significado')}
                  className="h-8 text-xs"
                >
                  <Eraser className="h-3 w-3 mr-1" />
                  Limpar Formatação
                </Button>
              </div>
            </div>
            <ReactQuill
              key={`significado-${oduId || 'new'}`}
              ref={significadoQuillRef}
              theme="snow"
              className="min-h-[150px] border border-input rounded-md"
              value={formData.significado || ''}
              onChange={(value) => {
                const sanitized = sanitizeQuillHtml(value);
                setFormData({ ...formData, significado: sanitized });
              }}
              modules={{
                toolbar: [
                  ['bold', 'italic', 'underline'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  ['clean'],
                ],
                clipboard: {
                  matchVisual: false,
                },
              }}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="exemplos_praticos">Exemplos Práticos</Label>
              <div className="flex items-center gap-2">
                <ImageUploader onImageUploaded={(url) => insertImageToEditor(exemplosQuillRef, url)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFieldFormatting('exemplos_praticos')}
                  className="h-8 text-xs"
                >
                  <Eraser className="h-3 w-3 mr-1" />
                  Limpar Formatação
                </Button>
              </div>
            </div>
            <ReactQuill
              key={`exemplos-${oduId || 'new'}`}
              ref={exemplosQuillRef}
              theme="snow"
              className="min-h-[150px] border border-input rounded-md"
              value={formData.exemplos_praticos || ''}
              onChange={(value) => {
                const sanitized = sanitizeQuillHtml(value);
                setFormData({ ...formData, exemplos_praticos: sanitized });
              }}
              modules={{
                toolbar: [
                  ['bold', 'italic', 'underline'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  ['clean'],
                ],
                clipboard: {
                  matchVisual: false,
                },
              }}
            />
            <p className="text-xs text-muted-foreground">
              Situações reais onde este Odu se aplica, conselhos práticos, etc.
            </p>
          </div>

          <Separator />

          {/* Campos Narrativos */}
          <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              📖 Elementos Narrativos
              <span className="text-xs text-muted-foreground font-normal">(Novo - Foco em História)</span>
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="contexto_historico">Contexto Histórico</Label>
                <div className="flex items-center gap-2">
                  <ImageUploader onImageUploaded={(url) => insertImageToEditor(contextoQuillRef, url)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFieldFormatting('contexto_historico')}
                    className="h-8 text-xs"
                  >
                    <Eraser className="h-3 w-3 mr-1" />
                    Limpar Formatação
                  </Button>
                </div>
              </div>
              <ReactQuill
                key={`contexto-${oduId || 'new'}`}
                ref={contextoQuillRef}
                theme="snow"
                className="min-h-[150px] border border-input rounded-md"
                value={formData.contexto_historico || ''}
                onChange={(value) => {
                  const sanitized = sanitizeQuillHtml(value);
                  setFormData({ ...formData, contexto_historico: sanitized });
                }}
                modules={{
                  toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['clean'],
                  ],
                  clipboard: {
                    matchVisual: false,
                  },
                }}
              />
              <p className="text-xs text-muted-foreground">
                Ex: "Durante a criação do mundo, quando os Orixás ainda caminhavam entre os homens..."
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personagens">Personagens</Label>
              <Input
                id="personagens"
                value={formData.personagens}
                onChange={(e) => setFormData({ ...formData, personagens: e.target.value })}
                placeholder="Ex: Orunmilá, Exu, guerreiro jovem"
              />
              <p className="text-xs text-muted-foreground">
                Liste os personagens principais separados por vírgula
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tema_principal">Tema Principal</Label>
                <select
                  id="tema_principal"
                  value={formData.tema_principal}
                  onChange={(e) => setFormData({ ...formData, tema_principal: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Selecione o tema</option>
                  <option value="sabedoria">Sabedoria</option>
                  <option value="guerra">Guerra</option>
                  <option value="amor">Amor</option>
                  <option value="sacrificio">Sacrifício</option>
                  <option value="transformacao">Transformação</option>
                  <option value="justica">Justiça</option>
                  <option value="prosperidade">Prosperidade</option>
                  <option value="familia">Família</option>
                  <option value="destino">Destino</option>
                  <option value="traicao">Traição</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tema_secundario">Tema Secundário (opcional)</Label>
                <select
                  id="tema_secundario"
                  value={formData.tema_secundario}
                  onChange={(e) => setFormData({ ...formData, tema_secundario: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Selecione o tema</option>
                  <option value="sabedoria">Sabedoria</option>
                  <option value="guerra">Guerra</option>
                  <option value="amor">Amor</option>
                  <option value="sacrificio">Sacrifício</option>
                  <option value="transformacao">Transformação</option>
                  <option value="justica">Justiça</option>
                  <option value="prosperidade">Prosperidade</option>
                  <option value="familia">Família</option>
                  <option value="destino">Destino</option>
                  <option value="traicao">Traição</option>
                </select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3 flex-wrap">
            <Button type="submit" disabled={loading} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Odu'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            
            {/* Test Button - Only in Debug Mode */}
            {debugMode && oduId && oduId !== 'new' && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const { data, error } = await supabase
                    .from('odu')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', oduId)
                    .select();
                  
                  console.log('🧪 TESTE DIRETO:', { data, error, oduId });
                  
                  if (error) {
                    toast.error('Teste falhou: ' + error.message);
                  } else if (data && data.length > 0) {
                    toast.success('Teste bem-sucedido! UPDATE funciona.');
                  } else {
                    toast.warning('Teste executado mas nenhum registro atualizado.');
                  }
                }}
              >
                🧪 Testar UPDATE Direto
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
