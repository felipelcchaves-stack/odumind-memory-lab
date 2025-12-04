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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Home, MapPin, Plus, Loader2, ArrowLeft, Lightbulb, GraduationCap, Briefcase, Lock } from "lucide-react";
import { ProtectedContent } from "@/components/ProtectedContent";
import { getAllTemplates, getTemplateById, type PalaceTemplate } from "@/lib/memoryPalaceTemplates";
import DashboardHeader from "@/components/DashboardHeader";
import { useTechniqueUnlock } from "@/hooks/useTechniqueUnlock";

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
  const { loading: unlockLoading, isTechniqueUnlocked, getTechniqueProgress } = useTechniqueUnlock();
  
  const [loading, setLoading] = useState(true);
  const [palaceData, setPalaceData] = useState<PalacePosition[]>([]);
  const [allOdus, setAllOdus] = useState<Odu[]>([]);
  const [selectedSala, setSelectedSala] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<{ sala: number; posicao: number } | null>(null);
  const [formData, setFormData] = useState({ odu_id: "", nota_visual: "" });
  const [selectedTemplate, setSelectedTemplate] = useState<string>("casa");
  
  const templates = getAllTemplates();
  const currentTemplate = getTemplateById(selectedTemplate);
  const isUnlocked = isTechniqueUnlocked('memory-palace');
  const progress = getTechniqueProgress('memory-palace');

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchData();
    
    // Carregar template salvo do localStorage
    const savedTemplate = localStorage.getItem("memoryPalaceTemplate");
    if (savedTemplate) {
      setSelectedTemplate(savedTemplate);
    }
  }, [user, navigate]);
  
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    localStorage.setItem("memoryPalaceTemplate", templateId);
    toast.success("Template alterado!");
  };

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

  const getSalaName = (sala: number): string => {
    if (!currentTemplate) return `Sala ${sala}`;
    const salaConfig = currentTemplate.salas[sala];
    return salaConfig ? salaConfig.nome : `Sala ${sala}`;
  };

  const getPositionName = (sala: number, posicao: number): string => {
    if (!currentTemplate) return `Posição ${posicao}`;
    const salaConfig = currentTemplate.salas[sala];
    if (!salaConfig) return `Posição ${posicao}`;
    const posConfig = salaConfig.posicoes[posicao];
    return posConfig ? posConfig.nome : `Posição ${posicao}`;
  };

  const getPositionHint = (sala: number, posicao: number): string => {
    if (!currentTemplate) return "";
    const salaConfig = currentTemplate.salas[sala];
    if (!salaConfig) return "";
    const posConfig = salaConfig.posicoes[posicao];
    return posConfig ? posConfig.dica : "";
  };

  const usedOduIds = palaceData.map(p => p.odu_id);
  const availableOdus = allOdus.filter(odu => !usedOduIds.includes(odu.id));

  // Loading state
  if (loading || unlockLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Locked state - technique not unlocked
  if (!isUnlocked) {
    return (
      <ProtectedContent>
        <div className="min-h-screen bg-background">
          <DashboardHeader />
          <div className="flex flex-col items-center justify-center h-[70vh] p-4">
            <Card className="max-w-md w-full text-center p-8">
              <div className="bg-muted rounded-full p-6 w-fit mx-auto mb-6">
                <Lock className="h-12 w-12 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Técnica Bloqueada</h1>
              <p className="text-muted-foreground mb-6">
                O Palácio da Memória é uma técnica avançada. Continue estudando para desbloqueá-la!
              </p>
              
              {progress && (
                <div className="space-y-3 mb-6">
                  <Progress value={progress.progress} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {progress.requirementLabel}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button onClick={() => navigate('/study')} className="w-full">
                  Continuar Estudando
                </Button>
                <Button variant="outline" onClick={() => navigate('/tecnicas')} className="w-full">
                  Ver Todas as Técnicas
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </ProtectedContent>
    );
  }

  return (
    <ProtectedContent>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="p-4 md:p-8">
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

        {/* Template Selector */}
        <Card>
          <CardContent className="pt-6">
            <Label className="text-lg font-semibold mb-4 block">Escolha seu Template de Palácio</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map(template => {
                const iconMap: Record<string, typeof Home> = {
                  Home: Home,
                  MapPin: MapPin,
                  GraduationCap: GraduationCap,
                  Briefcase: Briefcase
                };
                const Icon = iconMap[template.icon] || Home;
                return (
                  <Card
                    key={template.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate === template.id ? "border-primary border-2 bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => handleTemplateChange(template.id)}
                  >
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{template.nome}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.descricao}</p>
                      {selectedTemplate === template.id && (
                        <Badge className="w-full justify-center">Selecionado</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

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
                      {getSalaName(num)}
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
                      {getPositionName(selectedSala, posicao)}
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-center h-12 text-muted-foreground">
                        <Plus className="h-8 w-8" />
                      </div>
                      {getPositionHint(selectedSala, posicao) && (
                        <div className="flex items-start gap-1 p-2 bg-muted/50 rounded text-xs">
                          <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-500" />
                          <span className="text-muted-foreground">{getPositionHint(selectedSala, posicao)}</span>
                        </div>
                      )}
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
                Adicionar Odu - {getSalaName(selectedPosition?.sala || 1)}
              </DialogTitle>
              <p className="text-sm text-muted-foreground pt-2">
                <strong>{getPositionName(selectedPosition?.sala || 1, selectedPosition?.posicao || 1)}</strong>
                {getPositionHint(selectedPosition?.sala || 1, selectedPosition?.posicao || 1) && (
                  <span className="flex items-center gap-1 mt-1 text-amber-600">
                    <Lightbulb className="h-3 w-3" />
                    {getPositionHint(selectedPosition?.sala || 1, selectedPosition?.posicao || 1)}
                  </span>
                )}
              </p>
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
      </div>
    </ProtectedContent>
  );
}
