import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface RitualBulkUploadProps {
  onSuccess: () => void;
}

export default function RitualBulkUpload({ onSuccess }: RitualBulkUploadProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }

    setLoading(true);

    try {
      const fileType = file.name.split('.').pop()?.toLowerCase();

      if (fileType === 'csv') {
        await handleCSVUpload(file);
      } else if (fileType === 'json') {
        await handleJSONUpload(file);
      } else {
        throw new Error('Formato de arquivo não suportado. Use CSV ou JSON.');
      }

      toast.success('Upload concluído com sucesso!');
      onSuccess();
      setFile(null);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Erro ao fazer upload');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = (file: File) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          try {
            const rituais = results.data
              .filter((row: any) => row.nome)
              .map((row: any) => ({
                content_type_id: row.content_type_id || null,
                numero: row.numero ? parseInt(row.numero) : null,
                nome: row.nome,
                texto_principal: row.texto_principal || '',
                verso_resumido: row.verso_resumido || null,
                dificuldade: row.dificuldade || null,
                tempo_execucao: row.tempo_execucao ? parseInt(row.tempo_execucao) : null,
                materiais_necessarios: row.materiais_necessarios 
                  ? row.materiais_necessarios.split(',').map((m: string) => m.trim()) 
                  : null,
                odu_relacionados: row.odu_relacionados 
                  ? row.odu_relacionados.split(',').map((o: string) => o.trim()) 
                  : null,
                tags: row.tags 
                  ? row.tags.split(',').map((t: string) => t.trim()) 
                  : null,
                exemplos_praticos: row.exemplos_praticos || null,
                contexto_historico: row.contexto_historico || null,
                audio_url: row.audio_url || null,
              }));

            if (rituais.length === 0) {
              throw new Error('Nenhum conteúdo válido encontrado no arquivo');
            }

            const { error } = await supabase.from('ritual_content').insert(rituais);
            if (error) throw error;

            resolve(rituais.length);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  };

  const handleJSONUpload = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);

    const rituais = (Array.isArray(data) ? data : [data])
      .filter((row: any) => row.nome)
      .map((row: any) => ({
        content_type_id: row.content_type_id || null,
        numero: row.numero ? parseInt(row.numero) : null,
        nome: row.nome,
        texto_principal: row.texto_principal || '',
        verso_resumido: row.verso_resumido || null,
        dificuldade: row.dificuldade || null,
        tempo_execucao: row.tempo_execucao ? parseInt(row.tempo_execucao) : null,
        materiais_necessarios: Array.isArray(row.materiais_necessarios) 
          ? row.materiais_necessarios 
          : null,
        odu_relacionados: Array.isArray(row.odu_relacionados) 
          ? row.odu_relacionados 
          : null,
        tags: Array.isArray(row.tags) ? row.tags : null,
        exemplos_praticos: row.exemplos_praticos || null,
        contexto_historico: row.contexto_historico || null,
        audio_url: row.audio_url || null,
      }));

    if (rituais.length === 0) {
      throw new Error('Nenhum conteúdo válido encontrado no arquivo');
    }

    const { error } = await supabase.from('ritual_content').insert(rituais);
    if (error) throw error;

    return rituais.length;
  };

  const downloadTemplate = () => {
    const template = [
      {
        content_type_id: 'uuid-do-tipo-de-conteudo',
        numero: 1,
        nome: 'Exemplo de Ritual',
        texto_principal: 'Descrição completa do ritual',
        verso_resumido: 'Verso curto memorável',
        dificuldade: 'iniciante',
        tempo_execucao: 30,
        materiais_necessarios: 'vela branca,mel,água',
        odu_relacionados: '',
        tags: 'proteção,limpeza',
        exemplos_praticos: 'Quando usar este ritual',
        contexto_historico: 'História e origem',
        audio_url: '',
      },
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_rituais.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Formato do Arquivo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            O arquivo deve conter as seguintes colunas (CSV) ou campos (JSON):
          </p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            <li><strong>nome</strong>: Nome do conteúdo *</li>
            <li><strong>content_type_id</strong>: UUID do tipo de conteúdo</li>
            <li><strong>numero</strong>: Número (opcional)</li>
            <li><strong>texto_principal</strong>: Descrição completa *</li>
            <li><strong>verso_resumido</strong>: Verso curto</li>
            <li><strong>dificuldade</strong>: iniciante, intermediario ou avancado</li>
            <li><strong>tempo_execucao</strong>: Tempo em minutos</li>
            <li><strong>materiais_necessarios</strong>: Lista separada por vírgula</li>
            <li><strong>tags</strong>: Tags separadas por vírgula</li>
            <li><strong>exemplos_praticos</strong>: Exemplos de uso</li>
            <li><strong>contexto_historico</strong>: História e contexto</li>
            <li><strong>audio_url</strong>: URL do áudio (para rezas)</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">* Campos obrigatórios</p>
        </div>

        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Baixar Template CSV
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="file-upload">Selecionar Arquivo</Label>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex-1">
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {file.name}
              </div>
            )}
          </div>
        </div>

        <Button onClick={handleUpload} disabled={!file || loading} className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          {loading ? 'Fazendo Upload...' : 'Fazer Upload'}
        </Button>
      </div>

      <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Atenção:</strong> O upload em massa irá adicionar os conteúdos ao banco de dados.
          Certifique-se de que os dados estão corretos para evitar erros.
        </p>
      </div>
    </div>
  );
}
