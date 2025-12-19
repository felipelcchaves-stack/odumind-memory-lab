import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Download, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Papa from 'papaparse';

interface PathContentBulkUploadProps {
  onSuccess: () => void;
}

interface LearningPath {
  id: string;
  nome: string;
  slug: string;
}

export default function PathContentBulkUpload({ onSuccess }: PathContentBulkUploadProps) {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string>('');
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState(true);

  useEffect(() => {
    loadPaths();
  }, []);

  async function loadPaths() {
    try {
      const { data, error } = await supabase
        .from('learning_paths')
        .select('id, nome, slug')
        .order('ordem', { ascending: true });

      if (error) throw error;
      setPaths(data || []);
    } catch (error) {
      console.error('Error loading paths:', error);
      toast.error('Erro ao carregar caminhos');
    } finally {
      setLoadingPaths(false);
    }
  }

  function downloadTemplate() {
    const template = `numero,nome,texto_principal,verso,verso_resumido,significado,contexto_historico,exemplos_praticos,materiais_necessarios,tempo_execucao,dificuldade,tags
1,Nome do Conteúdo,Texto principal do conteúdo aqui,Verso completo,Verso resumido,Significado do conteúdo,Contexto histórico,Exemplos práticos,"material1, material2",30,iniciante,"tag1, tag2"
2,Outro Conteúdo,Outro texto principal,Outro verso,Outro verso resumido,Outro significado,Outro contexto,Outros exemplos,"material3, material4",45,intermediario,"tag3, tag4"`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_conteudos_caminho.csv';
    link.click();
  }

  async function handleUpload() {
    if (!selectedPathId) {
      toast.error('Selecione um caminho');
      return;
    }

    if (!csvData.trim()) {
      toast.error('Cole os dados CSV');
      return;
    }

    setLoading(true);
    try {
      const result = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      if (result.errors.length > 0) {
        toast.error('Erro ao processar CSV: ' + result.errors[0].message);
        return;
      }

      const rows = result.data as any[];
      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        try {
          const payload = {
            path_id: selectedPathId,
            numero: row.numero ? parseInt(row.numero) : null,
            nome: row.nome,
            texto_principal: row.texto_principal,
            verso: row.verso || null,
            verso_resumido: row.verso_resumido || null,
            significado: row.significado || null,
            contexto_historico: row.contexto_historico || null,
            exemplos_praticos: row.exemplos_praticos || null,
            materiais_necessarios: row.materiais_necessarios 
              ? row.materiais_necessarios.split(',').map((s: string) => s.trim()).filter(Boolean)
              : null,
            tempo_execucao: row.tempo_execucao ? parseInt(row.tempo_execucao) : null,
            dificuldade: row.dificuldade || 'iniciante',
            tags: row.tags 
              ? row.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
              : null,
            ordem: successCount + 1,
            ativo: true,
          };

          if (!payload.nome || !payload.texto_principal) {
            errorCount++;
            continue;
          }

          const { error } = await supabase
            .from('path_content')
            .insert([payload]);

          if (error) {
            console.error('Error inserting row:', error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (e) {
          console.error('Error processing row:', e);
          errorCount++;
        }
      }

      // Update total_conteudos
      const { count } = await supabase
        .from('path_content')
        .select('*', { count: 'exact', head: true })
        .eq('path_id', selectedPathId);

      await supabase
        .from('learning_paths')
        .update({ total_conteudos: count || 0 })
        .eq('id', selectedPathId);

      if (successCount > 0) {
        toast.success(`${successCount} conteúdos importados com sucesso`);
        setCsvData('');
        onSuccess();
      }

      if (errorCount > 0) {
        toast.warning(`${errorCount} conteúdos não puderam ser importados`);
      }
    } catch (error: any) {
      console.error('Error uploading:', error);
      toast.error(error.message || 'Erro ao importar conteúdos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Upload em Massa de Conteúdos</h3>
        <p className="text-sm text-muted-foreground">
          Importe múltiplos conteúdos de uma vez usando um arquivo CSV.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Selecione o Caminho</Label>
          <Select value={selectedPathId} onValueChange={setSelectedPathId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingPaths ? "Carregando..." : "Selecione um caminho"} />
            </SelectTrigger>
            <SelectContent>
              {paths.map((path) => (
                <SelectItem key={path.id} value={path.id}>
                  {path.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Baixar Template CSV
        </Button>

        <div className="space-y-2">
          <Label htmlFor="csvData">Dados CSV</Label>
          <Textarea
            id="csvData"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="Cole aqui os dados do CSV (incluindo cabeçalho)..."
            rows={10}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Colunas obrigatórias: nome, texto_principal
          </p>
        </div>

        <Button onClick={handleUpload} disabled={loading || !selectedPathId}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Importar Conteúdos
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
