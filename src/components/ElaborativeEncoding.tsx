import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Lightbulb, Save, Trash2, Loader2, Network } from "lucide-react";

interface ElaborativeNote {
  id: string;
  pergunta_tipo: string;
  resposta: string;
  created_at: string;
}

interface Odu {
  id: string;
  nome: string;
  numero: number;
}

interface ElaborativeEncodingProps {
  odu: Odu;
}

const perguntasElaborativas = {
  conexao_pessoal: {
    label: "Conexão Pessoal",
    pergunta: "Como este Odu se relaciona com sua vida pessoal? Que experiências você teve que se conectam com seus ensinamentos?",
    color: "bg-blue-500"
  },
  relacao_outros_odus: {
    label: "Relação com Outros Odus",
    pergunta: "Como este Odu se relaciona ou contrasta com outros Odus que você já estudou? Quais semelhanças e diferenças você nota?",
    color: "bg-purple-500"
  },
  aplicacao_pratica: {
    label: "Aplicação Prática",
    pergunta: "Como você poderia aplicar os ensinamentos deste Odu em situações cotidianas? Dê exemplos concretos.",
    color: "bg-green-500"
  },
  emocao_sentimento: {
    label: "Emoção e Sentimento",
    pergunta: "Que emoções ou sentimentos este Odu evoca em você? Por quê?",
    color: "bg-pink-500"
  },
  analogia: {
    label: "Analogia",
    pergunta: "A que você poderia comparar este Odu? Crie uma analogia ou metáfora que ajude a entendê-lo melhor.",
    color: "bg-orange-500"
  },
  ensinar_outros: {
    label: "Ensinar a Outros",
    pergunta: "Como você explicaria este Odu para alguém que nunca ouviu falar dele? Use suas próprias palavras.",
    color: "bg-cyan-500"
  }
};

export const ElaborativeEncoding = ({ odu }: ElaborativeEncodingProps) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ElaborativeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (user && odu.id) {
      fetchNotes();
    }
  }, [user, odu.id]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("elaborative_notes")
        .select("*")
        .eq("user_id", user?.id)
        .eq("odu_id", odu.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setNotes(data || []);
      
      // Initialize editing state
      const initialEditing: { [key: string]: string } = {};
      (data || []).forEach(note => {
        initialEditing[note.pergunta_tipo] = note.resposta;
      });
      setEditingNote(initialEditing);
    } catch (error) {
      console.error("Error fetching elaborative notes:", error);
      toast.error("Erro ao carregar elaborações");
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async (perguntaTipo: string) => {
    const resposta = editingNote[perguntaTipo]?.trim();
    if (!resposta) {
      toast.error("Digite uma resposta antes de salvar");
      return;
    }

    setSaving({ ...saving, [perguntaTipo]: true });
    try {
      const existingNote = notes.find(n => n.pergunta_tipo === perguntaTipo);

      if (existingNote) {
        // Update existing note
        const { error } = await supabase
          .from("elaborative_notes")
          .update({ resposta })
          .eq("id", existingNote.id);

        if (error) throw error;
      } else {
        // Insert new note
        const { error } = await supabase
          .from("elaborative_notes")
          .insert({
            user_id: user?.id,
            odu_id: odu.id,
            pergunta_tipo: perguntaTipo,
            resposta
          });

        if (error) throw error;
      }

      toast.success("Elaboração salva!");
      fetchNotes();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Erro ao salvar elaboração");
    } finally {
      setSaving({ ...saving, [perguntaTipo]: false });
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from("elaborative_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Elaboração removida");
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Erro ao remover elaboração");
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

  const completedCount = notes.length;
  const totalQuestions = Object.keys(perguntasElaborativas).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Codificação Elaborativa
            </CardTitle>
            <CardDescription>
              Processe profundamente conectando este Odu a seus conhecimentos e experiências
            </CardDescription>
          </div>
          <Badge variant="outline">
            {completedCount}/{totalQuestions} respondidas
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Por que a Codificação Elaborativa funciona?</p>
              <p className="text-muted-foreground">
                Quanto mais você conecta novas informações com o que já sabe, mais forte fica a memória.
                Responder essas perguntas força seu cérebro a processar o Odu de múltiplas formas,
                criando uma rede rica de conexões neurais.
              </p>
            </div>
          </div>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {Object.entries(perguntasElaborativas).map(([tipo, config]) => {
            const hasNote = notes.some(n => n.pergunta_tipo === tipo);
            const isSaving = saving[tipo];
            
            return (
              <AccordionItem key={tipo} value={tipo} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2 flex-1">
                    <Badge className={config.color}>
                      {config.label}
                    </Badge>
                    {hasNote && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300">
                        ✓ Respondida
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-4">
                  <p className="text-sm text-muted-foreground italic">
                    {config.pergunta}
                  </p>
                  <Textarea
                    placeholder="Escreva sua reflexão aqui..."
                    value={editingNote[tipo] || ""}
                    onChange={(e) => setEditingNote({ ...editingNote, [tipo]: e.target.value })}
                    rows={5}
                    className="resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveNote(tipo)}
                      disabled={isSaving || !editingNote[tipo]?.trim()}
                      size="sm"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar
                        </>
                      )}
                    </Button>
                    {hasNote && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const note = notes.find(n => n.pergunta_tipo === tipo);
                          if (note) deleteNote(note.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};
