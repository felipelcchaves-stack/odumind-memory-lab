import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit, Save, X, Loader2, Trash2, ClipboardList } from "lucide-react";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { usePasteHandler } from "@/hooks/usePasteHandler";
import { usePersonalNotes } from "@/hooks/usePersonalNotes";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PersonalNotesProps {
  odu: {
    id: string;
    nome: string;
    numero: number;
  };
}

export function PersonalNotes({ odu }: PersonalNotesProps) {
  const { note, loading, isSaving, lastSaved, saveNote, deleteNote } = usePersonalNotes(odu.id);
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState("");

  const MAX_CHARS = 10000;
  const charCount = localContent.length;
  const isNearLimit = charCount > MAX_CHARS * 0.95;

  // Sincronizar conteúdo local com a nota carregada
  useEffect(() => {
    if (note !== null) {
      setLocalContent(note);
    }
  }, [note]);

  // Auto-save enquanto edita
  useEffect(() => {
    if (isEditing && localContent !== note) {
      saveNote(localContent);
    }
  }, [localContent, isEditing, note, saveNote]);

  // Handler de colagem com conversão HTML → Markdown
  const { handlePaste } = usePasteHandler({
    onPaste: (text) => {
      const currentLength = localContent.length;
      const availableSpace = MAX_CHARS - currentLength;
      const textToInsert = text.substring(0, availableSpace);
      setLocalContent(localContent + textToInsert);
    },
    maxLength: MAX_CHARS,
  });

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setLocalContent(note || "");
    setIsEditing(false);
  };

  const handleSaveAndClose = () => {
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteNote();
    setLocalContent("");
    setIsEditing(false);
  };

  if (loading) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado vazio (primeira vez)
  if (!note && !isEditing) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>Minha Nota Pessoal</span>
            </div>
            <Button size="sm" onClick={handleStartEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Criar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-2">Crie seu resumo pessoal deste Odu.</p>
            <p className="text-sm">Use suas próprias palavras para consolidar o aprendizado.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado de visualização (com conteúdo)
  if (!isEditing) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>Minha Nota Pessoal</span>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir nota?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Sua nota pessoal será permanentemente excluída.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" onClick={handleStartEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MarkdownViewer content={note} />
          {lastSaved && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span>✏️</span>
              <span>
                Editado {formatDistanceToNow(lastSaved, { locale: ptBR, addSuffix: true })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Estado de edição
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>Minha Nota Pessoal</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveAndClose}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ClipboardList className="h-3 w-3" />
            <span>Cole do Google Docs, Word ou Notion - a formatação será preservada</span>
          </div>
          <Textarea
            value={localContent}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setLocalContent(e.target.value);
              }
            }}
            onPaste={handlePaste}
            placeholder="Escreva suas anotações, resumos e insights sobre este Odu...&#10;&#10;Suporta: **negrito**, *itálico*, listas, links"
            className="min-h-[200px] resize-y font-mono text-sm"
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Badge variant={isNearLimit ? "destructive" : "secondary"}>
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} caracteres
            </Badge>
            {isSaving && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando...
              </span>
            )}
            {!isSaving && lastSaved && (
              <span className="text-muted-foreground">
                ✅ Salvo {formatDistanceToNow(lastSaved, { locale: ptBR, addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
