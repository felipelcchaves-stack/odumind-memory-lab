import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Home, MapPin, Plus, Loader2, ArrowLeft } from "lucide-react";
import { ProtectedContent } from "@/components/ProtectedContent";

interface PalacePosition {
  id: string;
  sala: number;
  posicao: number;
  nota_visual: string | null;
  odu_id: string;
  odu?: {
    nome: string;
    numero: number;
  };
}

interface Odu {
  id: string;
  nome: string;
  numero: number;
}

export default function MemoryPalace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [palaceData, setPalaceData] = useState<PalacePosition[]>([]);
  const [allOdus, setAllOdus] = useState<Odu[]>([]);
  const [selectedSala, setSelectedSala] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<{ sala: number; posicao: number } | null>(null);
  const [formData, setFormData] = useState({ odu_id: "", nota_visual: "" });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      // Fetch palace data
      const { data: palaceData, error: palaceError } = await supabase
        .from("memory_palace")
        .select(`
          id,
          sala,
          posicao,
          nota_visual,
          odu_id,
          odu:odu_id (nome, numero)
        `)
        .eq("user_id", user?.id);

      if (palaceError) throw palaceError;

      // Fetch all odus
      const { data: odusData, error: odusError } = await supabase
        .from("odu")
        .select("id, nome, numero")
        .order("numero");

      if (odusError) throw odusError;

      setPalaceData(palaceData || []);
      setAllOdus(odusData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = (sala: number, posicao: number) => {
    setSelectedPosition({ sala, posicao });
    setFormData({ odu_id: "", nota_visual: "" });
    setDialogOpen(true);
  };

  const handleAddOdu = async () => {
    if (!formData.odu_id || !selectedPosition) {
      toast.error("Selecione um Odu");
      return;
    }

    try {
      const { error } = await supabase.from("memory_palace").insert({
        user_id: user?.id,
        odu_id: formData.odu_id,
        sala: selectedPosition.sala,
        posicao: selectedPosition.posicao,
        nota_visual: formData.nota_visual.trim() || null
      });

      if (error) throw error;

      toast.success("Odu adicionado ao Palácio!");
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error adding odu:", error);
      if (error.code === "23505") {
        toast.error("Este Odu já está posicionado no palácio");
      } else {
        toast.error("Erro ao adicionar Odu");
      }
    }
  };

  const handleRemoveOdu = async (id: string) => {
    try {
      const { error } = await supabase.from("memory_palace").delete().eq("id", id);
      if (error) throw error;
      toast.success("Odu removido do Palácio");
      fetchData();
    } catch (error) {
      console.error("Error removing odu:", error);
      toast.error("Erro ao remover Odu");
    }
  };

  const getPositionData = (sala: number, posicao: number): PalacePosition | undefined => {
    return palaceData.find(p => p.sala === sala && p.posicao === posicao);
  };

  const usedOduIds = palaceData.map(p => p.odu_id);
  const availableOdus = allOdus.filter(odu => !usedOduIds.includes(odu.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedContent>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Home className="h-8 w-8" />
                Palácio da Memória
              </h1>
              <p className="text-muted-foreground">
                Associe cada Odu a um lugar específico no seu palácio mental
              </p>
            </div>
          </div>
        </div>

        {/* Room selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="font-medium">Sala:</label>
              <Select value={String(selectedSala)} onValueChange={(v) => setSelectedSala(Number(v))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={String(num)}>
                      Sala {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline">
                {palaceData.filter(p => p.sala === selectedSala).length} / 16 posições preenchidas
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Palace grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 16 }, (_, i) => i + 1).map(posicao => {
            const posData = getPositionData(selectedSala, posicao);
            return (
              <Card
                key={posicao}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  posData ? "bg-primary/5 border-primary" : "hover:border-primary/50"
                }`}
                onClick={() => !posData && openAddDialog(selectedSala, posicao)}
              >
                <CardContent className="pt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      <MapPin className="h-3 w-3 mr-1" />
                      Posição {posicao}
                    </Badge>
                    {posData && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveOdu(posData.id);
                        }}
                      >
                        <Plus className="h-4 w-4 rotate-45" />
                      </Button>
                    )}
                  </div>
                  {posData ? (
                    <div className="space-y-1">
                      <p className="font-bold">{posData.odu?.nome}</p>
                      <p className="text-sm text-muted-foreground">Odu {posData.odu?.numero}</p>
                      {posData.nota_visual && (
                        <p className="text-xs text-muted-foreground italic">
                          "{posData.nota_visual}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-20 text-muted-foreground">
                      <Plus className="h-8 w-8" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Add dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Adicionar Odu - Sala {selectedPosition?.sala}, Posição {selectedPosition?.posicao}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Selecione o Odu</label>
                <Select value={formData.odu_id} onValueChange={(v) => setFormData({ ...formData, odu_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um Odu..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOdus.map(odu => (
                      <SelectItem key={odu.id} value={odu.id}>
                        {odu.numero}. {odu.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Nota Visual (opcional)</label>
                <Textarea
                  placeholder="Descreva a imagem mental que associa a este lugar..."
                  value={formData.nota_visual}
                  onChange={(e) => setFormData({ ...formData, nota_visual: e.target.value })}
                  rows={3}
                />
              </div>
              <Button onClick={handleAddOdu} className="w-full">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </ProtectedContent>
  );
}
