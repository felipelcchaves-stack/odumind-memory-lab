import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Brain, Star, StarOff, Trash2, Plus, Sparkles, Loader2 } from "lucide-react";

interface Mnemonic {
  id: string;
  tipo: string;
  conteudo: string;
  is_ai_generated: boolean;
  is_favorite: boolean;
}

interface Odu {
  id: string;
  nome: string;
  numero: number;
  significado: string;
  verso: string;
}

interface MnemonicsSectionProps {
  odu: Odu;
}

const tipoLabels: Record<string, string> = {
  acronimo: "Acrônimo",
  frase: "Frase Mnemônica",
  rima: "Rima",
  associacao: "Associação",
  imagem: "Imagem Mental"
};

const tipoColors: Record<string, string> = {
  acronimo: "bg-blue-500",
  frase: "bg-purple-500",
  rima: "bg-pink-500",
  associacao: "bg-green-500",
  imagem: "bg-orange-500"
};

export const MnemonicsSection = ({ odu }: MnemonicsSectionProps) => {
  const { user } = useAuth();
  const [mnemonics, setMnemonics] = useState<Mnemonic[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newMnemonic, setNewMnemonic] = useState({ tipo: "frase", conteudo: "" });

  useEffect(() => {
    if (user && odu.id) {
      fetchMnemonics();
    }
  }, [user, odu.id]);

  const fetchMnemonics = async () => {
    try {
      const { data, error } = await supabase
        .from("mnemonics")
        .select("*")
        .eq("user_id", user?.id)
        .eq("odu_id", odu.id)
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMnemonics(data || []);
    } catch (error) {
      console.error("Error fetching mnemonics:", error);
      toast.error("Erro ao carregar mnemônicos");
    } finally {
      setLoading(false);
    }
  };

  const generateAIMnemonics = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mnemonics", {
        body: {
          oduNome: odu.nome,
          oduNumero: odu.numero,
          significado: odu.significado,
          verso: odu.verso
        }
      });

      if (error) throw error;

      const { mnemonics: aiMnemonics } = data;

      // Insert all generated mnemonics
      const mnemonicsToInsert = [
        { tipo: "acronimo", conteudo: aiMnemonics.acronimo },
        { tipo: "frase", conteudo: aiMnemonics.frase },
        { tipo: "rima", conteudo: aiMnemonics.rima },
        { tipo: "associacao", conteudo: aiMnemonics.associacao },
        { tipo: "imagem", conteudo: aiMnemonics.imagem }
      ].map(m => ({
        user_id: user?.id,
        odu_id: odu.id,
        tipo: m.tipo,
        conteudo: m.conteudo,
        is_ai_generated: true
      }));

      const { error: insertError } = await supabase
        .from("mnemonics")
        .insert(mnemonicsToInsert);

      if (insertError) throw insertError;

      toast.success("Mnemônicos gerados com sucesso!");
      fetchMnemonics();
    } catch (error: any) {
      console.error("Error generating mnemonics:", error);
      toast.error(error.message || "Erro ao gerar mnemônicos");
    } finally {
      setGenerating(false);
    }
  };

  const addMnemonic = async () => {
    if (!newMnemonic.conteudo.trim()) {
      toast.error("Digite o conteúdo do mnemônico");
      return;
    }

    try {
      const { error } = await supabase.from("mnemonics").insert({
        user_id: user?.id,
        odu_id: odu.id,
        tipo: newMnemonic.tipo,
        conteudo: newMnemonic.conteudo.trim(),
        is_ai_generated: false
      });

      if (error) throw error;

      toast.success("Mnemônico adicionado!");
      setNewMnemonic({ tipo: "frase", conteudo: "" });
      fetchMnemonics();
    } catch (error) {
      console.error("Error adding mnemonic:", error);
      toast.error("Erro ao adicionar mnemônico");
    }
  };

  const toggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from("mnemonics")
        .update({ is_favorite: !currentFavorite })
        .eq("id", id);

      if (error) throw error;
      fetchMnemonics();
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Erro ao atualizar favorito");
    }
  };

  const deleteMnemonic = async (id: string) => {
    try {
      const { error } = await supabase.from("mnemonics").delete().eq("id", id);
      if (error) throw error;
      toast.success("Mnemônico removido");
      fetchMnemonics();
    } catch (error) {
      console.error("Error deleting mnemonic:", error);
      toast.error("Erro ao remover mnemônico");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Mnemônicos
          </CardTitle>
          <Button
            onClick={generateAIMnemonics}
            disabled={generating}
            variant="outline"
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar com IA
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new mnemonic */}
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <div className="flex gap-2">
            <Select value={newMnemonic.tipo} onValueChange={(value) => setNewMnemonic({ ...newMnemonic, tipo: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tipoLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addMnemonic} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            placeholder="Digite seu mnemônico..."
            value={newMnemonic.conteudo}
            onChange={(e) => setNewMnemonic({ ...newMnemonic, conteudo: e.target.value })}
            rows={2}
          />
        </div>

        {/* List mnemonics */}
        {mnemonics.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum mnemônico ainda. Crie um ou gere com IA!
          </p>
        ) : (
          <div className="space-y-3">
            {mnemonics.map((mnemonic) => (
              <div key={mnemonic.id} className="p-4 bg-background border rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={tipoColors[mnemonic.tipo]}>
                        {tipoLabels[mnemonic.tipo]}
                      </Badge>
                      {mnemonic.is_ai_generated && (
                        <Badge variant="outline">
                          <Sparkles className="h-3 w-3 mr-1" />
                          IA
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{mnemonic.conteudo}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleFavorite(mnemonic.id, mnemonic.is_favorite)}
                    >
                      {mnemonic.is_favorite ? (
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMnemonic(mnemonic.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
