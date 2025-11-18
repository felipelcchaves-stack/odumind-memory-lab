import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface BulkUploadProps {
  onSuccess: () => void;
}

export default function BulkUpload({ onSuccess }: BulkUploadProps) {
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
            const odus = results.data
              .filter((row: any) => row.numero && row.nome)
              .map((row: any) => ({
                numero: parseInt(row.numero),
                nome: row.nome,
                texto_principal: row.texto_principal || '',
                verso: row.verso || null,
                verso_resumido: row.verso_resumido || null,
                significado: row.significado || null,
                exemplos_praticos: row.exemplos_praticos || null,
                tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : null,
              }));

            if (odus.length === 0) {
              throw new Error('Nenhum Odu válido encontrado no arquivo');
            }

            const { error } = await supabase.from('odu').insert(odus);
            if (error) throw error;

            resolve(odus.length);
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

    const odus = (Array.isArray(data) ? data : [data])
      .filter((row: any) => row.numero && row.nome)
      .map((row: any) => ({
        numero: parseInt(row.numero),
        nome: row.nome,
        texto_principal: row.texto_principal || '',
        verso: row.verso || null,
        verso_resumido: row.verso_resumido || null,
        significado: row.significado || null,
        exemplos_praticos: row.exemplos_praticos || null,
        tags: Array.isArray(row.tags) ? row.tags : null,
      }));

    if (odus.length === 0) {
      throw new Error('Nenhum Odu válido encontrado no arquivo');
    }

    const { error } = await supabase.from('odu').insert(odus);
    if (error) throw error;

    return odus.length;
  };

  const downloadTemplate = () => {
    const template = [
      {
        numero: 1,
        nome: 'Exemplo Odu',
        texto_principal: 'Texto principal do Odu',
        verso: 'Verso do Odu (opcional)',
        significado: 'Significado do Odu (opcional)',
        exemplos_praticos: 'Exemplos práticos (opcional)',
        tags: 'tag1,tag2,tag3',
      },
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_odu.csv';
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
            <li>
              <strong>numero</strong>: Número do Odu (1-256) *
            </li>
            <li>
              <strong>nome</strong>: Nome do Odu *
            </li>
            <li>
              <strong>texto_principal</strong>: Texto principal *
            </li>
            <li>
              <strong>verso</strong>: Verso (opcional)
            </li>
            <li>
              <strong>significado</strong>: Significado (opcional)
            </li>
            <li>
              <strong>exemplos_praticos</strong>: Exemplos práticos (opcional)
            </li>
            <li>
              <strong>tags</strong>: Tags separadas por vírgula (opcional)
            </li>
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
          <strong>Atenção:</strong> O upload em massa irá adicionar os Odu ao banco de dados.
          Certifique-se de que os números não estão duplicados para evitar erros.
        </p>
      </div>
    </div>
  );
}
