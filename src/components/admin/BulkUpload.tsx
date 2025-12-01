import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface BulkUploadProps {
  onSuccess: () => void;
}

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function BulkUpload({ onSuccess }: BulkUploadProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const checkPermissions = async (): Promise<boolean> => {
    if (!user) {
      toast.error('Você precisa estar logado para fazer upload');
      return false;
    }

    const { data: hasRole, error } = await supabase
      .rpc('has_colaborador_role', { _user_id: user.id });
    
    if (error) {
      console.error('Erro ao verificar permissões:', error);
      toast.error('Erro ao verificar permissões');
      return false;
    }

    if (!hasRole) {
      toast.error('Você não tem permissão para adicionar Odu. Faça login como admin ou colaborador.');
      return false;
    }

    return true;
  };

  const validateOduData = (row: any, index: number): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const rowNum = index + 1;

    // Check numero
    const numero = parseInt(row.numero);
    if (isNaN(numero) || numero < 1 || numero > 256) {
      errors.push(`Linha ${rowNum}: Número inválido (${row.numero}). Deve ser entre 1 e 256.`);
    }

    // Check nome
    if (!row.nome || row.nome.trim().length === 0) {
      errors.push(`Linha ${rowNum}: Nome é obrigatório.`);
    }

    // Check texto_principal
    if (!row.texto_principal || row.texto_principal.trim().length < 10) {
      errors.push(`Linha ${rowNum}: Texto principal é obrigatório e deve ter pelo menos 10 caracteres.`);
    }

    return { valid: errors.length === 0, errors };
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }

    // Check permissions first
    const hasPermission = await checkPermissions();
    if (!hasPermission) return;

    setLoading(true);
    setResult(null);

    try {
      const fileType = file.name.split('.').pop()?.toLowerCase();

      let uploadResult: UploadResult;
      if (fileType === 'csv') {
        uploadResult = await handleCSVUpload(file);
      } else if (fileType === 'json') {
        uploadResult = await handleJSONUpload(file);
      } else {
        throw new Error('Formato de arquivo não suportado. Use CSV ou JSON.');
      }

      setResult(uploadResult);

      if (uploadResult.success > 0) {
        toast.success(`${uploadResult.success} Odu(s) adicionado(s) com sucesso!`);
        if (uploadResult.failed === 0) {
          onSuccess();
          setFile(null);
        }
      }

      if (uploadResult.failed > 0) {
        toast.error(`${uploadResult.failed} Odu(s) falharam. Veja os detalhes abaixo.`);
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      
      // Handle specific RLS errors
      if (error?.code === '42501' || error?.message?.includes('policy')) {
        toast.error('Sem permissão. Verifique se você está logado como admin ou colaborador.');
      } else if (error?.code === '23505') {
        toast.error('Erro: Número de Odu duplicado. Verifique se os números já existem no banco.');
      } else {
        toast.error(error.message || 'Erro ao fazer upload');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = (file: File): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const uploadResult: UploadResult = { success: 0, failed: 0, errors: [] };
            
            // Validate all rows first
            const validOdus: any[] = [];
            results.data.forEach((row: any, index: number) => {
              // Skip completely empty rows
              if (!row.numero && !row.nome) return;
              
              const validation = validateOduData(row, index);
              if (!validation.valid) {
                uploadResult.failed++;
                uploadResult.errors.push(...validation.errors);
                return;
              }

              validOdus.push({
                numero: parseInt(row.numero),
                nome: row.nome.trim(),
                texto_principal: row.texto_principal.trim(),
                verso: row.verso?.trim() || null,
                verso_resumido: row.verso_resumido?.trim() || null,
                significado: row.significado?.trim() || null,
                exemplos_praticos: row.exemplos_praticos?.trim() || null,
                contexto_historico: row.contexto_historico?.trim() || null,
                tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
              });
            });

            if (validOdus.length === 0) {
              if (uploadResult.errors.length > 0) {
                resolve(uploadResult);
                return;
              }
              throw new Error('Nenhum Odu válido encontrado no arquivo');
            }

            // Insert valid Odus one by one to get better error handling
            for (const odu of validOdus) {
              const { data, error } = await supabase
                .from('odu')
                .insert([odu])
                .select();

              if (error) {
                uploadResult.failed++;
                if (error.code === '23505') {
                  uploadResult.errors.push(`Odu #${odu.numero} (${odu.nome}): Número já existe no banco.`);
                } else if (error.code === '42501') {
                  uploadResult.errors.push(`Odu #${odu.numero} (${odu.nome}): Sem permissão (RLS).`);
                } else {
                  uploadResult.errors.push(`Odu #${odu.numero} (${odu.nome}): ${error.message}`);
                }
                console.error(`Erro ao inserir Odu #${odu.numero}:`, error);
              } else if (data && data.length > 0) {
                uploadResult.success++;
                console.log(`✅ Odu #${odu.numero} inserido com sucesso:`, data[0].id);
              } else {
                uploadResult.failed++;
                uploadResult.errors.push(`Odu #${odu.numero} (${odu.nome}): Inserção não confirmada.`);
              }
            }

            resolve(uploadResult);
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

  const handleJSONUpload = async (file: File): Promise<UploadResult> => {
    const text = await file.text();
    const data = JSON.parse(text);
    const uploadResult: UploadResult = { success: 0, failed: 0, errors: [] };

    const rows = Array.isArray(data) ? data : [data];

    // Validate all rows first
    const validOdus: any[] = [];
    rows.forEach((row: any, index: number) => {
      // Skip completely empty rows
      if (!row.numero && !row.nome) return;
      
      const validation = validateOduData(row, index);
      if (!validation.valid) {
        uploadResult.failed++;
        uploadResult.errors.push(...validation.errors);
        return;
      }

      validOdus.push({
        numero: parseInt(row.numero),
        nome: row.nome.trim(),
        texto_principal: row.texto_principal.trim(),
        verso: row.verso?.trim() || null,
        verso_resumido: row.verso_resumido?.trim() || null,
        significado: row.significado?.trim() || null,
        exemplos_praticos: row.exemplos_praticos?.trim() || null,
        contexto_historico: row.contexto_historico?.trim() || null,
        tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : null,
      });
    });

    if (validOdus.length === 0 && uploadResult.errors.length === 0) {
      throw new Error('Nenhum Odu válido encontrado no arquivo');
    }

    // Insert valid Odus one by one
    for (const odu of validOdus) {
      const { data, error } = await supabase
        .from('odu')
        .insert([odu])
        .select();

      if (error) {
        uploadResult.failed++;
        if (error.code === '23505') {
          uploadResult.errors.push(`Odu #${odu.numero} (${odu.nome}): Número já existe no banco.`);
        } else if (error.code === '42501') {
          uploadResult.errors.push(`Odu #${odu.numero} (${odu.nome}): Sem permissão (RLS).`);
        } else {
          uploadResult.errors.push(`Odu #${odu.numero} (${odu.nome}): ${error.message}`);
        }
        console.error(`Erro ao inserir Odu #${odu.numero}:`, error);
      } else if (data && data.length > 0) {
        uploadResult.success++;
        console.log(`✅ Odu #${odu.numero} inserido com sucesso:`, data[0].id);
      } else {
        uploadResult.failed++;
        uploadResult.errors.push(`Odu #${odu.numero} (${odu.nome}): Inserção não confirmada.`);
      }
    }

    return uploadResult;
  };

  const downloadTemplate = () => {
    const template = [
      {
        numero: 1,
        nome: 'Nome do Odu',
        texto_principal: 'Texto principal do Odu (obrigatório, mínimo 10 caracteres)',
        verso: 'Verso do Odu (opcional)',
        verso_resumido: 'Verso resumido para flashcards (opcional)',
        significado: 'Significado do Odu (opcional)',
        exemplos_praticos: 'Exemplos práticos (opcional)',
        contexto_historico: 'Contexto histórico (opcional)',
        tags: 'tag1,tag2,tag3',
      },
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
              <strong>texto_principal</strong>: Texto principal (mín. 10 caracteres) *
            </li>
            <li>
              <strong>verso</strong>: Verso (opcional)
            </li>
            <li>
              <strong>verso_resumido</strong>: Verso resumido para flashcards (opcional)
            </li>
            <li>
              <strong>significado</strong>: Significado (opcional)
            </li>
            <li>
              <strong>exemplos_praticos</strong>: Exemplos práticos (opcional)
            </li>
            <li>
              <strong>contexto_historico</strong>: Contexto histórico (opcional)
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

      {/* Results Display */}
      {result && (
        <div className="space-y-3">
          {result.success > 0 && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {result.success} Odu(s) adicionado(s) com sucesso!
              </AlertDescription>
            </Alert>
          )}
          
          {result.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">{result.failed} erro(s) encontrado(s):</p>
                <ul className="list-disc list-inside text-sm space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Atenção:</strong> O upload em massa irá adicionar os Odu ao banco de dados.
          Certifique-se de que os números não estão duplicados para evitar erros.
          Cada Odu é inserido individualmente para melhor controle de erros.
        </p>
      </div>
    </div>
  );
}
