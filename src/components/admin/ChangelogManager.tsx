import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Eye, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import ChangelogModal from "@/components/ChangelogModal";

interface ChangelogItem {
  tipo: "novo" | "melhoria" | "correcao";
  titulo: string;
  descricao: string;
  icone?: string;
}

interface ChangelogVersion {
  id?: string;
  version: string;
  titulo: string;
  release_date: string;
  items: ChangelogItem[];
  destaque: boolean;
}

export default function ChangelogManager() {
  const [changelogs, setChangelogs] = useState<ChangelogVersion[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewChangelog, setPreviewChangelog] = useState<ChangelogVersion | null>(null);

  const [formData, setFormData] = useState<ChangelogVersion>({
    version: "",
    titulo: "",
    release_date: new Date().toISOString().split("T")[0],
    items: [],
    destaque: false,
  });

  const [currentItem, setCurrentItem] = useState<ChangelogItem>({
    tipo: "novo",
    titulo: "",
    descricao: "",
    icone: "",
  });

  useEffect(() => {
    loadChangelogs();
  }, []);

  const loadChangelogs = async () => {
    try {
      const { data, error } = await supabase
        .from("changelog")
        .select("*")
        .order("release_date", { ascending: false });

      if (error) throw error;
      setChangelogs(data.map(item => ({
        ...item,
        items: item.items as unknown as ChangelogItem[]
      })) as ChangelogVersion[]);
    } catch (error) {
      console.error("Error loading changelogs:", error);
      toast.error("Erro ao carregar changelogs");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.titulo || !currentItem.descricao) {
      toast.error("Preencha título e descrição do item");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, currentItem],
    }));

    setCurrentItem({
      tipo: "novo",
      titulo: "",
      descricao: "",
      icone: "",
    });

    toast.success("Item adicionado!");
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    toast.success("Item removido!");
  };

  const handleSave = async () => {
    if (!formData.version || !formData.titulo || formData.items.length === 0) {
      toast.error("Preencha versão, título e adicione pelo menos um item");
      return;
    }

    try {
      const { error } = await supabase.from("changelog").insert({
        version: formData.version,
        titulo: formData.titulo,
        release_date: formData.release_date,
        items: formData.items as any,
        destaque: formData.destaque,
      });

      if (error) throw error;

      toast.success("Changelog criado com sucesso!");
      setIsCreating(false);
      setFormData({
        version: "",
        titulo: "",
        release_date: new Date().toISOString().split("T")[0],
        items: [],
        destaque: false,
      });
      loadChangelogs();
    } catch (error: any) {
      console.error("Error saving changelog:", error);
      toast.error(error.message || "Erro ao salvar changelog");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("changelog").delete().eq("id", deleteId);

      if (error) throw error;

      toast.success("Changelog excluído com sucesso!");
      setDeleteId(null);
      loadChangelogs();
    } catch (error) {
      console.error("Error deleting changelog:", error);
      toast.error("Erro ao excluir changelog");
    }
  };

  const getTypeEmoji = (tipo: string) => {
    switch (tipo) {
      case "novo":
        return "✨";
      case "melhoria":
        return "🚀";
      case "correcao":
        return "🔧";
      default:
        return "📝";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Changelogs</h2>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie as atualizações do sistema
          </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Changelog
        </Button>
      </div>

      {isCreating && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Criar Novo Changelog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Versão</Label>
                <Input
                  id="version"
                  placeholder="v1.2.0"
                  value={formData.version}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, version: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="release_date">Data de Lançamento</Label>
                <Input
                  id="release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, release_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                placeholder="🎉 Melhorias no Sistema de Memorização"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, titulo: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="destaque">Marcar como Destaque</Label>
              <Switch
                id="destaque"
                checked={formData.destaque}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, destaque: checked }))
                }
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold">Adicionar Item</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={currentItem.tipo}
                    onValueChange={(value: any) =>
                      setCurrentItem((prev) => ({ ...prev, tipo: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="novo">✨ Novo</SelectItem>
                      <SelectItem value="melhoria">🚀 Melhoria</SelectItem>
                      <SelectItem value="correcao">🔧 Correção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ícone (emoji)</Label>
                  <Input
                    placeholder="🎴"
                    value={currentItem.icone}
                    onChange={(e) =>
                      setCurrentItem((prev) => ({ ...prev, icone: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título do Item</Label>
                <Input
                  placeholder="Sistema de Flashcards Aleatórios"
                  value={currentItem.titulo}
                  onChange={(e) =>
                    setCurrentItem((prev) => ({ ...prev, titulo: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Os cards agora aparecem em ordem aleatória..."
                  value={currentItem.descricao}
                  onChange={(e) =>
                    setCurrentItem((prev) => ({ ...prev, descricao: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <Button onClick={handleAddItem} variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Item
              </Button>
            </div>

            {formData.items.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold">Itens Adicionados ({formData.items.length})</h3>
                  {formData.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted border"
                    >
                      <div className="text-2xl">{item.icone || getTypeEmoji(item.tipo)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={item.tipo === "novo" ? "default" : "secondary"}>
                            {getTypeEmoji(item.tipo)} {item.tipo}
                          </Badge>
                          <span className="font-semibold">{item.titulo}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.descricao}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                Salvar Changelog
              </Button>
              <Button
                variant="outline"
                onClick={() => setPreviewChangelog({ ...formData, id: "preview" })}
                className="gap-2"
                disabled={formData.items.length === 0}
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setFormData({
                    version: "",
                    titulo: "",
                    release_date: new Date().toISOString().split("T")[0],
                    items: [],
                    destaque: false,
                  });
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <p>Carregando...</p>
        ) : changelogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum changelog encontrado</p>
            </CardContent>
          </Card>
        ) : (
          changelogs.map((changelog) => (
            <Card key={changelog.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      {changelog.titulo}
                      {changelog.destaque && (
                        <Badge variant="default" className="animate-pulse">
                          Destaque
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(changelog.release_date).toLocaleDateString("pt-BR")}
                      </span>
                      <Badge variant="outline">{changelog.version}</Badge>
                      <span>{changelog.items.length} itens</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
              onClick={() => setPreviewChangelog(changelog as any)}
              className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(changelog.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este changelog? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {previewChangelog && (
        <ChangelogModal
          open={!!previewChangelog}
          onClose={() => setPreviewChangelog(null)}
          changelog={previewChangelog as any}
          onMarkAsViewed={() => setPreviewChangelog(null)}
        />
      )}
    </div>
  );
}
